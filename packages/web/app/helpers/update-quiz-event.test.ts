import { describe, expect, it, vi } from 'vitest';
import { appendQuizEvent } from './append-quiz-event';
import { updateQuizEvent } from './update-quiz-event';

const NON_EXISTENT_ID = 999999;
const TEST_EVENT_ID = 1;

describe('updateQuizEvent', () => {
  it('updates an existing event result successfully', async () => {
    const id = await appendQuizEvent('あ');
    await expect(updateQuizEvent(id, 'correct')).resolves.toBeUndefined();
  });

  it('rejects when the event ID is not found', async () => {
    await expect(updateQuizEvent(NON_EXISTENT_ID, 'wrong')).rejects.toThrow(
      `Quiz event with id ${NON_EXISTENT_ID} not found`
    );
  });

  it('rejects when store.get encounters an error with DOMException', async () => {
    const testError = new DOMException('Get failed', 'AbortError');
    const originalOpen = indexedDB.open;

    vi.spyOn(indexedDB, 'open').mockImplementation(() => {
      const fakeStore = {
        get: () => {
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
        put: vi.fn(),
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

    await expect(updateQuizEvent(TEST_EVENT_ID, 'correct')).rejects.toThrow('Get failed');
    indexedDB.open = originalOpen;
  });

  it('rejects when store.get encounters an error without DOMException', async () => {
    const originalOpen = indexedDB.open;

    vi.spyOn(indexedDB, 'open').mockImplementation(() => {
      const fakeStore = {
        get: () => {
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
        put: vi.fn(),
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

    await expect(updateQuizEvent(TEST_EVENT_ID, 'correct')).rejects.toThrow(
      'Failed to find quiz event'
    );
    indexedDB.open = originalOpen;
  });

  it('rejects when store.put encounters an error with DOMException', async () => {
    const testError = new DOMException('Put failed', 'AbortError');
    const originalOpen = indexedDB.open;

    vi.spyOn(indexedDB, 'open').mockImplementation(() => {
      const fakeStore = {
        get: () => {
          const req = {
            result: { id: TEST_EVENT_ID, glyph: 'あ', timestamp: Date.now(), result: 'skipped' },
            error: null,
            onsuccess: null,
            onerror: null,
          } as unknown as IDBRequest;

          queueMicrotask(() => {
            if (req.onsuccess) {
              req.onsuccess(new Event('success'));
            }
          });
          return req;
        },
        put: () => {
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

    await expect(updateQuizEvent(TEST_EVENT_ID, 'wrong')).rejects.toThrow('Put failed');
    indexedDB.open = originalOpen;
  });

  it('rejects when store.put encounters an error without DOMException', async () => {
    const originalOpen = indexedDB.open;

    vi.spyOn(indexedDB, 'open').mockImplementation(() => {
      const fakeStore = {
        get: () => {
          const req = {
            result: { id: TEST_EVENT_ID, glyph: 'あ', timestamp: Date.now(), result: 'skipped' },
            error: null,
            onsuccess: null,
            onerror: null,
          } as unknown as IDBRequest;

          queueMicrotask(() => {
            if (req.onsuccess) {
              req.onsuccess(new Event('success'));
            }
          });
          return req;
        },
        put: () => {
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

    await expect(updateQuizEvent(TEST_EVENT_ID, 'wrong')).rejects.toThrow(
      'Failed to update quiz event'
    );
    indexedDB.open = originalOpen;
  });
});
