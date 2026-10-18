import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { evictExpiredDeviceCaches, ONE_DAY_MS, startDailyCacheEvictionCron } from './cron.server';
import { db } from './db.server';

vi.mock('./db.server', () => ({
  db: vi.fn(),
}));

const mockDb = vi.mocked(db);

function mockDbResult<T>(result: T[]) {
  return Object.assign(result, { value: [], columns: [] });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

const EXPECTED_COUNT = 5;
const CUSTOM_INTERVAL_MS = 5000;

describe('cron.server', () => {
  describe('evictExpiredDeviceCaches', () => {
    it('executes delete query and returns deleted count', async () => {
      mockDb.mockResolvedValueOnce(mockDbResult([{ count: EXPECTED_COUNT }]));

      const count = await evictExpiredDeviceCaches();

      expect(count).toBe(EXPECTED_COUNT);
    });

    it('returns 0 when database returns empty rows', async () => {
      mockDb.mockResolvedValueOnce(mockDbResult([]));

      const count = await evictExpiredDeviceCaches();

      expect(count).toBe(0);
    });
  });

  describe('startDailyCacheEvictionCron', () => {
    it('starts interval with default ONE_DAY_MS and triggers eviction on tick', async () => {
      mockDb.mockResolvedValue(mockDbResult([{ count: 2 }]));

      const timer = startDailyCacheEvictionCron();

      expect(mockDb).not.toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(ONE_DAY_MS);

      expect(mockDb).toHaveBeenCalledOnce();

      clearInterval(timer);
    });

    it('starts interval with custom intervalMs and triggers eviction', async () => {
      mockDb.mockResolvedValue(mockDbResult([{ count: 1 }]));

      const timer = startDailyCacheEvictionCron(CUSTOM_INTERVAL_MS);

      expect(mockDb).not.toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(CUSTOM_INTERVAL_MS);

      expect(mockDb).toHaveBeenCalledOnce();

      clearInterval(timer);
    });

    it('handles eviction errors silently during cron tick', async () => {
      mockDb.mockRejectedValue(new Error('Database offline'));

      const timer = startDailyCacheEvictionCron(CUSTOM_INTERVAL_MS);

      await vi.advanceTimersByTimeAsync(CUSTOM_INTERVAL_MS);

      expect(mockDb).toHaveBeenCalledOnce();

      clearInterval(timer);
    });
  });
});
