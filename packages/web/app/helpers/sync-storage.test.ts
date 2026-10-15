import { beforeEach, describe, expect, it } from 'vitest';
import {
  getLastSyncedTimestamp,
  LAST_EVENT_SYNCED_TIMESTAMP_KEY,
  setLastSyncedTimestamp,
} from './sync-storage';

const VALID_TIMESTAMP = 1728987654321;
const NEGATIVE_TIMESTAMP = -1;

describe('sync-storage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('getLastSyncedTimestamp', () => {
    it('returns null when key does not exist', () => {
      expect(getLastSyncedTimestamp()).toBeNull();
    });

    it('returns parsed number when key contains valid positive integer', () => {
      localStorage.setItem(LAST_EVENT_SYNCED_TIMESTAMP_KEY, String(VALID_TIMESTAMP));
      expect(getLastSyncedTimestamp()).toBe(VALID_TIMESTAMP);
    });

    it('returns null when value is not a valid finite number', () => {
      localStorage.setItem(LAST_EVENT_SYNCED_TIMESTAMP_KEY, 'invalid');
      expect(getLastSyncedTimestamp()).toBeNull();
    });

    it('returns null when value is negative', () => {
      localStorage.setItem(LAST_EVENT_SYNCED_TIMESTAMP_KEY, String(NEGATIVE_TIMESTAMP));
      expect(getLastSyncedTimestamp()).toBeNull();
    });
  });

  describe('setLastSyncedTimestamp', () => {
    it('saves timestamp string in storage', () => {
      setLastSyncedTimestamp(VALID_TIMESTAMP);
      expect(localStorage.getItem(LAST_EVENT_SYNCED_TIMESTAMP_KEY)).toBe(String(VALID_TIMESTAMP));
    });
  });
});
