import type {
  QuizEvent,
  SyncQuizEventsPayload,
  SyncQuizEventsResponse,
} from '@kana/helpers/sync/schemas';
import { db } from '../db.server';

export const SYNC_QUIZ_EVENTS_ERROR = 'Failed to sync quiz events';

export type SyncQuizEventsProps = {
  data: SyncQuizEventsPayload;
  user_id: string;
};

export type QuizEventRow = Omit<QuizEvent, 'timestamp'> & {
  timestamp: string;
};

export async function syncQuizEvents({
  data,
  user_id,
}: SyncQuizEventsProps): Promise<SyncQuizEventsResponse> {
  try {
    let insertedIds: string[] = [];

    if (data.items.length > 0) {
      const rowsToInsert = data.items.map((item) => ({
        user_id,
        timestamp: item.timestamp,
        glyph: item.glyph,
        result: item.result,
      }));

      const rows = await db<{ id: string }[]>`
        INSERT INTO quiz_events ${db(rowsToInsert)}
        ON CONFLICT (user_id, "timestamp") DO UPDATE SET
          glyph = CASE
            WHEN EXCLUDED.glyph > quiz_events.glyph OR (
              EXCLUDED.glyph = quiz_events.glyph AND
              CASE EXCLUDED.result WHEN 'correct' THEN 3 WHEN 'wrong' THEN 2 ELSE 1 END >
              CASE quiz_events.result WHEN 'correct' THEN 3 WHEN 'wrong' THEN 2 ELSE 1 END
            ) THEN EXCLUDED.glyph
            ELSE quiz_events.glyph
          END,
          result = CASE
            WHEN EXCLUDED.glyph > quiz_events.glyph OR (
              EXCLUDED.glyph = quiz_events.glyph AND
              CASE EXCLUDED.result WHEN 'correct' THEN 3 WHEN 'wrong' THEN 2 ELSE 1 END >
              CASE quiz_events.result WHEN 'correct' THEN 3 WHEN 'wrong' THEN 2 ELSE 1 END
            ) THEN EXCLUDED.result
            ELSE quiz_events.result
          END
        RETURNING id
      `;

      insertedIds = rows.map((r) => r.id);
    }

    const [{ count } = { count: 0 }] = await db<{ count: number }[]>`
      SELECT COUNT(id)::int AS count FROM quiz_events
      WHERE user_id = ${user_id}
    `;

    if (count > data.totalItems) {
      const missingRows =
        insertedIds.length > 0
          ? await db<QuizEventRow[]>`
              SELECT timestamp, glyph, result
              FROM quiz_events
              WHERE user_id = ${user_id} AND id NOT IN (${insertedIds})
              ORDER BY timestamp ASC
            `
          : await db<QuizEventRow[]>`
              SELECT timestamp, glyph, result
              FROM quiz_events
              WHERE user_id = ${user_id}
              ORDER BY timestamp ASC
            `;

      const missing: QuizEvent[] = missingRows.map((r) => ({
        timestamp: Number(r.timestamp),
        glyph: r.glyph,
        result: r.result,
      }));

      return {
        data: {
          missing,
          totalItems: count,
        },
      };
    }

    return { data: { missing: [], totalItems: count } };
  } catch {
    return {
      nonFieldError: SYNC_QUIZ_EVENTS_ERROR,
    };
  }
}
