export const LAST_EVENT_SYNCED_TIMESTAMP_KEY = 'last_event_synced_timestamp';
export const DEVICE_ID_STORAGE_KEY = 'kana_device_id';

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

export function getDeviceId(): string | null {
  return localStorage.getItem(DEVICE_ID_STORAGE_KEY);
}

export function setDeviceId(id: string): void {
  localStorage.setItem(DEVICE_ID_STORAGE_KEY, id);
}
