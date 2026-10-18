import { QUIZ_RESULT } from '@kana/helpers/sync/schemas';
import { randomUUIDv7 } from 'bun';
import { afterAll, describe, expect, it } from 'vitest';
import { register } from '~/helpers/auth/register.server';
import { db } from '~/helpers/db.server';
import { makeTestUser } from '~/mocks/factories/user.mock';
import { EMPTY_SYNC_RAW_JSON, syncQuizEvents } from './quiz-events.server';

const emailsToCleanup = new Set<string>();

const TIMESTAMP_1 = 1700000001000;
const TIMESTAMP_2 = 1700000002000;

describe('quiz-events.server (db)', () => {
  const user = makeTestUser();
  emailsToCleanup.add(user.email);

  afterAll(async () => {
    await db`DELETE FROM users WHERE email IN (${[...emailsToCleanup]})`;
  });

  it('upserts events, handles conflict resolution, evicts sibling caches, and streams missing events', async () => {
    const authResult = await register(user);
    const deviceId1 = authResult.data?.device_id;
    expect(deviceId1).toBeDefined();

    const userRows = await db<{ id: number }[]>`
      SELECT id FROM users WHERE email = ${user.email}
    `;
    const userId = userRows[0]?.id;
    expect(userId).toBeDefined();

    if (!userId || !deviceId1) {
      return;
    }

    const deviceId2 = randomUUIDv7();

    // 1. Initial sync from Device 1 with 2 events
    const initialSync = await syncQuizEvents({
      data: {
        timestamps: [TIMESTAMP_1, TIMESTAMP_2],
        glyphs: ['あ', 'い'],
        results: [QUIZ_RESULT.SKIPPED, QUIZ_RESULT.CORRECT],
      },
      user_id: userId,
      device_id: deviceId1,
    });

    expect(initialSync.rawJson).toBe(EMPTY_SYNC_RAW_JSON);

    // 2. Conflict resolution: upgrade skipped (1) to correct (3) at TIMESTAMP_1,
    // and attempt downgrade from correct (3) to skipped (1) at TIMESTAMP_2 (stays correct)
    const conflictSync = await syncQuizEvents({
      data: {
        timestamps: [TIMESTAMP_1, TIMESTAMP_2],
        glyphs: ['あ', 'い'],
        results: [QUIZ_RESULT.CORRECT, QUIZ_RESULT.SKIPPED],
      },
      user_id: userId,
      device_id: deviceId1,
    });

    expect(conflictSync.rawJson).toBe(EMPTY_SYNC_RAW_JSON);

    const rows = await db<{ timestamp: string; glyph: string; result: number }[]>`
      SELECT timestamp, glyph, result
      FROM quiz_events
      WHERE user_id = ${userId}
      ORDER BY timestamp ASC
    `;

    expect(rows[0]?.result).toBe(QUIZ_RESULT.CORRECT);
    expect(rows[1]?.result).toBe(QUIZ_RESULT.CORRECT);

    // 3. Device 2 syncs for the first time with no local events
    const device2Sync = await syncQuizEvents({
      data: {
        timestamps: [],
        glyphs: [],
        results: [],
      },
      user_id: userId,
      device_id: deviceId2,
    });

    expect(device2Sync.rawJson).toBeDefined();
    const device2Data = JSON.parse(device2Sync.rawJson!);
    expect(device2Data).toEqual({
      data: {
        timestamps: [TIMESTAMP_1, TIMESTAMP_2],
        glyphs: ['あ', 'い'],
        results: [QUIZ_RESULT.CORRECT, QUIZ_RESULT.CORRECT],
      },
    });

    // 4. Device 2 syncs again immediately -> hits fast path (0 missing)
    const device2ImmediateSync = await syncQuizEvents({
      data: {
        timestamps: [],
        glyphs: [],
        results: [],
      },
      user_id: userId,
      device_id: deviceId2,
    });

    expect(device2ImmediateSync.rawJson).toBe(EMPTY_SYNC_RAW_JSON);

    // 5. Device 1 updates glyph of TIMESTAMP_1 from 'あ' to 'い'
    // This updates the record and evicts the event ID from Device 2's cache
    await syncQuizEvents({
      data: {
        timestamps: [TIMESTAMP_1],
        glyphs: ['い'],
        results: [QUIZ_RESULT.CORRECT],
      },
      user_id: userId,
      device_id: deviceId1,
    });

    // 6. Device 2 syncs again -> cache was evicted, so Device 2 receives the updated event!
    const device2AfterEvictionSync = await syncQuizEvents({
      data: {
        timestamps: [],
        glyphs: [],
        results: [],
      },
      user_id: userId,
      device_id: deviceId2,
    });

    const device2EvictionData = JSON.parse(device2AfterEvictionSync.rawJson!);
    expect(device2EvictionData).toEqual({
      data: {
        timestamps: [TIMESTAMP_1],
        glyphs: ['い'],
        results: [QUIZ_RESULT.CORRECT],
      },
    });
  });
});
