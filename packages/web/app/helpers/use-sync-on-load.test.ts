import type { PublicSessionData } from '@kana/helpers/auth/schemas';
import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getSessionData } from './session-data-storage';
import { performQuizEventsSync } from './sync-quiz-events';
import { useSyncOnLoad } from './use-sync-on-load';

vi.mock('./sync-quiz-events', () => ({
  performQuizEventsSync: vi.fn(),
}));

vi.mock('./session-data-storage', () => ({
  getSessionData: vi.fn(),
}));

const mockPerformQuizEventsSync = vi.mocked(performQuizEventsSync);
const mockGetSessionData = vi.mocked(getSessionData);

const TEST_SESSION_DATA: PublicSessionData = {
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
    mockGetSessionData.mockReturnValue(null);

    renderHook(() => useSyncOnLoad());

    expect(mockPerformQuizEventsSync).not.toHaveBeenCalled();
  });

  it('triggers sync when user is logged in', () => {
    mockGetSessionData.mockReturnValue(TEST_SESSION_DATA);
    mockPerformQuizEventsSync.mockResolvedValue();

    renderHook(() => useSyncOnLoad());

    expect(mockPerformQuizEventsSync).toHaveBeenCalledTimes(SINGLE_CALL_COUNT);
  });

  it('handles sync rejection gracefully when user is logged in', () => {
    mockGetSessionData.mockReturnValue(TEST_SESSION_DATA);
    mockPerformQuizEventsSync.mockRejectedValue(new Error('Sync failed'));

    renderHook(() => useSyncOnLoad());

    expect(mockPerformQuizEventsSync).toHaveBeenCalledTimes(SINGLE_CALL_COUNT);
  });
});
