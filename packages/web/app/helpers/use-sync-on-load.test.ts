import type { User } from '@kana/helpers/auth/schemas';
import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { performQuizEventsSync } from './sync-quiz-events';
import { useSyncOnLoad } from './use-sync-on-load';
import { getStoredUser } from './user-storage';

vi.mock('./sync-quiz-events', () => ({
  performQuizEventsSync: vi.fn(),
}));

vi.mock('./user-storage', () => ({
  getStoredUser: vi.fn(),
}));

const mockPerformQuizEventsSync = vi.mocked(performQuizEventsSync);
const mockGetStoredUser = vi.mocked(getStoredUser);

const TEST_USER: User = {
  email: 'test@example.com',
  name: 'Test User',
};

const SINGLE_CALL_COUNT = 1;

describe('useSyncOnLoad', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('does not trigger sync when user is not logged in', () => {
    mockGetStoredUser.mockReturnValue(null);

    renderHook(() => useSyncOnLoad());

    expect(mockPerformQuizEventsSync).not.toHaveBeenCalled();
  });

  it('triggers sync when user is logged in', () => {
    mockGetStoredUser.mockReturnValue(TEST_USER);
    mockPerformQuizEventsSync.mockResolvedValue();

    renderHook(() => useSyncOnLoad());

    expect(mockPerformQuizEventsSync).toHaveBeenCalledTimes(SINGLE_CALL_COUNT);
  });

  it('handles sync rejection gracefully when user is logged in', () => {
    mockGetStoredUser.mockReturnValue(TEST_USER);
    mockPerformQuizEventsSync.mockRejectedValue(new Error('Sync failed'));

    renderHook(() => useSyncOnLoad());

    expect(mockPerformQuizEventsSync).toHaveBeenCalledTimes(SINGLE_CALL_COUNT);
  });
});
