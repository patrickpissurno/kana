import { describe, expect, it, vi } from 'vitest';
import { getDb, GLYPH_INDEX, STORE_NAME } from './get-db';

const V1_VERSION = 1;
const V2_VERSION = 2;
const TEST_TIMESTAMP = 12_345;
const TEST_LEGACY_ID = 1;

describe('getDb', () => {
  it('opens kana_db and creates object store with indexes on upgrade', async () => {
    const db = await getDb();
    expect(db.name).toBe('kana_db');
    expect(db.version).toBe(V2_VERSION);
    expect(db.objectStoreNames.contains(STORE_NAME)).toBe(true);

    const tx = db.transaction([STORE_NAME], 'readonly');
    const store = tx.objectStore(STORE_NAME);
    expect(store.keyPath).toBe('timestamp');
  });

  it('resolves successfully on subsequent calls without error', async () => {
    const db = await getDb();
    expect(db.objectStoreNames.contains(STORE_NAME)).toBe(true);
  });

  it('migrates existing records from legacy store with keyPath id to keyPath timestamp', async () => {
    const v1Req = indexedDB.open('kana_db', V1_VERSION);
    v1Req.onupgradeneeded = () => {
      const db = v1Req.result;
      const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      store.add({
        id: TEST_LEGACY_ID,
        glyph: 'あ',
        timestamp: TEST_TIMESTAMP,
        result: 'correct',
      });
    };
    await new Promise<void>((resolve) => {
      v1Req.onsuccess = () => resolve();
    });

    const db = await getDb();
    expect(db.version).toBe(V2_VERSION);

    const tx = db.transaction([STORE_NAME], 'readonly');
    const store = tx.objectStore(STORE_NAME);
    expect(store.keyPath).toBe('timestamp');

    const getReq = store.get(TEST_TIMESTAMP);
    const record = await new Promise<Record<string, unknown>>((resolve) => {
      getReq.onsuccess = () => resolve(getReq.result as Record<string, unknown>);
    });

    expect(record).toEqual({
      glyph: 'あ',
      timestamp: TEST_TIMESTAMP,
      result: 'correct',
    });
    expect(record['id']).toBeUndefined();
  });

  it('rejects when openDatabase encounters an error with DOMException', async () => {
    const originalOpen = indexedDB.open;
    const testError = new DOMException('Failed to open', 'UnknownError');

    vi.spyOn(indexedDB, 'open').mockImplementation(() => {
      const req = {
        result: undefined as unknown as IDBDatabase,
        error: testError,
        onsuccess: null,
        onerror: null,
        onupgradeneeded: null,
      } as unknown as IDBOpenDBRequest;

      queueMicrotask(() => {
        if (req.onerror) {
          req.onerror(new Event('error'));
        }
      });
      return req;
    });

    await expect(getDb()).rejects.toThrow('Failed to open');
    indexedDB.open = originalOpen;
  });

  it('rejects when openDatabase encounters an error without DOMException', async () => {
    const originalOpen = indexedDB.open;

    vi.spyOn(indexedDB, 'open').mockImplementation(() => {
      const req = {
        result: undefined as unknown as IDBDatabase,
        error: null,
        onsuccess: null,
        onerror: null,
        onupgradeneeded: null,
      } as unknown as IDBOpenDBRequest;

      queueMicrotask(() => {
        if (req.onerror) {
          req.onerror(new Event('error'));
        }
      });
      return req;
    });

    await expect(getDb()).rejects.toThrow('Database open failed');
    indexedDB.open = originalOpen;
  });

  it('rejects when readAllLegacyRecords encounters an error with DOMException', async () => {
    const originalOpen = indexedDB.open;
    const testError = new DOMException('Read failed', 'AbortError');

    vi.spyOn(indexedDB, 'open').mockImplementation(() => {
      const fakeStore = {
        keyPath: 'id',
        getAll: () => {
          const req = {
            result: undefined,
            error: testError,
            onsuccess: null,
            onerror: null,
          } as unknown as IDBRequest;

          queueMicrotask(() => {
            if (req.onerror) {
              req.onerror(new Event('error'));
            }
          });
          return req;
        },
      };

      const fakeDb = {
        name: 'kana_db',
        version: V2_VERSION,
        objectStoreNames: {
          contains: (name: string) => name === STORE_NAME,
        },
        transaction: () => ({
          objectStore: () => fakeStore,
        }),
        close: vi.fn(),
      };

      const req = {
        result: fakeDb,
        error: null,
        onsuccess: null,
        onerror: null,
        onupgradeneeded: null,
      } as unknown as IDBOpenDBRequest;

      queueMicrotask(() => {
        if (req.onsuccess) {
          req.onsuccess(new Event('success'));
        }
      });
      return req;
    });

    await expect(getDb()).rejects.toThrow('Read failed');
    indexedDB.open = originalOpen;
  });

  it('rejects when readAllLegacyRecords encounters an error without DOMException', async () => {
    const originalOpen = indexedDB.open;

    vi.spyOn(indexedDB, 'open').mockImplementation(() => {
      const fakeStore = {
        keyPath: 'id',
        getAll: () => {
          const req = {
            result: undefined,
            error: null,
            onsuccess: null,
            onerror: null,
          } as unknown as IDBRequest;

          queueMicrotask(() => {
            if (req.onerror) {
              req.onerror(new Event('error'));
            }
          });
          return req;
        },
      };

      const fakeDb = {
        name: 'kana_db',
        version: V2_VERSION,
        objectStoreNames: {
          contains: (name: string) => name === STORE_NAME,
        },
        transaction: () => ({
          objectStore: () => fakeStore,
        }),
        close: vi.fn(),
      };

      const req = {
        result: fakeDb,
        error: null,
        onsuccess: null,
        onerror: null,
        onupgradeneeded: null,
      } as unknown as IDBOpenDBRequest;

      queueMicrotask(() => {
        if (req.onsuccess) {
          req.onsuccess(new Event('success'));
        }
      });
      return req;
    });

    await expect(getDb()).rejects.toThrow('Failed to read legacy records');
    indexedDB.open = originalOpen;
  });

  it('rejects when deleteDatabaseAsync encounters an error with DOMException', async () => {
    const v1Req = indexedDB.open('kana_db', V1_VERSION);
    v1Req.onupgradeneeded = () => {
      const db = v1Req.result;
      db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
    };
    await new Promise<void>((resolve) => {
      v1Req.onsuccess = () => resolve();
    });

    const originalDelete = indexedDB.deleteDatabase;
    const testError = new DOMException('Delete failed', 'AbortError');

    vi.spyOn(indexedDB, 'deleteDatabase').mockImplementation(() => {
      const req = {
        result: undefined,
        error: testError,
        onsuccess: null,
        onerror: null,
      } as unknown as IDBOpenDBRequest;

      queueMicrotask(() => {
        if (req.onerror) {
          req.onerror(new Event('error'));
        }
      });
      return req;
    });

    await expect(getDb()).rejects.toThrow('Delete failed');
    indexedDB.deleteDatabase = originalDelete;
  });

  it('rejects when deleteDatabaseAsync encounters an error without DOMException', async () => {
    const v1Req = indexedDB.open('kana_db', V1_VERSION);
    v1Req.onupgradeneeded = () => {
      const db = v1Req.result;
      db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
    };
    await new Promise<void>((resolve) => {
      v1Req.onsuccess = () => resolve();
    });

    const originalDelete = indexedDB.deleteDatabase;

    vi.spyOn(indexedDB, 'deleteDatabase').mockImplementation(() => {
      const req = {
        result: undefined,
        error: null,
        onsuccess: null,
        onerror: null,
      } as unknown as IDBOpenDBRequest;

      queueMicrotask(() => {
        if (req.onerror) {
          req.onerror(new Event('error'));
        }
      });
      return req;
    });

    await expect(getDb()).rejects.toThrow('Failed to delete legacy database');
    indexedDB.deleteDatabase = originalDelete;
  });

  it('exports correct index and store constants', () => {
    expect(STORE_NAME).toBe('quiz_events');
    expect(GLYPH_INDEX).toBe('by_glyph');
  });
});
