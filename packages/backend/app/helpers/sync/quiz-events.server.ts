import type { SyncQuizEventsData } from '@kana/helpers/sync/schemas';
import { db } from '../db.server';

export const SYNC_QUIZ_EVENTS_ERROR = 'Failed to sync quiz events';
export const EMPTY_SYNC_RAW_JSON = '{"data":{"timestamps":[],"glyphs":[],"results":[]}}';

export type SyncQuizEventsProps = {
  data: SyncQuizEventsData;
  user_id: number;
  device_id: string;
};

export type SyncQuizEventsResult = {
  readonly rawJson?: string;
  readonly nonFieldError?: string;
};

export async function syncQuizEvents({
  data,
  user_id,
  device_id,
}: SyncQuizEventsProps): Promise<SyncQuizEventsResult> {
  try {
    return await db.begin(async (tx) => {
      let insertedIds: number[] = [];
      let updatedIds: number[] = [];

      if (data.timestamps.length > 0) {
        const insertedRows = await tx<{ id: number }[]>`
          WITH incoming AS (
            SELECT * FROM unnest(
              ${tx.array(data.timestamps, 'int8')},
              ${tx.array(data.glyphs, 'text')},
              ${tx.array(data.results, 'int2')}
            ) AS i(timestamp, glyph, result)
          ),
          new_events AS (
            SELECT i.timestamp, i.glyph, i.result
            FROM incoming i
            LEFT JOIN quiz_events e ON e.user_id = ${user_id} AND e.timestamp = i.timestamp
            WHERE e.id IS NULL
          ),
          counter_update AS (
            UPDATE quiz_events_counters
            SET last_event_id = last_event_id + (SELECT COUNT(*)::int4 FROM new_events)
            WHERE user_id = ${user_id}
            RETURNING last_event_id - (SELECT COUNT(*)::int4 FROM new_events) AS base_id
          ),
          numbered_new_events AS (
            SELECT
              n.timestamp,
              n.glyph,
              n.result,
              (SELECT base_id FROM counter_update) + (ROW_NUMBER() OVER (ORDER BY timestamp))::int4 AS id
            FROM new_events n
          )
          INSERT INTO quiz_events (user_id, id, timestamp, glyph, result)
          SELECT ${user_id}, id, timestamp, glyph, result
          FROM numbered_new_events
          RETURNING id
        `;

        insertedIds = insertedRows.map((r) => r.id);

        const updatedRows = await tx<{ id: number }[]>`
          WITH incoming AS (
            SELECT * FROM unnest(
              ${tx.array(data.timestamps, 'int8')},
              ${tx.array(data.glyphs, 'text')},
              ${tx.array(data.results, 'int2')}
            ) AS i(timestamp, glyph, result)
          )
          UPDATE quiz_events e
          SET
            glyph = i.glyph,
            result = i.result
          FROM incoming i
          WHERE e.user_id = ${user_id}
            AND e.timestamp = i.timestamp
            AND (i.glyph > e.glyph OR (i.glyph = e.glyph AND i.result > e.result))
          RETURNING e.id
        `;

        updatedIds = updatedRows.map((r) => r.id);

        if (updatedIds.length > 0) {
          await tx`
            UPDATE quiz_events_devices_cache
            SET synced_events = rb_andnot(synced_events, rb_build(${tx.array(updatedIds, 'int4')}))
            WHERE user_id = ${user_id}
              AND device_uuid != ${device_id}::uuid
          `;
        }
      }

      const pushedIds = [...insertedIds, ...updatedIds];
      const upsertRows = await tx<{ current_cache_count: number }[]>`
        INSERT INTO quiz_events_devices_cache (device_uuid, user_id, last_synced_at, synced_events)
        VALUES (${device_id}::uuid, ${user_id}, CURRENT_DATE, rb_build(${tx.array(pushedIds, 'int4')}))
        ON CONFLICT (user_id, device_uuid) DO UPDATE
        SET
          synced_events = rb_or(quiz_events_devices_cache.synced_events, EXCLUDED.synced_events),
          last_synced_at = CURRENT_DATE
        RETURNING rb_cardinality(synced_events) AS current_cache_count
      `;

      const currentCacheCount = upsertRows[0]?.current_cache_count ?? 0;

      const counterRows = await tx<{ last_event_id: number }[]>`
        SELECT last_event_id FROM quiz_events_counters WHERE user_id = ${user_id}
      `;
      const lastEventId = counterRows[0]?.last_event_id ?? 0;

      if (currentCacheCount >= lastEventId) {
        return { rawJson: EMPTY_SYNC_RAW_JSON };
      }

      const missingRows = await tx<{ payload: string; missing_bitmap: string | null }[]>`
        WITH missing AS (
          SELECT e.id, e.timestamp, e.glyph, e.result
          FROM quiz_events e
          JOIN quiz_events_devices_cache c ON c.user_id = e.user_id AND c.device_uuid = ${device_id}::uuid
          WHERE e.user_id = ${user_id}
            AND NOT rb_contains(c.synced_events, e.id)
          ORDER BY e.timestamp ASC
        )
        SELECT
          json_build_object(
            'data', json_build_object(
              'timestamps', COALESCE(json_agg(m.timestamp ORDER BY m.timestamp ASC), '[]'::json),
              'glyphs', COALESCE(json_agg(m.glyph ORDER BY m.timestamp ASC), '[]'::json),
              'results', COALESCE(json_agg(m.result ORDER BY m.timestamp ASC), '[]'::json)
            )
          )::text AS payload,
          rb_build_agg(m.id) AS missing_bitmap
        FROM missing m
      `;

      const resultRow = missingRows[0];
      if (resultRow?.missing_bitmap) {
        await tx`
          UPDATE quiz_events_devices_cache
          SET synced_events = rb_or(synced_events, ${resultRow.missing_bitmap})
          WHERE user_id = ${user_id} AND device_uuid = ${device_id}::uuid
        `;
      }

      return { rawJson: resultRow?.payload ?? EMPTY_SYNC_RAW_JSON };
    });
  } catch {
    return {
      nonFieldError: SYNC_QUIZ_EVENTS_ERROR,
    };
  }
}
