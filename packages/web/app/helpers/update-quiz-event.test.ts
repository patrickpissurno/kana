import { describe, expect, it, vi } from 'vitest';
import { QUIZ_RESULT } from '../types/quiz';
import { appendQuizEvent } from './append-quiz-event';
import { updateQuizEvent } from './update-quiz-event';

const NON_EXISTENT_TIMESTAMP = 999_999_999_999;
const TEST_EVENT_TIMESTAMP = 1_700_000_000_000;

describe('updateQuizEvent', () => {
  it('updates an existing event result successfully', async () => {
    const timestamp = await appendQuizEvent('あ');
    await expect(updateQuizEvent(timestamp, QUIZ_RESULT.CORRECT)).resolves.toBeUndefined();
  });

  it('rejects when the event timestamp is not found', async () => {
    await expect(updateQuizEvent(NON_EXISTENT_TIMESTAMP, QUIZ_RESULT.WRONG)).rejects.toThrow(
      `Quiz event with timestamp ${NON_EXISTENT_TIMESTAMP} not found`
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

    await expect(updateQuizEvent(TEST_EVENT_TIMESTAMP, QUIZ_RESULT.CORRECT)).rejects.toThrow(
      'Get failed'
    );
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

    await expect(updateQuizEvent(TEST_EVENT_TIMESTAMP, QUIZ_RESULT.CORRECT)).rejects.toThrow(
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
            result: {
              glyph: 'あ',
              timestamp: TEST_EVENT_TIMESTAMP,
              result: QUIZ_RESULT.SKIPPED,
            },
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

    await expect(updateQuizEvent(TEST_EVENT_TIMESTAMP, QUIZ_RESULT.WRONG)).rejects.toThrow(
      'Put failed'
    );
    indexedDB.open = originalOpen;
  });

  it('rejects when store.put encounters an error without DOMException', async () => {
    const originalOpen = indexedDB.open;

    vi.spyOn(indexedDB, 'open').mockImplementation(() => {
      const fakeStore = {
        get: () => {
          const req = {
            result: {
              glyph: 'あ',
              timestamp: TEST_EVENT_TIMESTAMP,
              result: QUIZ_RESULT.SKIPPED,
            },
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

    await expect(updateQuizEvent(TEST_EVENT_TIMESTAMP, QUIZ_RESULT.WRONG)).rejects.toThrow(
      'Failed to update quiz event'
    );
    indexedDB.open = originalOpen;
  });
});
