import type { QuizEvent } from '../types/quiz';

const DB_NAME = 'kana_db';
const DB_VERSION = 2;
export const STORE_NAME = 'quiz_events';
export const GLYPH_INDEX = 'by_glyph';

export async function getDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = request.result;
      const oldVersion = event.oldVersion;

      if (oldVersion < 1) {
        const store = db.createObjectStore(STORE_NAME, {
          keyPath: 'timestamp',
        });
        store.createIndex(GLYPH_INDEX, 'glyph');
        return;
      }

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, {
          keyPath: 'timestamp',
        });
        store.createIndex(GLYPH_INDEX, 'glyph');
        return;
      }

      const transaction = request.transaction as IDBTransaction;
      const oldStore = transaction.objectStore(STORE_NAME);
      const getAllRequest = oldStore.getAll();

      getAllRequest.onsuccess = () => {
        const rawRecords = getAllRequest.result as (QuizEvent & { id?: number })[];
        db.deleteObjectStore(STORE_NAME);
        const newStore = db.createObjectStore(STORE_NAME, {
          keyPath: 'timestamp',
        });
        newStore.createIndex(GLYPH_INDEX, 'glyph');

        for (const rawRecord of rawRecords) {
          const { id: _id, ...cleanRecord } = rawRecord;
          newStore.put(cleanRecord);
        }
      };
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error ?? new Error('Database open failed'));
    };
  });
}
