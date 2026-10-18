import { describe, expect, it, vi } from 'vitest';
import { QUIZ_RESULT } from '../types/quiz';
import {
  convertResultToNumeric,
  getDb,
  GLYPH_INDEX,
  resetDbForTesting,
  STORE_NAME,
} from './get-db';

const V1_VERSION = 1;
const V2_VERSION = 2;
const DB_VERSION = 3;
const TEST_TIMESTAMP = 12_345;
const TEST_LEGACY_ID = 1;
const TEST_COLLISION_ID = 2;

describe('convertResultToNumeric', () => {
  it('converts string and numeric results to correct integer constants', () => {
    expect(convertResultToNumeric('correct')).toBe(QUIZ_RESULT.CORRECT);
    expect(convertResultToNumeric(QUIZ_RESULT.CORRECT)).toBe(QUIZ_RESULT.CORRECT);
    expect(convertResultToNumeric('wrong')).toBe(QUIZ_RESULT.WRONG);
    expect(convertResultToNumeric(QUIZ_RESULT.WRONG)).toBe(QUIZ_RESULT.WRONG);
    expect(convertResultToNumeric('skipped')).toBe(QUIZ_RESULT.SKIPPED);
    expect(convertResultToNumeric('unknown')).toBe(QUIZ_RESULT.SKIPPED);
  });
});

