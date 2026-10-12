import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useWindowReactivation } from './use-window-reactivation';

const THROTTLE_OFFSET_MS = 2000;
const SUB_THROTTLE_OFFSET_MS = 500;

describe('useWindowReactivation', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('initializes with current timestamp', () => {
    const initialTime = 1000000;
    vi.setSystemTime(initialTime);

    const { result } = renderHook(() => useWindowReactivation());
    expect(result.current).toBe(initialTime);
  });

  it('updates activationKey when reactivated after visibilitychange to hidden', () => {
    const initialTime = 1000000;
    vi.setSystemTime(initialTime);

    const { result } = renderHook(() => useWindowReactivation());

    act(() => {
      Object.defineProperty(document, 'visibilityState', {
        value: 'hidden',
        configurable: true,
      });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    const reactivatedTime = initialTime + THROTTLE_OFFSET_MS;
    vi.setSystemTime(reactivatedTime);

    act(() => {
      Object.defineProperty(document, 'visibilityState', {
        value: 'visible',
        configurable: true,
      });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(result.current).toBe(reactivatedTime);
  });

  it('updates activationKey when reactivated via window focus after blur', () => {
    const initialTime = 1000000;
    vi.setSystemTime(initialTime);

    const { result } = renderHook(() => useWindowReactivation());

    act(() => {
      window.dispatchEvent(new Event('blur'));
    });

    const reactivatedTime = initialTime + THROTTLE_OFFSET_MS;
    vi.setSystemTime(reactivatedTime);

    act(() => {
      Object.defineProperty(document, 'visibilityState', {
        value: 'visible',
        configurable: true,
      });
      window.dispatchEvent(new Event('focus'));
    });

    expect(result.current).toBe(reactivatedTime);
  });

  it('does not update activationKey if it was never hidden or blurred', () => {
    const initialTime = 1000000;
    vi.setSystemTime(initialTime);

    const { result } = renderHook(() => useWindowReactivation());

    act(() => {
      Object.defineProperty(document, 'visibilityState', {
        value: 'visible',
        configurable: true,
      });
      window.dispatchEvent(new Event('focus'));
    });

    expect(result.current).toBe(initialTime);
  });

  it('does not update activationKey if document is still hidden when handleReactivation is called', () => {
    const initialTime = 1000000;
    vi.setSystemTime(initialTime);

    const { result } = renderHook(() => useWindowReactivation());

    act(() => {
      window.dispatchEvent(new Event('blur'));
    });

    act(() => {
      Object.defineProperty(document, 'visibilityState', {
        value: 'hidden',
        configurable: true,
      });
      window.dispatchEvent(new Event('focus'));
    });

    expect(result.current).toBe(initialTime);
  });

  it('throttles reactivation if triggered within THROTTLE_MS', () => {
    const initialTime = 1000000;
    vi.setSystemTime(initialTime);

    const { result } = renderHook(() => useWindowReactivation());

    act(() => {
      window.dispatchEvent(new Event('blur'));
    });

    const quickTime = initialTime + SUB_THROTTLE_OFFSET_MS;
    vi.setSystemTime(quickTime);

    act(() => {
      Object.defineProperty(document, 'visibilityState', {
        value: 'visible',
        configurable: true,
      });
      window.dispatchEvent(new Event('focus'));
    });

    expect(result.current).toBe(initialTime);
  });

  it('handles pageshow event with persisted true and false', () => {
    const initialTime = 1000000;
    vi.setSystemTime(initialTime);

    const { result } = renderHook(() => useWindowReactivation());

    act(() => {
      const nonPersistedEvent = new Event('pageshow') as PageTransitionEvent;
      Object.defineProperty(nonPersistedEvent, 'persisted', { value: false });
      window.dispatchEvent(nonPersistedEvent);
    });

    expect(result.current).toBe(initialTime);

    const reactivatedTime = initialTime + THROTTLE_OFFSET_MS;
    vi.setSystemTime(reactivatedTime);

    act(() => {
      Object.defineProperty(document, 'visibilityState', {
        value: 'visible',
        configurable: true,
      });
      const persistedEvent = new Event('pageshow') as PageTransitionEvent;
      Object.defineProperty(persistedEvent, 'persisted', { value: true });
      window.dispatchEvent(persistedEvent);
    });

    expect(result.current).toBe(reactivatedTime);
  });

  it('ignores visibilitychange if visibilityState is neither hidden nor visible', () => {
    const initialTime = 1000000;
    vi.setSystemTime(initialTime);

    const { result } = renderHook(() => useWindowReactivation());

    act(() => {
      Object.defineProperty(document, 'visibilityState', {
        value: 'prerender',
        configurable: true,
      });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(result.current).toBe(initialTime);
  });

  it('cleans up event listeners on unmount', () => {
    const removeDocSpy = vi.spyOn(document, 'removeEventListener');
    const removeWinSpy = vi.spyOn(window, 'removeEventListener');

    const { unmount } = renderHook(() => useWindowReactivation());
    unmount();

    expect(removeDocSpy).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
    expect(removeWinSpy).toHaveBeenCalledWith('blur', expect.any(Function));
    expect(removeWinSpy).toHaveBeenCalledWith('focus', expect.any(Function));
    expect(removeWinSpy).toHaveBeenCalledWith('pageshow', expect.any(Function));
  });
});
