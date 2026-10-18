import { db } from './db.server';

const MS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;
const MINUTES_PER_HOUR = 60;
const HOURS_PER_DAY = 24;

export const ONE_DAY_MS = HOURS_PER_DAY * MINUTES_PER_HOUR * SECONDS_PER_MINUTE * MS_PER_SECOND;

export async function evictExpiredDeviceCaches(): Promise<number> {
  const result = await db<{ count: number }[]>`
    WITH deleted AS (
      DELETE FROM quiz_events_devices_cache
      WHERE last_synced_at < CURRENT_DATE - INTERVAL '30 days'
      RETURNING 1
    )
    SELECT COUNT(*)::int AS count FROM deleted
  `;

  return result[0]?.count ?? 0;
}

export function startDailyCacheEvictionCron(
  intervalMs: number = ONE_DAY_MS
): ReturnType<typeof setInterval> {
  const timer = setInterval(() => {
    evictExpiredDeviceCaches().catch(() => undefined);
  }, intervalMs);

  return timer;
}
