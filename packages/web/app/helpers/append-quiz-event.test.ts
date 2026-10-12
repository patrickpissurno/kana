import { describe, expect, it, vi } from 'vitest';
import { appendQuizEvent } from './append-quiz-event';

const INITIAL_TIME = 1_700_000_000_000;
const SUBSEQUENT_TIME = 1_700_000_001_000;

describe('appendQuizEvent', () => {
  it('appends an event with skipped result and returns the generated timestamp', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(INITIAL_TIME);
    const timestamp1 = await appendQuizEvent('あ');
    vi.setSystemTime(SUBSEQUENT_TIME);
    const timestamp2 = await appendQuizEvent('い');
    vi.useRealTimers();

    expect(typeof timestamp1).toBe('number');
    expect(typeof timestamp2).toBe('number');
    expect(timestamp1).toBe(INITIAL_TIME);
    expect(timestamp2).toBe(SUBSEQUENT_TIME);
    expect(timestamp2).toBeGreaterThan(timestamp1);
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
