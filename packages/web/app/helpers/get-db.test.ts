import { describe, expect, it, vi } from 'vitest';
import { getDb, GLYPH_INDEX, STORE_NAME, TIMESTAMP_INDEX } from './get-db';

describe('getDb', () => {
  it('opens kana_db and creates object store with indexes on upgrade', async () => {
    const db = await getDb();
    expect(db.name).toBe('kana_db');
    expect(db.objectStoreNames.contains(STORE_NAME)).toBe(true);
  });

  it('resolves successfully on subsequent calls without error', async () => {
    const db = await getDb();
    expect(db.objectStoreNames.contains(STORE_NAME)).toBe(true);
  });

  it('rejects when indexedDB.open encounters an error with DOMException', async () => {
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

  it('rejects when indexedDB.open encounters an error without DOMException', async () => {
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

  it('exports correct index and store constants', () => {
    expect(STORE_NAME).toBe('quiz_events');
    expect(GLYPH_INDEX).toBe('by_glyph');
    expect(TIMESTAMP_INDEX).toBe('by_timestamp');
  });
});
