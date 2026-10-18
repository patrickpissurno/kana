import { cron } from 'bun';
import { db } from './db.server';

export const DAILY_CRON_SCHEDULE = '@daily';

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

export function startDailyCacheEvictionCron() {
  return cron(DAILY_CRON_SCHEDULE, () => {
    evictExpiredDeviceCaches().catch(() => undefined);
  });
}
