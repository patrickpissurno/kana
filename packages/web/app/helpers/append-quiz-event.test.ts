import { describe, expect, it, vi } from 'vitest';
import { appendQuizEvent } from './append-quiz-event';

describe('appendQuizEvent', () => {
  it('appends an event with skipped result and returns the generated ID', async () => {
    const id1 = await appendQuizEvent('あ');
    const id2 = await appendQuizEvent('い');

    expect(typeof id1).toBe('number');
    expect(typeof id2).toBe('number');
    expect(id2).toBeGreaterThan(id1);
  });

  it('rejects when store.add triggers an error with DOMException', async () => {
    const testError = new DOMException('Add failed', 'AbortError');
    const originalOpen = indexedDB.open;

    vi.spyOn(indexedDB, 'open').mockImplementation(() => {
      const fakeStore = {
        add: () => {
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
        transaction: () => ({
          objectStore: () => fakeStore,
        }),
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

    await expect(appendQuizEvent('う')).rejects.toThrow('Add failed');
    indexedDB.open = originalOpen;
  });

  it('rejects when store.add triggers an error without DOMException', async () => {
    const originalOpen = indexedDB.open;

    vi.spyOn(indexedDB, 'open').mockImplementation(() => {
      const fakeStore = {
        add: () => {
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
        transaction: () => ({
          objectStore: () => fakeStore,
        }),
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

    await expect(appendQuizEvent('う')).rejects.toThrow('Failed to append quiz event');
    indexedDB.open = originalOpen;
  });
});
