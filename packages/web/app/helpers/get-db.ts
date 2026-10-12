import type { QuizEvent } from '../types/quiz';
import { resolveEventCollision } from './resolve-event-collision';

const DB_NAME = 'kana_db';
const DB_VERSION = 2;
const V1_VERSION = 1;
export const STORE_NAME = 'quiz_events';
export const GLYPH_INDEX = 'by_glyph';

let dbPromise: Promise<IDBDatabase> | null = null;

async function getExistingDatabaseVersion(): Promise<number> {
  if (typeof indexedDB.databases === 'function') {
    const databases = await indexedDB.databases();
    const existing = databases.find((db) => db.name === DB_NAME);
    return existing?.version ?? 0;
  }

  return new Promise<number>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME);
    let wasUpgrade = false;

    request.onupgradeneeded = () => {
      wasUpgrade = true;
      request.transaction?.abort();
    };

    request.onsuccess = () => {
      const db = request.result;
      const version = db.version;
      db.close();
      resolve(version);
    };

    request.onerror = () => {
      if (wasUpgrade) {
        resolve(0);
      } else {
        reject(request.error ?? new Error('Database version check failed'));
      }
    };
  });
}

async function readV1Records(): Promise<QuizEvent[]> {
  return new Promise<QuizEvent[]>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, V1_VERSION);

    request.onsuccess = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.close();
        resolve([]);
        return;
      }

      const tx = db.transaction([STORE_NAME], 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const getAllRequest = store.getAll();

      getAllRequest.onsuccess = () => {
        const rawRecords = getAllRequest.result as (QuizEvent & { id?: number })[];
        db.close();

        const collisionMap = new Map<number, QuizEvent>();
        for (const raw of rawRecords) {
          const { id: _id, ...clean } = raw;
          const existing = collisionMap.get(clean.timestamp);
          if (existing) {
            collisionMap.set(clean.timestamp, resolveEventCollision(existing, clean));
          } else {
            collisionMap.set(clean.timestamp, clean);
          }
        }
        resolve(Array.from(collisionMap.values()));
      };

      getAllRequest.onerror = () => {
        db.close();
        reject(getAllRequest.error ?? new Error('Failed to read legacy records'));
      };
    };

    request.onerror = () => {
      reject(request.error ?? new Error('Failed to open v1 database'));
    };
  });
}

async function openV2Database(recordsToMigrate?: QuizEvent[]): Promise<IDBDatabase> {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = request.result;
      const oldVersion = event.oldVersion;

      if (oldVersion === V1_VERSION) {
        if (db.objectStoreNames.contains(STORE_NAME)) {
          db.deleteObjectStore(STORE_NAME);
        }
        const store = db.createObjectStore(STORE_NAME, {
          keyPath: 'timestamp',
        });
        store.createIndex(GLYPH_INDEX, 'glyph');

        if (recordsToMigrate) {
          for (const record of recordsToMigrate) {
            store.put(record);
          }
        }
      } else {
        const store = db.createObjectStore(STORE_NAME, {
          keyPath: 'timestamp',
        });
        store.createIndex(GLYPH_INDEX, 'glyph');
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error ?? new Error('Database open failed'));
    };
  });
}

async function openAndMigrateDatabase(): Promise<IDBDatabase> {
  const version = await getExistingDatabaseVersion();

  if (version === V1_VERSION) {
    const legacyRecords = await readV1Records();
    return openV2Database(legacyRecords);
  }

  return openV2Database();
}

async function executeGetDb(): Promise<IDBDatabase> {
  try {
    return await openAndMigrateDatabase();
  } catch (error) {
    dbPromise = null;
    throw error;
  }
}

export async function getDb(): Promise<IDBDatabase> {
  dbPromise ??= executeGetDb();
  return dbPromise;
}

export function resetDbForTesting(): void {
  dbPromise = null;
}
