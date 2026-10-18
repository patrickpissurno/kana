import type { QuizEvent, QuizResult } from '../types/quiz';
import { QUIZ_RESULT } from '../types/quiz';
import { resolveEventCollision } from './resolve-event-collision';

const DB_NAME = 'kana_db';
const DB_VERSION = 3;
export const STORE_NAME = 'quiz_events';
export const GLYPH_INDEX = 'by_glyph';

let dbPromise: Promise<IDBDatabase> | null = null;

export function convertResultToNumeric(result: unknown): QuizResult {
  if (result === 'correct' || result === QUIZ_RESULT.CORRECT) {
    return QUIZ_RESULT.CORRECT;
  }
  if (result === 'wrong' || result === QUIZ_RESULT.WRONG) {
    return QUIZ_RESULT.WRONG;
  }
  return QUIZ_RESULT.SKIPPED;
}

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

async function readLegacyRecords(version: number): Promise<QuizEvent[]> {
  return new Promise<QuizEvent[]>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, version);

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
        const rawRecords = getAllRequest.result as (QuizEvent & {
          id?: number;
        })[];
        db.close();

        const collisionMap = new Map<number, QuizEvent>();
        for (const raw of rawRecords) {
          const { id: _id, ...clean } = raw;
          const normalized: QuizEvent = {
            ...clean,
            result: convertResultToNumeric(clean.result),
          };
          const existing = collisionMap.get(normalized.timestamp);
          if (existing) {
            collisionMap.set(normalized.timestamp, resolveEventCollision(existing, normalized));
          } else {
            collisionMap.set(normalized.timestamp, normalized);
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
      reject(request.error ?? new Error(`Failed to open v${version} database`));
    };
  });
}

async function openDatabase(recordsToMigrate?: QuizEvent[]): Promise<IDBDatabase> {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

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

  if (version > 0 && version < DB_VERSION) {
    const legacyRecords = await readLegacyRecords(version);
    return openDatabase(legacyRecords);
  }

  return openDatabase();
}

async function executeGetDb(): Promise<IDBDatabase> {
  try {
    const db = await openAndMigrateDatabase();
    const storageManager = (navigator as unknown as { storage?: StorageManager }).storage;
    if (storageManager?.persist) {
      storageManager.persist().catch(() => undefined);
    }
    return db;
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
