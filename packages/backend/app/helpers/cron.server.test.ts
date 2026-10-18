import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DAILY_CRON_SCHEDULE,
  evictExpiredDeviceCaches,
  startDailyCacheEvictionCron,
} from './cron.server';
import { db } from './db.server';

vi.mock('./db.server', () => ({
  db: vi.fn(),
}));

const { mockCron } = vi.hoisted(() => ({
  mockCron: vi.fn(),
}));

vi.mock('bun', async (importOriginal) => {
  const actual = await importOriginal<typeof import('bun')>();
  return {
    ...actual,
    cron: mockCron,
  };
});

const mockDb = vi.mocked(db);

function mockDbResult<T>(result: T[]) {
  return Object.assign(result, { value: [], columns: [] });
}

beforeEach(() => {
  vi.clearAllMocks();
});

const EXPECTED_COUNT = 5;
const CUSTOM_SCHEDULE = '0 0 * * *';

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
    it('registers cron with default DAILY_CRON_SCHEDULE and triggers eviction on callback', async () => {
      mockDb.mockResolvedValue(mockDbResult([{ count: 2 }]));
      const mockStop = vi.fn();
      mockCron.mockReturnValue({ stop: mockStop });

      const job = startDailyCacheEvictionCron();

      expect(mockCron).toHaveBeenCalledWith(DAILY_CRON_SCHEDULE, expect.any(Function));
      expect(job).toEqual({ stop: mockStop });

      const callback = mockCron.mock.calls[0]?.[1] as () => void;
      callback();

      await Promise.resolve();
      expect(mockDb).toHaveBeenCalledOnce();
    });

    it('registers cron with custom schedule', () => {
      mockCron.mockReturnValue({ stop: vi.fn() });

      startDailyCacheEvictionCron(CUSTOM_SCHEDULE);

      expect(mockCron).toHaveBeenCalledWith(CUSTOM_SCHEDULE, expect.any(Function));
    });

    it('handles eviction errors silently during cron callback', async () => {
      mockDb.mockRejectedValue(new Error('Database offline'));
      mockCron.mockReturnValue({ stop: vi.fn() });

      startDailyCacheEvictionCron();

      const callback = mockCron.mock.calls[0]?.[1] as () => void;
      callback();

      await Promise.resolve();
      expect(mockDb).toHaveBeenCalledOnce();
    });
  });
});
