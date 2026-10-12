import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { BeforeInstallPromptEvent } from './use-pwa-install';
import { isIos, isStandalone, usePwaInstall } from './use-pwa-install';

describe('isIos', () => {
  const originalUserAgent = navigator.userAgent;
  const originalMaxTouchPoints = navigator.maxTouchPoints;

  afterEach(() => {
    Object.defineProperty(navigator, 'userAgent', {
      value: originalUserAgent,
      configurable: true,
    });
    Object.defineProperty(navigator, 'maxTouchPoints', {
      value: originalMaxTouchPoints,
      configurable: true,
    });
  });

  it('detects iPhone/iPad user agent via global navigator', () => {
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)',
      configurable: true,
    });
    expect(isIos()).toBe(true);
  });

  it('detects iPadOS reporting as Macintosh with multi-touch via passed navigator', () => {
    const mockNav = {
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      maxTouchPoints: 5,
    } as Navigator;
    expect(isIos(mockNav)).toBe(true);
  });

  it('returns false for desktop Mac with no touch points', () => {
    const mockNav = {
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      maxTouchPoints: 0,
    } as Navigator;
    expect(isIos(mockNav)).toBe(false);
  });

  it('returns false for Android user agent', () => {
    const mockNav = {
      userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7)',
      maxTouchPoints: 0,
    } as Navigator;
    expect(isIos(mockNav)).toBe(false);
  });

  it('returns false when nav is null', () => {
    expect(isIos(null)).toBe(false);
  });

  it('returns false when navigator is undefined', () => {
    vi.stubGlobal('navigator', undefined);
    expect(isIos()).toBe(false);
    vi.unstubAllGlobals();
  });
});

describe('isStandalone', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns true when display-mode standalone matches via default window', () => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query === '(display-mode: standalone)',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    expect(isStandalone()).toBe(true);
  });

  it('returns true when navigator.standalone is true', () => {
    const mockWin = {
      matchMedia: vi.fn().mockReturnValue({ matches: false }),
    } as unknown as Window;
    const mockNav = { standalone: true } as unknown as Navigator;

    expect(isStandalone(mockWin, mockNav)).toBe(true);
  });

  it('returns false when matchMedia is not a function and navigator.standalone is false', () => {
    const mockWin = {} as Window;
    const mockNav = { standalone: false } as unknown as Navigator;

    expect(isStandalone(mockWin, mockNav)).toBe(false);
  });

  it('returns false when neither matchMedia nor navigator.standalone is active', () => {
    const mockWin = {
      matchMedia: vi.fn().mockReturnValue({ matches: false }),
    } as unknown as Window;
    const mockNav = { standalone: false } as unknown as Navigator;

    expect(isStandalone(mockWin, mockNav)).toBe(false);
  });

  it('returns false when win is null', () => {
    expect(isStandalone(null)).toBe(false);
  });

  it('handles null nav when win is provided', () => {
    const mockWin = {
      matchMedia: vi.fn().mockReturnValue({ matches: false }),
    } as unknown as Window;
    expect(isStandalone(mockWin, null)).toBe(false);
  });

  it('returns false when window is undefined', () => {
    vi.stubGlobal('window', undefined);
    expect(isStandalone()).toBe(false);
    vi.unstubAllGlobals();
  });

  it('handles undefined navigator with default window', () => {
    vi.stubGlobal('navigator', undefined);
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query === '(display-mode: standalone)',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
    expect(isStandalone()).toBe(true);
    vi.unstubAllGlobals();
  });
});

describe('usePwaInstall', () => {
  let promptMock = vi.fn<() => Promise<void>>();
  let userChoiceResolve:
    | ((choice: { outcome: 'accepted' | 'dismissed'; platform: string }) => void)
    | undefined = undefined;

  beforeEach(() => {
    promptMock = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);
  });

  function createMockBeforeInstallPromptEvent(): BeforeInstallPromptEvent {
    const event = new Event('beforeinstallprompt');
    const userChoicePromise = new Promise<{
      outcome: 'accepted' | 'dismissed';
      platform: string;
    }>((resolve) => {
      userChoiceResolve = resolve;
    });

    Object.defineProperty(event, 'prompt', { value: promptMock });
    Object.defineProperty(event, 'userChoice', { value: userChoicePromise });
    Object.defineProperty(event, 'platforms', { value: ['web'] });

    return event as unknown as BeforeInstallPromptEvent;
  }

  it('initializes with canInstall as false and noops install when promptEvent is null', async () => {
    const { result } = renderHook(() => usePwaInstall());
    expect(result.current.canInstall).toBe(false);

    await act(async () => {
      await result.current.install();
    });
    expect(promptMock).not.toHaveBeenCalled();
  });

  it('captures beforeinstallprompt event and installs successfully when accepted', async () => {
    const { result } = renderHook(() => usePwaInstall());

    const event = createMockBeforeInstallPromptEvent();
    const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

    act(() => {
      window.dispatchEvent(event);
    });

    expect(preventDefaultSpy).toHaveBeenCalledTimes(1);
    expect(result.current.canInstall).toBe(true);

    let installPromise: Promise<void> | undefined = undefined;
    act(() => {
      installPromise = result.current.install();
    });

    expect(promptMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      userChoiceResolve?.({ outcome: 'accepted', platform: 'web' });
      await installPromise;
    });

    expect(result.current.canInstall).toBe(false);
  });

  it('handles user dismissing the install prompt', async () => {
    const { result } = renderHook(() => usePwaInstall());

    const event = createMockBeforeInstallPromptEvent();
    act(() => {
      window.dispatchEvent(event);
    });
    expect(result.current.canInstall).toBe(true);

    let installPromise: Promise<void> | undefined = undefined;
    act(() => {
      installPromise = result.current.install();
    });

    await act(async () => {
      userChoiceResolve?.({ outcome: 'dismissed', platform: 'web' });
      await installPromise;
    });

    expect(result.current.canInstall).toBe(false);
  });

  it('handles appinstalled event', () => {
    const { result } = renderHook(() => usePwaInstall());

    const event = createMockBeforeInstallPromptEvent();
    act(() => {
      window.dispatchEvent(event);
    });
    expect(result.current.canInstall).toBe(true);

    act(() => {
      window.dispatchEvent(new Event('appinstalled'));
    });

    expect(result.current.canInstall).toBe(false);
  });

  it('cleans up event listeners on unmount', () => {
    const removeWinSpy = vi.spyOn(window, 'removeEventListener');

    const { unmount } = renderHook(() => usePwaInstall());
    unmount();

    expect(removeWinSpy).toHaveBeenCalledWith('beforeinstallprompt', expect.any(Function));
    expect(removeWinSpy).toHaveBeenCalledWith('appinstalled', expect.any(Function));
  });
});
