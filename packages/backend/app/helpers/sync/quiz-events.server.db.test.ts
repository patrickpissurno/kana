import type { QuizEvent } from '@kana/helpers/sync/schemas';
import { afterAll, describe, expect, it } from 'vitest';
import { register } from '~/helpers/auth/register.server';
import { db } from '~/helpers/db.server';
import { makeTestUser } from '~/mocks/factories/user.mock';
import { syncQuizEvents } from './quiz-events.server';

const emailsToCleanup = new Set<string>();

const TIMESTAMP_1 = 1700000001000;
const TIMESTAMP_2 = 1700000002000;
const TIMESTAMP_3 = 1700000003000;
const EXPECTED_INITIAL_COUNT = 2;
const EXPECTED_SERVER_COUNT = 3;

describe('quiz-events.server (db)', () => {
  const user = makeTestUser();
  emailsToCleanup.add(user.email);

  afterAll(async () => {
    await db`DELETE FROM users WHERE email IN (${[...emailsToCleanup]})`;
  });

  it('upserts events, applies collision resolution, and returns missing events', async () => {
    const authResult = await register(user);
    const userId = authResult.data?.user.id;
    expect(userId).toBeDefined();

    if (!userId) {
      return;
    }

    // 1. Initial sync with 2 events
    const initialSync = await syncQuizEvents({
      data: {
        items: [
          {
            glyph: 'あ',
            timestamp: TIMESTAMP_1,
            result: 'skipped',
          },
          {
            glyph: 'い',
            timestamp: TIMESTAMP_2,
            result: 'correct',
          },
        ],
        totalItems: EXPECTED_INITIAL_COUNT,
      },
      user_id: userId,
    });

    expect(initialSync.data).toEqual({
      missing: [],
      totalItems: EXPECTED_INITIAL_COUNT,
    });

    // 2. Conflict resolution: upgrade skipped to correct at TIMESTAMP_1,
    // and attempt to downgrade correct to skipped at TIMESTAMP_2 (should stay correct)
    const conflictSync = await syncQuizEvents({
      data: {
        items: [
          {
            glyph: 'あ',
            timestamp: TIMESTAMP_1,
            result: 'correct',
          },
          {
            glyph: 'い',
            timestamp: TIMESTAMP_2,
            result: 'skipped',
          },
        ],
        totalItems: EXPECTED_INITIAL_COUNT,
      },
      user_id: userId,
    });

    expect(conflictSync.data).toEqual({
      missing: [],
      totalItems: EXPECTED_INITIAL_COUNT,
    });

    const rows = await db<{ timestamp: string; glyph: string; result: string }[]>`
      SELECT timestamp, glyph, result
      FROM quiz_events
      WHERE user_id = ${userId}
      ORDER BY timestamp ASC
    `;

    expect(rows[0]?.result).toBe('correct');
    expect(rows[1]?.result).toBe('correct');

    // 3. Insert a 3rd event directly into DB (simulating another device sync)
    await db`
      INSERT INTO quiz_events (user_id, "timestamp", glyph, result)
      VALUES (${userId}, ${TIMESTAMP_3}, 'う', 'wrong')
    `;

    // 4. Client syncs only knowing about 1 event and totalItems: 1
    const missingSync = await syncQuizEvents({
      data: {
        items: [
          {
            glyph: 'あ',
            timestamp: TIMESTAMP_1,
            result: 'correct',
          },
        ],
        totalItems: 1,
      },
      user_id: userId,
    });

    expect(missingSync.data?.totalItems).toBe(EXPECTED_SERVER_COUNT);
    expect(missingSync.data?.missing).toEqual([
      {
        glyph: 'い',
        timestamp: TIMESTAMP_2,
        result: 'correct',
      },
      {
        glyph: 'う',
        timestamp: TIMESTAMP_3,
        result: 'wrong',
      },
    ] satisfies QuizEvent[]);

    // Ensure timestamp in missing is a JavaScript number
    expect(typeof missingSync.data?.missing[0]?.timestamp).toBe('number');
  });
});
