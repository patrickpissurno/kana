export const LAST_EVENT_SYNCED_TIMESTAMP_KEY = 'last_event_synced_timestamp';

export function getLastSyncedTimestamp(): number | null {
  const raw = localStorage.getItem(LAST_EVENT_SYNCED_TIMESTAMP_KEY);
  if (raw === null) {
    return null;
  }

  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }

  return parsed;
}

export function setLastSyncedTimestamp(timestamp: number): void {
  localStorage.setItem(LAST_EVENT_SYNCED_TIMESTAMP_KEY, String(timestamp));
}
