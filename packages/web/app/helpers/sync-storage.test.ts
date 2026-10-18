import { beforeEach, describe, expect, it } from 'vitest';
import {
  DEVICE_ID_STORAGE_KEY,
  getDeviceId,
  getLastSyncedTimestamp,
  LAST_EVENT_SYNCED_TIMESTAMP_KEY,
  setDeviceId,
  setLastSyncedTimestamp,
} from './sync-storage';

const VALID_TIMESTAMP = 1728987654321;
const NEGATIVE_TIMESTAMP = -1;
const TEST_DEVICE_ID = '018f0000-0000-7000-8000-000000000001';

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

  describe('getDeviceId and setDeviceId', () => {
    it('returns existing deviceId from storage if present', () => {
      localStorage.setItem(DEVICE_ID_STORAGE_KEY, TEST_DEVICE_ID);
      expect(getDeviceId()).toBe(TEST_DEVICE_ID);
    });

    it('returns null when none exists in storage', () => {
      expect(getDeviceId()).toBeNull();
    });

    it('sets deviceId explicitly in storage', () => {
      setDeviceId(TEST_DEVICE_ID);
      expect(localStorage.getItem(DEVICE_ID_STORAGE_KEY)).toBe(TEST_DEVICE_ID);
    });
  });
});
