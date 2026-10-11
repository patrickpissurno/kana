const DB_NAME = 'kana_db';
const DB_VERSION = 1;
export const STORE_NAME = 'quiz_events';
export const GLYPH_INDEX = 'by_glyph';
export const TIMESTAMP_INDEX = 'by_timestamp';

export async function getDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      const store = db.createObjectStore(STORE_NAME, {
        keyPath: 'id',
        autoIncrement: true,
      });
      store.createIndex(GLYPH_INDEX, 'glyph');
      store.createIndex(TIMESTAMP_INDEX, 'timestamp');
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error ?? new Error('Database open failed'));
    };
  });
}
