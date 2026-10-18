import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { syncQuizEvents } from '../endpoints/sync/quiz-events';
import { QUIZ_RESULT } from '../types/quiz';
import { appendQuizEvent } from './append-quiz-event';
import { getDb } from './get-db';
import { loadAllQuizEvents } from './load-all-quiz-events';
import { performQuizEventsSync } from './sync-quiz-events';
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
const EXPECTED_UPSERTED_EVENTS_COUNT = 2;

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
        timestamps: [],
        glyphs: [],
        results: [],
      },
    });

    await performQuizEventsSync();

    expect(mockSyncQuizEvents).toHaveBeenCalledWith({
      timestamps: [],
      glyphs: [],
      results: [],
    });
    expect(getLastSyncedTimestamp()).toBeNull();
  });

  it('performs clean initial sync and saves max event timestamp', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(TIMESTAMP_1);
    await appendQuizEvent('あ');
    vi.setSystemTime(TIMESTAMP_2);
    await appendQuizEvent('い');
    vi.useRealTimers();

    mockSyncQuizEvents.mockResolvedValueOnce({
      data: {
        timestamps: [],
        glyphs: [],
        results: [],
      },
    });

    await performQuizEventsSync();

    expect(mockSyncQuizEvents).toHaveBeenCalledWith({
      timestamps: [TIMESTAMP_1, TIMESTAMP_2],
      glyphs: ['あ', 'い'],
      results: [QUIZ_RESULT.SKIPPED, QUIZ_RESULT.SKIPPED],
    });

    expect(getLastSyncedTimestamp()).toBe(TIMESTAMP_2);
  });

  it('only queries events after lastSyncedTimestamp on subsequent sync', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(TIMESTAMP_1);
    await appendQuizEvent('あ');
    vi.setSystemTime(TIMESTAMP_2);
    await appendQuizEvent('い');
    vi.useRealTimers();

    setLastSyncedTimestamp(TIMESTAMP_1);

    mockSyncQuizEvents.mockResolvedValueOnce({
      data: {
        timestamps: [],
        glyphs: [],
        results: [],
      },
    });

    await performQuizEventsSync();

    expect(mockSyncQuizEvents).toHaveBeenCalledWith({
      timestamps: [TIMESTAMP_2],
      glyphs: ['い'],
      results: [QUIZ_RESULT.SKIPPED],
    });
    expect(getLastSyncedTimestamp()).toBe(TIMESTAMP_2);
  });

  it('upserts missing events and applies collision resolution for existing and new events', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(TIMESTAMP_1);
    await appendQuizEvent('あ');
    vi.useRealTimers();

    mockSyncQuizEvents.mockResolvedValueOnce({
      data: {
        timestamps: [TIMESTAMP_1, TIMESTAMP_3],
        glyphs: ['あ', 'う'],
        results: [QUIZ_RESULT.CORRECT, QUIZ_RESULT.WRONG],
      },
    });

    await performQuizEventsSync();

    const allEvents = await loadAllQuizEvents();
    expect(allEvents).toHaveLength(EXPECTED_UPSERTED_EVENTS_COUNT);
    expect(allEvents.find((r) => r.timestamp === TIMESTAMP_1)?.result).toBe(QUIZ_RESULT.CORRECT);
    expect(allEvents.find((r) => r.timestamp === TIMESTAMP_3)?.result).toBe(QUIZ_RESULT.WRONG);
    expect(getLastSyncedTimestamp()).toBe(TIMESTAMP_3);
  });

  it('covers branches where item or missing timestamp is not greater than current max', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(TIMESTAMP_2);
    await appendQuizEvent('い');
    vi.setSystemTime(TIMESTAMP_1);
    await appendQuizEvent('あ');
    vi.useRealTimers();

    mockSyncQuizEvents.mockResolvedValueOnce({
      data: {
        timestamps: [TIMESTAMP_1],
        glyphs: ['あ'],
        results: [QUIZ_RESULT.CORRECT],
      },
    });

    await performQuizEventsSync();

    expect(getLastSyncedTimestamp()).toBe(TIMESTAMP_2);
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

  it('handles store.put onerror during upsert missing events silently', async () => {
    mockSyncQuizEvents.mockResolvedValueOnce({
      data: {
        timestamps: [TIMESTAMP_1],
        glyphs: ['あ'],
        results: [QUIZ_RESULT.CORRECT],
      },
    });

    const db = await getDb();
    const origTx = db.transaction.bind(db);
    vi.spyOn(db, 'transaction').mockImplementation((names, mode) => {
      if (mode === 'readwrite') {
        const fakeReq = {
          result: undefined,
          error: new DOMException('Put failed', 'AbortError'),
          onsuccess: null,
          onerror: null as ((ev: Event) => void) | null,
        };
        queueMicrotask(() => {
          if (fakeReq.onerror) {
            fakeReq.onerror(new Event('error'));
          }
        });
        const fakeStore = {
          put: () => fakeReq,
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
