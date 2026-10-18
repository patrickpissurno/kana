import type { SyncQuizEventsPayload } from '@kana/helpers/sync/schemas';
import { QUIZ_RESULT } from '@kana/helpers/sync/schemas';
import { safeFetch } from '@kana/helpers/utils/safe-fetch';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { VITE_BACKEND_URL } from '~/helpers/config';
import { syncQuizEvents } from './quiz-events';

vi.mock('@kana/helpers/utils/safe-fetch', () => ({
  safeFetch: vi.fn(),
}));

const TEST_TIMESTAMP = 1728987654321;
const EXPECTED_STATUS_OK = 200;

describe('syncQuizEvents endpoint', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('posts payload to /sync/quiz-events with JSON body and credentials', async () => {
    const payload: SyncQuizEventsPayload = {
      timestamps: [TEST_TIMESTAMP],
      glyphs: ['あ'],
      results: [QUIZ_RESULT.CORRECT],
    };

    const mockResponseData = {
      timestamps: [],
      glyphs: [],
      results: [],
    };

    vi.mocked(safeFetch).mockResolvedValue({
      status: EXPECTED_STATUS_OK,
      statusText: 'OK',
      headers: new Headers(),
      result: { data: mockResponseData },
      error: undefined,
    });

    const result = await syncQuizEvents(payload);

    expect(result).toEqual({ data: mockResponseData });
    expect(safeFetch).toHaveBeenCalledWith(
      `${VITE_BACKEND_URL}/sync/quiz-events`,
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        mode: 'cors',
        credentials: 'include',
      })
    );
  });
});
