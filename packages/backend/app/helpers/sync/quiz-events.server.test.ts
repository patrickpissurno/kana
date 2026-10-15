import type { QuizEvent, SyncQuizEventsPayload } from '@kana/helpers/sync/schemas';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SYNC_QUIZ_EVENTS_ERROR, syncQuizEvents } from './quiz-events.server';

const mockQuery = vi.fn();

vi.mock('../db.server', () => {
  const dbFn = Object.assign(
    (...args: unknown[]) => {
      const isTaggedTemplate =
        args.length > 0 && Array.isArray(args[0]) && 'raw' in (args[0] as object);

      if (isTaggedTemplate) {
        return mockQuery(...args);
      }
      return '';
    },
    {
      array: vi.fn(),
    }
  );

  return { db: dbFn };
});

function mockDbResult<T>(result: T[]) {
  return Object.assign(result, { value: [], columns: [] });
}

const TEST_USER_ID = '123e4567-e89b-12d3-a456-426614174000';
const TEST_TIMESTAMP_1 = 1000;
const TEST_TIMESTAMP_2 = 2000;
const TEST_COUNT_ONE = 1;
const TEST_COUNT_TWO = 2;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('quiz-events.server', () => {
  it('upserts items and returns empty missing when count equals totalItems', async () => {
    const payload: SyncQuizEventsPayload = {
      items: [
        {
          glyph: 'あ',
          timestamp: TEST_TIMESTAMP_1,
          result: 'correct',
        },
      ],
      totalItems: TEST_COUNT_ONE,
    };

    mockQuery
      .mockResolvedValueOnce(mockDbResult([{ id: 'id-1' }]))
      .mockResolvedValueOnce(mockDbResult([{ count: TEST_COUNT_ONE }]));

    const result = await syncQuizEvents({ data: payload, user_id: TEST_USER_ID });

    expect(result).toEqual({
      data: {
        missing: [],
        totalItems: TEST_COUNT_ONE,
      },
    });
  });

  it('upserts items and returns missing items when server count is greater than totalItems', async () => {
    const payload: SyncQuizEventsPayload = {
      items: [
        {
          glyph: 'あ',
          timestamp: TEST_TIMESTAMP_1,
          result: 'correct',
        },
      ],
      totalItems: TEST_COUNT_ONE,
    };

    const missingRow = {
      timestamp: String(TEST_TIMESTAMP_2),
      glyph: 'い',
      result: 'wrong' as const,
    };

    mockQuery
      .mockResolvedValueOnce(mockDbResult([{ id: 'id-1' }]))
      .mockResolvedValueOnce(mockDbResult([{ count: TEST_COUNT_TWO }]))
      .mockResolvedValueOnce(mockDbResult([missingRow]));

    const result = await syncQuizEvents({ data: payload, user_id: TEST_USER_ID });

    expect(result).toEqual({
      data: {
        missing: [
          {
            timestamp: TEST_TIMESTAMP_2,
            glyph: 'い',
            result: 'wrong',
          },
        ] satisfies QuizEvent[],
        totalItems: TEST_COUNT_TWO,
      },
    });
  });

  it('handles empty items without running upsert query and returns missing items', async () => {
    const payload: SyncQuizEventsPayload = {
      items: [],
      totalItems: 0,
    };

    const missingRow = {
      timestamp: TEST_TIMESTAMP_1,
      glyph: 'あ',
      result: 'correct' as const,
    };

    mockQuery
      .mockResolvedValueOnce(mockDbResult([{ count: TEST_COUNT_ONE }]))
      .mockResolvedValueOnce(mockDbResult([missingRow]));

    const result = await syncQuizEvents({ data: payload, user_id: TEST_USER_ID });

    expect(result).toEqual({
      data: {
        missing: [
          {
            timestamp: TEST_TIMESTAMP_1,
            glyph: 'あ',
            result: 'correct',
          },
        ],
        totalItems: TEST_COUNT_ONE,
      },
    });
  });

  it('handles empty count result using default count of 0', async () => {
    const payload: SyncQuizEventsPayload = {
      items: [],
      totalItems: 0,
    };

    mockQuery.mockResolvedValueOnce(mockDbResult([]));

    const result = await syncQuizEvents({ data: payload, user_id: TEST_USER_ID });

    expect(result).toEqual({
      data: {
        missing: [],
        totalItems: 0,
      },
    });
  });

  it('catches database exceptions and returns error message', async () => {
    const payload: SyncQuizEventsPayload = {
      items: [],
      totalItems: 0,
    };

    mockQuery.mockRejectedValueOnce(new Error('Connection terminated'));

    const result = await syncQuizEvents({ data: payload, user_id: TEST_USER_ID });

    expect(result).toEqual({
      nonFieldError: SYNC_QUIZ_EVENTS_ERROR,
    });
  });
});
