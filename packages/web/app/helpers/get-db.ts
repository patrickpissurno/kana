import type { QuizEvent } from '../types/quiz';

const DB_NAME = 'kana_db';
const DB_VERSION = 2;
export const STORE_NAME = 'quiz_events';
export const GLYPH_INDEX = 'by_glyph';

let pendingRecordsToMigrate: QuizEvent[] | null = null;

async function openDatabase(version: number): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, version);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, {
          keyPath: 'timestamp',
        });
        store.createIndex(GLYPH_INDEX, 'glyph');

        if (pendingRecordsToMigrate) {
          for (const record of pendingRecordsToMigrate) {
            store.put(record);
          }
          pendingRecordsToMigrate = null;
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

async function readAllLegacyRecords(db: IDBDatabase): Promise<QuizEvent[]> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_NAME], 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      const rawRecords = request.result as (QuizEvent & { id?: number })[];
      const cleanRecords = rawRecords.map(({ id: _id, ...event }) => event);
      resolve(cleanRecords);
    };

    request.onerror = () => {
      reject(request.error ?? new Error('Failed to read legacy records'));
    };
  });
}

async function deleteDatabaseAsync(): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME);
    request.onsuccess = () => {
      resolve();
    };
    request.onerror = () => {
      reject(request.error ?? new Error('Failed to delete legacy database'));
    };
  });
}

export async function getDb(): Promise<IDBDatabase> {
  const db = await openDatabase(DB_VERSION);
  const tx = db.transaction([STORE_NAME], 'readonly');
  const store = tx.objectStore(STORE_NAME);

  if (store.keyPath === 'id') {
    const legacyRecords = await readAllLegacyRecords(db);
    db.close();
    await deleteDatabaseAsync();
    pendingRecordsToMigrate = legacyRecords;
    return openDatabase(DB_VERSION);
  }

  return db;
}
