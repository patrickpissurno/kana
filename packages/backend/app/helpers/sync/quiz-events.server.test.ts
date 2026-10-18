import type { SyncQuizEventsData } from '@kana/helpers/sync/schemas';
import { QUIZ_RESULT } from '@kana/helpers/sync/schemas';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EMPTY_SYNC_RAW_JSON, SYNC_QUIZ_EVENTS_ERROR, syncQuizEvents } from './quiz-events.server';

const mocks = vi.hoisted(() => {
  const query = vi.fn();
  const arr = vi.fn((a) => a);
  const tx = Object.assign((...args: unknown[]) => query(...args), {
    array: arr,
  });
  return { query, arr, tx };
});

vi.mock('../db.server', () => {
  const dbFn = Object.assign((...args: unknown[]) => mocks.query(...args), {
    array: mocks.arr,
    begin: vi.fn((cb: (tx: unknown) => unknown) => cb(mocks.tx)),
  });

  return { db: dbFn };
});

function mockDbResult<T>(result: T[]) {
  return Object.assign(result, { value: [], columns: [] });
}

const TEST_USER_ID = 1;
const TEST_DEVICE_ID = '018f0000-0000-7000-8000-000000000001';
const TEST_TIMESTAMP = 1000;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('quiz-events.server', () => {
  it('upserts items, evicts siblings when updated, and hits fast path when cache is up to date', async () => {
    const data: SyncQuizEventsData = {
      timestamps: [TEST_TIMESTAMP],
      glyphs: ['あ'],
      results: [QUIZ_RESULT.CORRECT],
    };

    mocks.query
      .mockResolvedValueOnce(mockDbResult([{ id: 1 }]))
      .mockResolvedValueOnce(mockDbResult([{ id: 2 }]))
      .mockResolvedValueOnce(mockDbResult([]))
      .mockResolvedValueOnce(mockDbResult([{ current_cache_count: 2 }]))
      .mockResolvedValueOnce(mockDbResult([{ last_event_id: 2 }]));

    const result = await syncQuizEvents({
      data,
      user_id: TEST_USER_ID,
      device_id: TEST_DEVICE_ID,
    });

    expect(result).toEqual({
      rawJson: EMPTY_SYNC_RAW_JSON,
    });
  });

  it('upserts items without sibling eviction when no events were updated and fetches missing events', async () => {
    const data: SyncQuizEventsData = {
      timestamps: [TEST_TIMESTAMP],
      glyphs: ['あ'],
      results: [QUIZ_RESULT.CORRECT],
    };

    const missingPayload = '{"data":{"timestamps":[2000],"glyphs":["い"],"results":[2]}}';

    mocks.query
      .mockResolvedValueOnce(mockDbResult([{ id: 1 }]))
      .mockResolvedValueOnce(mockDbResult([]))
      .mockResolvedValueOnce(mockDbResult([{ current_cache_count: 1 }]))
      .mockResolvedValueOnce(mockDbResult([{ last_event_id: 2 }]))
      .mockResolvedValueOnce(
        mockDbResult([{ payload: missingPayload, missing_bitmap: 'bitmap_hex' }])
      )
      .mockResolvedValueOnce(mockDbResult([]));

    const result = await syncQuizEvents({
      data,
      user_id: TEST_USER_ID,
      device_id: TEST_DEVICE_ID,
    });

    expect(result).toEqual({
      rawJson: missingPayload,
    });
  });

  it('handles empty timestamps without running insert/update CTEs and handles null missing_bitmap', async () => {
    const data: SyncQuizEventsData = {
      timestamps: [],
      glyphs: [],
      results: [],
    };

    const emptyMissingPayload = '{"data":{"timestamps":[],"glyphs":[],"results":[]}}';

    mocks.query
      .mockResolvedValueOnce(mockDbResult([{ current_cache_count: 0 }]))
      .mockResolvedValueOnce(mockDbResult([{ last_event_id: 1 }]))
      .mockResolvedValueOnce(
        mockDbResult([{ payload: emptyMissingPayload, missing_bitmap: null }])
      );

    const result = await syncQuizEvents({
      data,
      user_id: TEST_USER_ID,
      device_id: TEST_DEVICE_ID,
    });

    expect(result).toEqual({
      rawJson: emptyMissingPayload,
    });
  });

  it('handles empty database returns for upsertRows, counterRows, and missingRows using fallbacks', async () => {
    const data: SyncQuizEventsData = {
      timestamps: [],
      glyphs: [],
      results: [],
    };

    mocks.query
      .mockResolvedValueOnce(mockDbResult([]))
      .mockResolvedValueOnce(mockDbResult([{ last_event_id: 1 }]))
      .mockResolvedValueOnce(mockDbResult([]));

    const result = await syncQuizEvents({
      data,
      user_id: TEST_USER_ID,
      device_id: TEST_DEVICE_ID,
    });

    expect(result).toEqual({
      rawJson: EMPTY_SYNC_RAW_JSON,
    });
  });

  it('handles empty counterRows by falling back to 0 last_event_id and hitting fast path', async () => {
    const data: SyncQuizEventsData = {
      timestamps: [],
      glyphs: [],
      results: [],
    };

    mocks.query
      .mockResolvedValueOnce(mockDbResult([{ current_cache_count: 0 }]))
      .mockResolvedValueOnce(mockDbResult([]));

    const result = await syncQuizEvents({
      data,
      user_id: TEST_USER_ID,
      device_id: TEST_DEVICE_ID,
    });

    expect(result).toEqual({
      rawJson: EMPTY_SYNC_RAW_JSON,
    });
  });

  it('catches database exceptions and returns error message', async () => {
    const data: SyncQuizEventsData = {
      timestamps: [],
      glyphs: [],
      results: [],
    };

    mocks.query.mockRejectedValueOnce(new Error('Connection terminated'));

    const result = await syncQuizEvents({
      data,
      user_id: TEST_USER_ID,
      device_id: TEST_DEVICE_ID,
    });

    expect(result).toEqual({
      nonFieldError: SYNC_QUIZ_EVENTS_ERROR,
    });
  });
});