describe('getDb', () => {
  it('opens kana_db and creates object store with indexes on fresh upgrade', async () => {
    const db = await getDb();
    expect(db.name).toBe('kana_db');
    expect(db.version).toBe(DB_VERSION);
    expect(db.objectStoreNames.contains(STORE_NAME)).toBe(true);

    const tx = db.transaction([STORE_NAME], 'readonly');
    const store = tx.objectStore(STORE_NAME);
    expect(store.keyPath).toBe('timestamp');
  });

  it('resolves successfully on subsequent calls returning cached promise', async () => {
    const db1 = await getDb();
    const db2 = await getDb();
    expect(db1).toBe(db2);
  });

  it('migrates existing records from legacy v1 store with keyPath id to keyPath timestamp and numeric results', async () => {
    const v1Req = indexedDB.open('kana_db', V1_VERSION);
    v1Req.onupgradeneeded = () => {
      const db = v1Req.result;
      const store = db.createObjectStore(STORE_NAME, {
        keyPath: 'id',
        autoIncrement: true,
      });
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
    expect(db.version).toBe(DB_VERSION);

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
      result: QUIZ_RESULT.CORRECT,
    });
    expect(record['id']).toBeUndefined();
  });

  it('migrates existing records from v2 store to v3 converting string results to numeric', async () => {
    const v2Req = indexedDB.open('kana_db', V2_VERSION);
    v2Req.onupgradeneeded = () => {
      const db = v2Req.result;
      const store = db.createObjectStore(STORE_NAME, {
        keyPath: 'timestamp',
      });
      store.createIndex(GLYPH_INDEX, 'glyph');
      store.add({
        glyph: 'い',
        timestamp: TEST_TIMESTAMP,
        result: 'wrong',
      });
    };
    await new Promise<void>((resolve) => {
      v2Req.onsuccess = () => resolve();
    });

    const db = await getDb();
    expect(db.version).toBe(DB_VERSION);

    const tx = db.transaction([STORE_NAME], 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const getReq = store.get(TEST_TIMESTAMP);
    const record = await new Promise<Record<string, unknown>>((resolve) => {
      getReq.onsuccess = () => resolve(getReq.result as Record<string, unknown>);
    });

    expect(record).toEqual({
      glyph: 'い',
      timestamp: TEST_TIMESTAMP,
      result: QUIZ_RESULT.WRONG,
    });
  });

  it('deduplicates legacy records with collision during migration', async () => {
    const v1Req = indexedDB.open('kana_db', V1_VERSION);
    v1Req.onupgradeneeded = () => {
      const db = v1Req.result;
      const store = db.createObjectStore(STORE_NAME, {
        keyPath: 'id',
        autoIncrement: true,
      });
      store.add({
        id: TEST_LEGACY_ID,
        glyph: 'あ',
        timestamp: TEST_TIMESTAMP,
        result: 'wrong',
      });
      store.add({
        id: TEST_COLLISION_ID,
        glyph: 'あ',
        timestamp: TEST_TIMESTAMP,
        result: 'correct',
      });
    };
    await new Promise<void>((resolve) => {
      v1Req.onsuccess = () => resolve();
    });

    const db = await getDb();
    const tx = db.transaction([STORE_NAME], 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const getReq = store.get(TEST_TIMESTAMP);
    const record = await new Promise<Record<string, unknown>>((resolve) => {
      getReq.onsuccess = () => resolve(getReq.result as Record<string, unknown>);
    });

    expect(record).toEqual({
      glyph: 'あ',
      timestamp: TEST_TIMESTAMP,
      result: QUIZ_RESULT.CORRECT,
    });
  });

  it('migrates legacy database when store does not exist in legacy version', async () => {
    const v1Req = indexedDB.open('kana_db', V1_VERSION);
    await new Promise<void>((resolve) => {
      v1Req.onsuccess = () => resolve();
    });

    const db = await getDb();
    expect(db.objectStoreNames.contains(STORE_NAME)).toBe(true);
  });

  it('calls navigator.storage.persist and handles rejection gracefully', async () => {
    const originalStorage = navigator.storage;
    const persistMock = vi.fn().mockRejectedValueOnce(new Error('Persist failed'));
    Object.defineProperty(navigator, 'storage', {
      configurable: true,
      value: { persist: persistMock },
    });

    const db = await getDb();
    expect(db.version).toBe(DB_VERSION);
    expect(persistMock).toHaveBeenCalled();

    Object.defineProperty(navigator, 'storage', {
      configurable: true,
      value: originalStorage,
    });
  });

  it('uses fallback version check when indexedDB.databases is not defined (fresh DB abortion)', async () => {
    const originalDatabases = indexedDB.databases;
    Object.defineProperty(indexedDB, 'databases', {
      configurable: true,
      value: undefined,
    });

    const db = await getDb();
    expect(db.version).toBe(DB_VERSION);

    Object.defineProperty(indexedDB, 'databases', {
      configurable: true,
      value: originalDatabases,
    });
  });

  it('uses fallback version check when indexedDB.databases is not defined (existing DB)', async () => {
    const originalDatabases = indexedDB.databases;
    const v1Req = indexedDB.open('kana_db', V1_VERSION);
    v1Req.onupgradeneeded = () => {
      const db = v1Req.result;
      db.createObjectStore(STORE_NAME, { keyPath: 'id' });
    };
    await new Promise<void>((resolve) => {
      v1Req.onsuccess = () => resolve();
    });

    Object.defineProperty(indexedDB, 'databases', {
      configurable: true,
      value: undefined,
    });

    const db = await getDb();
    expect(db.version).toBe(DB_VERSION);

    Object.defineProperty(indexedDB, 'databases', {
      configurable: true,
      value: originalDatabases,
    });
  });

  it('rejects on fallback version check with DOMException', async () => {
    const originalDatabases = indexedDB.databases;
    Object.defineProperty(indexedDB, 'databases', {
      configurable: true,
      value: undefined,
    });

    const testError = new DOMException('Version check failed', 'AbortError');
    const originalOpen = indexedDB.open;

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

    await expect(getDb()).rejects.toThrow('Version check failed');

    indexedDB.open = originalOpen;
    Object.defineProperty(indexedDB, 'databases', {
      configurable: true,
      value: originalDatabases,
    });
  });

  it('rejects on fallback version check without DOMException', async () => {
    const originalDatabases = indexedDB.databases;
    Object.defineProperty(indexedDB, 'databases', {
      configurable: true,
      value: undefined,
    });

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

    await expect(getDb()).rejects.toThrow('Database version check failed');

    indexedDB.open = originalOpen;
    Object.defineProperty(indexedDB, 'databases', {
      configurable: true,
      value: originalDatabases,
    });
  });

  it('rejects when readLegacyRecords encounters an error on open with DOMException', async () => {
    const v1Req = indexedDB.open('kana_db', V1_VERSION);
    await new Promise<void>((resolve) => {
      v1Req.onsuccess = () => resolve();
    });

    const testError = new DOMException('V1 open failed', 'AbortError');
    const originalOpen = indexedDB.open;

    vi.spyOn(indexedDB, 'open').mockImplementation((_name: string, version?: number) => {
      if (version === V1_VERSION) {
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
      }
      return originalOpen.call(indexedDB, _name, version);
    });

    await expect(getDb()).rejects.toThrow('V1 open failed');
    indexedDB.open = originalOpen;
  });

  it('rejects when readLegacyRecords encounters an error on open without DOMException', async () => {
    const v1Req = indexedDB.open('kana_db', V1_VERSION);
    await new Promise<void>((resolve) => {
      v1Req.onsuccess = () => resolve();
    });

    const originalOpen = indexedDB.open;

    vi.spyOn(indexedDB, 'open').mockImplementation((_name: string, version?: number) => {
      if (version === V1_VERSION) {
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
      }
      return originalOpen.call(indexedDB, _name, version);
    });

    await expect(getDb()).rejects.toThrow('Failed to open v1 database');
    indexedDB.open = originalOpen;
  });

  it('rejects when readLegacyRecords encounters an error on getAll with DOMException', async () => {
    const v1Req = indexedDB.open('kana_db', V1_VERSION);
    v1Req.onupgradeneeded = () => {
      const db = v1Req.result;
      db.createObjectStore(STORE_NAME, { keyPath: 'id' });
    };
    await new Promise<void>((resolve) => {
      v1Req.onsuccess = () => resolve();
    });

    const testError = new DOMException('getAll failed', 'AbortError');
    const originalOpen = indexedDB.open;

    vi.spyOn(indexedDB, 'open').mockImplementation((_name: string, version?: number) => {
      if (version === V1_VERSION) {
        const fakeStore = {
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
          version: V1_VERSION,
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
      }
      return originalOpen.call(indexedDB, _name, version);
    });

    await expect(getDb()).rejects.toThrow('getAll failed');
    indexedDB.open = originalOpen;
  });

  it('rejects when readLegacyRecords encounters an error on getAll without DOMException', async () => {
    const v1Req = indexedDB.open('kana_db', V1_VERSION);
    v1Req.onupgradeneeded = () => {
      const db = v1Req.result;
      db.createObjectStore(STORE_NAME, { keyPath: 'id' });
    };
    await new Promise<void>((resolve) => {
      v1Req.onsuccess = () => resolve();
    });

    const originalOpen = indexedDB.open;

    vi.spyOn(indexedDB, 'open').mockImplementation((_name: string, version?: number) => {
      if (version === V1_VERSION) {
        const fakeStore = {
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
          version: V1_VERSION,
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
      }
      return originalOpen.call(indexedDB, _name, version);
    });

    await expect(getDb()).rejects.toThrow('Failed to read legacy records');
    indexedDB.open = originalOpen;
  });

  it('rejects when openDatabase encounters an error on open with DOMException', async () => {
    const testError = new DOMException('DB open failed', 'AbortError');
    const originalOpen = indexedDB.open;

    vi.spyOn(indexedDB, 'open').mockImplementation((_name: string, version?: number) => {
      if (version === DB_VERSION) {
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
      }
      return originalOpen.call(indexedDB, _name, version);
    });

    await expect(getDb()).rejects.toThrow('DB open failed');
    indexedDB.open = originalOpen;
  });

  it('rejects when openDatabase encounters an error on open without DOMException', async () => {
    const originalOpen = indexedDB.open;

    vi.spyOn(indexedDB, 'open').mockImplementation((_name: string, version?: number) => {
      if (version === DB_VERSION) {
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
      }
      return originalOpen.call(indexedDB, _name, version);
    });

    await expect(getDb()).rejects.toThrow('Database open failed');
    indexedDB.open = originalOpen;
  });

  it('allows retry after failure when resetDbForTesting is called', async () => {
    const testError = new DOMException('Temporary failure', 'AbortError');
    const originalOpen = indexedDB.open;

    vi.spyOn(indexedDB, 'open').mockImplementationOnce(() => {
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

    await expect(getDb()).rejects.toThrow('Temporary failure');
    indexedDB.open = originalOpen;

    resetDbForTesting();
    const db = await getDb();
    expect(db.version).toBe(DB_VERSION);
  });

  it('exports correct constants', () => {
    expect(STORE_NAME).toBe('quiz_events');
    expect(GLYPH_INDEX).toBe('by_glyph');
  });
});
