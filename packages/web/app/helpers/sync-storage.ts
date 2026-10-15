export const LAST_EVENT_SYNCED_TIMESTAMP_KEY = 'last_event_synced_timestamp';

export function getLastSyncedTimestamp(
  storage: Storage | null = typeof localStorage !== 'undefined' ? localStorage : null
): number | null {
  if (!storage) {
    return null;
  }

  try {
    const raw = storage.getItem(LAST_EVENT_SYNCED_TIMESTAMP_KEY);
    if (raw === null) {
      return null;
    }

    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed < 0) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function setLastSyncedTimestamp(
  timestamp: number,
  storage: Storage | null = typeof localStorage !== 'undefined' ? localStorage : null
): void {
  if (!storage) {
    return;
  }

  try {
    storage.setItem(LAST_EVENT_SYNCED_TIMESTAMP_KEY, String(timestamp));
  } catch {
    // Graceful fallback if localStorage is disabled or throws
  }
}
