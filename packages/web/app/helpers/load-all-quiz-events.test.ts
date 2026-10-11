import { describe, expect, it, vi } from 'vitest';
import { appendQuizEvent } from './append-quiz-event';
import { loadAllQuizEvents } from './load-all-quiz-events';

describe('loadAllQuizEvents', () => {
  it('loads all quiz events correctly', async () => {
    const initialEvents = await loadAllQuizEvents();
    expect(Array.isArray(initialEvents)).toBe(true);

    await appendQuizEvent('え');
    const updatedEvents = await loadAllQuizEvents();
    expect(updatedEvents.length).toBeGreaterThan(initialEvents.length);
  });

  it('rejects when store.getAll encounters an error with DOMException', async () => {
    const testError = new DOMException('GetAll failed', 'AbortError');
    const originalOpen = indexedDB.open;

    vi.spyOn(indexedDB, 'open').mockImplementation(() => {
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

    await expect(loadAllQuizEvents()).rejects.toThrow('GetAll failed');
    indexedDB.open = originalOpen;
  });

  it('rejects when store.getAll encounters an error without DOMException', async () => {
    const originalOpen = indexedDB.open;

    vi.spyOn(indexedDB, 'open').mockImplementation(() => {
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

    await expect(loadAllQuizEvents()).rejects.toThrow('Failed to load quiz events');
    indexedDB.open = originalOpen;
  });
});
