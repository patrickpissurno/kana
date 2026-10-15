import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { QuizEvent } from '../types/quiz';
import { syncQuizEvents } from '../endpoints/sync/quiz-events';
import { appendQuizEvent } from './append-quiz-event';
import { getDb } from './get-db';
import { loadAllQuizEvents } from './load-all-quiz-events';
import { performQuizEventsSync, SYNC_MISMATCH_ERROR_PREFIX } from './sync-quiz-events';
import {
  getLastSyncedTimestamp,
  LAST_EVENT_SYNCED_TIMESTAMP_KEY,
  setLastSyncedTimestamp,
} from './sync-storage';

vi.mock('../endpoints/sync/quiz-events', () => ({
  syncQuizEvents: vi.fn(),
}));

const mockSyncQuizEvents = vi.mocked(syncQuizEvents);

const TIMESTAMP_1 = 1700000001000;
const TIMESTAMP_2 = 1700000002000;
const TIMESTAMP_3 = 1700000003000;
const EXPECTED_INITIAL_EVENTS_COUNT = 2;
const EXPECTED_UPSERTED_EVENTS_COUNT = 2;
const SERVER_COUNT_MISMATCH = 5;

describe('sync-quiz-events', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('handles empty local events without setting timestamp when maxTimestamp is zero', async () => {
    mockSyncQuizEvents.mockResolvedValueOnce({
      data: {
        missing: [],
        totalItems: 0,
      },
    });

    await performQuizEventsSync();

    expect(mockSyncQuizEvents).toHaveBeenCalledWith({
      items: [],
      totalItems: 0,
    });
    expect(getLastSyncedTimestamp()).toBeNull();
  });

  it('performs clean initial sync and saves max event timestamp', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(TIMESTAMP_1);
    await appendQuizEvent('あ');
    vi.setSystemTime(TIMESTAMP_2);
    await appendQuizEvent('い');
    vi.useRealTimers();

    mockSyncQuizEvents.mockResolvedValueOnce({
      data: {
        missing: [],
        totalItems: EXPECTED_INITIAL_EVENTS_COUNT,
      },
    });

    await performQuizEventsSync();

    expect(mockSyncQuizEvents).toHaveBeenCalledWith({
      items: [
        { glyph: 'あ', timestamp: TIMESTAMP_1, result: 'skipped' },
        { glyph: 'い', timestamp: TIMESTAMP_2, result: 'skipped' },
      ],
      totalItems: EXPECTED_INITIAL_EVENTS_COUNT,
    });

    expect(getLastSyncedTimestamp()).toBe(TIMESTAMP_2);
  });

  it('only queries events after lastSyncedTimestamp on subsequent sync', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(TIMESTAMP_1);
    await appendQuizEvent('あ');
    vi.setSystemTime(TIMESTAMP_2);
    await appendQuizEvent('い');
    vi.useRealTimers();

    setLastSyncedTimestamp(TIMESTAMP_1);

    mockSyncQuizEvents.mockResolvedValueOnce({
      data: {
        missing: [],
        totalItems: EXPECTED_INITIAL_EVENTS_COUNT,
      },
    });

    await performQuizEventsSync();

    expect(mockSyncQuizEvents).toHaveBeenCalledWith({
      items: [{ glyph: 'い', timestamp: TIMESTAMP_2, result: 'skipped' }],
      totalItems: EXPECTED_INITIAL_EVENTS_COUNT,
    });
    expect(getLastSyncedTimestamp()).toBe(TIMESTAMP_2);
  });

  it('upserts missing events and applies collision resolution for existing and new events', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(TIMESTAMP_1);
    // Initial append stores result as 'skipped'
    await appendQuizEvent('あ');
    vi.useRealTimers();

    const missingEvents: QuizEvent[] = [
      { glyph: 'あ', timestamp: TIMESTAMP_1, result: 'correct' },
      { glyph: 'う', timestamp: TIMESTAMP_3, result: 'wrong' },
    ];

    mockSyncQuizEvents.mockResolvedValueOnce({
      data: {
        missing: missingEvents,
        totalItems: EXPECTED_UPSERTED_EVENTS_COUNT,
      },
    });

    await performQuizEventsSync();

    const allEvents = await loadAllQuizEvents();
    expect(allEvents).toHaveLength(EXPECTED_UPSERTED_EVENTS_COUNT);
    expect(allEvents.find((r) => r.timestamp === TIMESTAMP_1)?.result).toBe('correct');
    expect(allEvents.find((r) => r.timestamp === TIMESTAMP_3)?.result).toBe('wrong');
    expect(getLastSyncedTimestamp()).toBe(TIMESTAMP_3);
  });

  it('logs console.error when final local count is less than server total', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    mockSyncQuizEvents.mockResolvedValueOnce({
      data: {
        missing: [],
        totalItems: SERVER_COUNT_MISMATCH,
      },
    });

    await performQuizEventsSync();

    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining(SYNC_MISMATCH_ERROR_PREFIX));
  });

  it('does nothing when response has error without data', async () => {
    mockSyncQuizEvents.mockResolvedValueOnce({
      nonFieldError: 'Server error',
    });

    await performQuizEventsSync();

    expect(localStorage.getItem(LAST_EVENT_SYNCED_TIMESTAMP_KEY)).toBeNull();
  });

  it('handles network rejection silently without throwing', async () => {
    mockSyncQuizEvents.mockRejectedValueOnce(new Error('Network offline'));

    await expect(performQuizEventsSync()).resolves.toBeUndefined();
  });

  it('handles loadAllQuizEvents rejection silently without throwing', async () => {
    const db = await getDb();
    const origTx = db.transaction.bind(db);
    vi.spyOn(db, 'transaction').mockImplementation((names, mode) => {
      if (mode === 'readonly') {
        const fakeStore = {
          getAll: () => {
            const req = {
              result: undefined,
              error: new DOMException('Get failed', 'AbortError'),
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
        return {
          objectStore: () => fakeStore,
        } as unknown as IDBTransaction;
      }
      return origTx(names, mode);
    });

    await expect(performQuizEventsSync()).resolves.toBeUndefined();
  });

  it('handles get error during upsert missing events silently', async () => {
    mockSyncQuizEvents.mockResolvedValueOnce({
      data: {
        missing: [{ glyph: 'あ', timestamp: TIMESTAMP_1, result: 'correct' }],
        totalItems: 1,
      },
    });

    const db = await getDb();
    const origTx = db.transaction.bind(db);
    vi.spyOn(db, 'transaction').mockImplementation((names, mode) => {
      if (mode === 'readwrite') {
        const fakeStore = {
          get: () => {
            const req = {
              result: undefined,
              error: new DOMException('Get failed', 'AbortError'),
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
        return {
          objectStore: () => fakeStore,
        } as unknown as IDBTransaction;
      }
      return origTx(names, mode);
    });

    await expect(performQuizEventsSync()).resolves.toBeUndefined();
  });

  it('handles put error during upsert missing events silently', async () => {
    mockSyncQuizEvents.mockResolvedValueOnce({
      data: {
        missing: [{ glyph: 'あ', timestamp: TIMESTAMP_1, result: 'correct' }],
        totalItems: 1,
      },
    });

    const db = await getDb();
    const origTx = db.transaction.bind(db);
    vi.spyOn(db, 'transaction').mockImplementation((names, mode) => {
      if (mode === 'readwrite') {
        const fakeStore = {
          get: () => {
            const req = {
              result: undefined,
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
              error: new DOMException('Put failed', 'AbortError'),
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
        return {
          objectStore: () => fakeStore,
        } as unknown as IDBTransaction;
      }
      return origTx(names, mode);
    });

    await expect(performQuizEventsSync()).resolves.toBeUndefined();
  });
});
