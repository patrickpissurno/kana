import type { SyncQuizEventsPayload, QuizEvent } from '@kana/helpers/sync/schemas';
import type { ServerResponse } from '@kana/helpers/types';
import { db } from '../db.server';

export type SyncQuizEventsProps = {
  data: SyncQuizEventsPayload;
  user_id: string;
};

export type SyncQuizEventsResult = ServerResponse<{
  missing: QuizEvent[];
  totalItems: number;
}>;

export async function syncQuizEvents({
  data,
  user_id,
}: SyncQuizEventsProps): Promise<SyncQuizEventsResult> {
  const rows = await db<{ id: string }[]>`
    -- TODO:
    -- MERGE statement that upserts quiz events while applying the
    -- collision resolution found in packages/web/app/helpers/resolve-event-collision.ts
    -- returning the IDs of all upserted elements
  `;

  const [{ count } = { count: 0 }] = await db<{ count: number }[]>`
    SELECT COUNT(id) AS count FROM quiz_events
    WHERE user_id = ${user_id}
  `;

  if (count > data.totalItems) {
    const missing = await db<QuizEvent[]>`
      SELECT timestamp, glyph, result
      FROM quiz_events
      WHERE user_id = ${user_id} AND id NOT IN (${rows.map((r) => r.id)})
      ORDER BY timestamp ASC
    `;

    return {
      data: {
        missing,
        totalItems: count,
      },
    };
  }

  return { data: { missing: [], totalItems: count } };
}
