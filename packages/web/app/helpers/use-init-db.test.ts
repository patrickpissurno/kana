import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getDb } from './get-db';
import { useInitDb } from './use-init-db';

vi.mock('./get-db', () => ({
  getDb: vi.fn(),
}));

const FAST_RESOLVE_MS = 50;
const SLOW_RESOLVE_MS = 300;
const LONG_RESOLVE_MS = 1500;
const SHOW_DELAY_MS = 150;
const MIN_DISPLAY_MS = 1000;

describe('useInitDb', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('keeps indicator hidden when getDb resolves within 150ms', async () => {
    let resolveDb: () => void = vi.fn<() => void>();
    const dbPromise = new Promise<IDBDatabase>((resolve) => {
      resolveDb = () => resolve({} as IDBDatabase);
    });
    vi.mocked(getDb).mockReturnValue(dbPromise);

    const { result } = renderHook(() => useInitDb());

    expect(result.current.isIndicatorVisible).toBe(false);
    expect(result.current.error).toBeNull();

    act(() => {
      vi.advanceTimersByTime(FAST_RESOLVE_MS);
      resolveDb();
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.isIndicatorVisible).toBe(false);
    expect(result.current.error).toBeNull();

    act(() => {
      vi.advanceTimersByTime(SHOW_DELAY_MS);
    });

    expect(result.current.isIndicatorVisible).toBe(false);
  });

  it('shows indicator after 150ms and holds for 1s minimum display time', async () => {
    let resolveDb: () => void = vi.fn<() => void>();
    const dbPromise = new Promise<IDBDatabase>((resolve) => {
      resolveDb = () => resolve({} as IDBDatabase);
    });
    vi.mocked(getDb).mockReturnValue(dbPromise);

    const { result } = renderHook(() => useInitDb());

    expect(result.current.isIndicatorVisible).toBe(false);

    act(() => {
      vi.advanceTimersByTime(SHOW_DELAY_MS);
    });

    expect(result.current.isIndicatorVisible).toBe(true);

    act(() => {
      vi.advanceTimersByTime(SLOW_RESOLVE_MS - SHOW_DELAY_MS);
      resolveDb();
    });

    await act(async () => {
      await Promise.resolve();
    });

    // Still visible because 1s minimum display has not elapsed
    expect(result.current.isIndicatorVisible).toBe(true);

    // Advance to 1000ms after showing (150ms + 1000ms = 1150ms)
    act(() => {
      vi.advanceTimersByTime(MIN_DISPLAY_MS - (SLOW_RESOLVE_MS - SHOW_DELAY_MS));
    });

    expect(result.current.isIndicatorVisible).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('hides indicator immediately if DB takes longer than minimum display time', async () => {
    let resolveDb: () => void = vi.fn<() => void>();
    const dbPromise = new Promise<IDBDatabase>((resolve) => {
      resolveDb = () => resolve({} as IDBDatabase);
    });
    vi.mocked(getDb).mockReturnValue(dbPromise);

    const { result } = renderHook(() => useInitDb());

    act(() => {
      vi.advanceTimersByTime(SHOW_DELAY_MS);
    });

    expect(result.current.isIndicatorVisible).toBe(true);

    act(() => {
      vi.advanceTimersByTime(LONG_RESOLVE_MS - SHOW_DELAY_MS);
      resolveDb();
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.isIndicatorVisible).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('sets error immediately if getDb rejects within 150ms with Error instance', async () => {
    let rejectDb: (err: unknown) => void = vi.fn<(err: unknown) => void>();
    const dbPromise = new Promise<IDBDatabase>((_resolve, reject) => {
      rejectDb = reject;
    });
    vi.mocked(getDb).mockReturnValue(dbPromise);

    const { result } = renderHook(() => useInitDb());

    act(() => {
      vi.advanceTimersByTime(FAST_RESOLVE_MS);
      rejectDb(new Error('Connection failed'));
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.isIndicatorVisible).toBe(false);
    expect(result.current.error?.message).toBe('Connection failed');
  });

  it('holds indicator and sets fallback error when getDb rejects after 150ms with non-Error', async () => {
    let rejectDb: (err: unknown) => void = vi.fn<(err: unknown) => void>();
    const dbPromise = new Promise<IDBDatabase>((_resolve, reject) => {
      rejectDb = reject;
    });
    vi.mocked(getDb).mockReturnValue(dbPromise);

    const { result } = renderHook(() => useInitDb());

    act(() => {
      vi.advanceTimersByTime(SHOW_DELAY_MS);
    });

    expect(result.current.isIndicatorVisible).toBe(true);

    act(() => {
      vi.advanceTimersByTime(SLOW_RESOLVE_MS - SHOW_DELAY_MS);
      rejectDb('String rejection');
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.isIndicatorVisible).toBe(true);
    expect(result.current.error).toBeNull();

    act(() => {
      vi.advanceTimersByTime(MIN_DISPLAY_MS - (SLOW_RESOLVE_MS - SHOW_DELAY_MS));
    });

    expect(result.current.isIndicatorVisible).toBe(false);
    expect(result.current.error?.message).toBe('Database initialization failed');
  });

  it('sets error immediately if getDb rejects after longer than minimum display time', async () => {
    let rejectDb: (err: unknown) => void = vi.fn<(err: unknown) => void>();
    const dbPromise = new Promise<IDBDatabase>((_resolve, reject) => {
      rejectDb = reject;
    });
    vi.mocked(getDb).mockReturnValue(dbPromise);

    const { result } = renderHook(() => useInitDb());

    act(() => {
      vi.advanceTimersByTime(SHOW_DELAY_MS);
    });

    expect(result.current.isIndicatorVisible).toBe(true);

    act(() => {
      vi.advanceTimersByTime(LONG_RESOLVE_MS - SHOW_DELAY_MS);
      rejectDb(new Error('Long timeout error'));
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.isIndicatorVisible).toBe(false);
    expect(result.current.error?.message).toBe('Long timeout error');
  });

  it('cancels all timers and does not update state when unmounted early', async () => {
    let resolveDb: () => void = vi.fn<() => void>();
    const dbPromise = new Promise<IDBDatabase>((resolve) => {
      resolveDb = () => resolve({} as IDBDatabase);
    });
    vi.mocked(getDb).mockReturnValue(dbPromise);

    const { unmount } = renderHook(() => useInitDb());

    unmount();

    act(() => {
      vi.advanceTimersByTime(SHOW_DELAY_MS);
      resolveDb();
    });

    await act(async () => {
      await Promise.resolve();
    });
  });

  it('cancels hide timer and does not update state when unmounted during hide delay', async () => {
    let resolveDb: () => void = vi.fn<() => void>();
    const dbPromise = new Promise<IDBDatabase>((resolve) => {
      resolveDb = () => resolve({} as IDBDatabase);
    });
    vi.mocked(getDb).mockReturnValue(dbPromise);

    const { result, unmount } = renderHook(() => useInitDb());

    act(() => {
      vi.advanceTimersByTime(SHOW_DELAY_MS);
    });

    expect(result.current.isIndicatorVisible).toBe(true);

    act(() => {
      vi.advanceTimersByTime(SLOW_RESOLVE_MS - SHOW_DELAY_MS);
      resolveDb();
    });

    await act(async () => {
      await Promise.resolve();
    });

    unmount();

    act(() => {
      vi.advanceTimersByTime(MIN_DISPLAY_MS);
    });
  });

  it('does not update error state when unmounted before getDb rejects', async () => {
    let rejectDb: (err: unknown) => void = vi.fn<(err: unknown) => void>();
    const dbPromise = new Promise<IDBDatabase>((_resolve, reject) => {
      rejectDb = reject;
    });
    vi.mocked(getDb).mockReturnValue(dbPromise);

    const { unmount } = renderHook(() => useInitDb());

    unmount();

    act(() => {
      rejectDb(new Error('Rejected after unmount'));
    });

    await act(async () => {
      await Promise.resolve();
    });
  });
});
