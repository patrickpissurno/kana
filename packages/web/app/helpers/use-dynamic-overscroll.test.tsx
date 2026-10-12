import type { ReactNode } from 'react';
import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { MemoryRouter, useNavigate } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { updateDynamicOverscroll, useDynamicOverscroll } from './use-dynamic-overscroll';

const CLIENT_HEIGHT_PX = 800;
const SCROLL_HEIGHT_SHORT_PX = 800;
const SCROLL_HEIGHT_TALL_PX = 1200;

function createRouterWrapper(initialEntry = '/') {
  return function RouterWrapper({ children }: { children: ReactNode }) {
    return <MemoryRouter initialEntries={[initialEntry]}>{children}</MemoryRouter>;
  };
}

describe('useDynamicOverscroll', () => {
  let originalScrollHeight: PropertyDescriptor | undefined = undefined;
  let originalClientHeight: PropertyDescriptor | undefined = undefined;

  beforeEach(() => {
    originalScrollHeight = Object.getOwnPropertyDescriptor(
      document.documentElement,
      'scrollHeight'
    );
    originalClientHeight = Object.getOwnPropertyDescriptor(
      document.documentElement,
      'clientHeight'
    );
    document.documentElement.style.overscrollBehaviorY = '';
  });

  afterEach(() => {
    if (originalScrollHeight) {
      Object.defineProperty(document.documentElement, 'scrollHeight', originalScrollHeight);
    }
    if (originalClientHeight) {
      Object.defineProperty(document.documentElement, 'clientHeight', originalClientHeight);
    }
    document.documentElement.style.overscrollBehaviorY = '';
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('sets overscrollBehaviorY to none when content is not scrollable', () => {
    Object.defineProperty(document.documentElement, 'scrollHeight', {
      value: SCROLL_HEIGHT_SHORT_PX,
      configurable: true,
    });
    Object.defineProperty(document.documentElement, 'clientHeight', {
      value: CLIENT_HEIGHT_PX,
      configurable: true,
    });

    updateDynamicOverscroll();
    expect(document.documentElement.style.overscrollBehaviorY).toBe('none');

    // Calling again does not re-apply when target matches
    updateDynamicOverscroll();
    expect(document.documentElement.style.overscrollBehaviorY).toBe('none');
  });

  it('sets overscrollBehaviorY to auto when content is scrollable', () => {
    Object.defineProperty(document.documentElement, 'scrollHeight', {
      value: SCROLL_HEIGHT_TALL_PX,
      configurable: true,
    });
    Object.defineProperty(document.documentElement, 'clientHeight', {
      value: CLIENT_HEIGHT_PX,
      configurable: true,
    });

    updateDynamicOverscroll();
    expect(document.documentElement.style.overscrollBehaviorY).toBe('auto');

    // Calling again does not re-apply when target matches
    updateDynamicOverscroll();
    expect(document.documentElement.style.overscrollBehaviorY).toBe('auto');
  });

  it('observes document.body and responds to window resize and ResizeObserver callback', () => {
    let capturedCallback: ResizeObserverCallback = vi.fn<ResizeObserverCallback>();
    const observeMock = vi.fn<() => void>();
    const disconnectMock = vi.fn<() => void>();

    function MockResizeObserver(this: unknown, callback: ResizeObserverCallback) {
      capturedCallback = callback;
      return {
        observe: observeMock,
        unobserve: vi.fn<() => void>(),
        disconnect: disconnectMock,
      };
    }

    vi.stubGlobal('ResizeObserver', MockResizeObserver);

    Object.defineProperty(document.documentElement, 'scrollHeight', {
      value: SCROLL_HEIGHT_SHORT_PX,
      configurable: true,
    });
    Object.defineProperty(document.documentElement, 'clientHeight', {
      value: CLIENT_HEIGHT_PX,
      configurable: true,
    });

    const { unmount } = renderHook(() => useDynamicOverscroll(), {
      wrapper: createRouterWrapper('/'),
    });

    expect(observeMock).toHaveBeenCalledWith(document.body);
    expect(document.documentElement.style.overscrollBehaviorY).toBe('none');

    // Simulate window resize becoming scrollable
    Object.defineProperty(document.documentElement, 'scrollHeight', {
      value: SCROLL_HEIGHT_TALL_PX,
      configurable: true,
    });

    act(() => {
      window.dispatchEvent(new Event('resize'));
    });
    expect(document.documentElement.style.overscrollBehaviorY).toBe('auto');

    // Simulate content resizing back via ResizeObserver callback
    Object.defineProperty(document.documentElement, 'scrollHeight', {
      value: SCROLL_HEIGHT_SHORT_PX,
      configurable: true,
    });

    act(() => {
      capturedCallback([], {} as ResizeObserver);
    });
    expect(document.documentElement.style.overscrollBehaviorY).toBe('none');

    // Unmount cleans up
    unmount();
    expect(disconnectMock).toHaveBeenCalled();
    expect(document.documentElement.style.overscrollBehaviorY).toBe('');
  });

  it('updates when route location changes', () => {
    Object.defineProperty(document.documentElement, 'scrollHeight', {
      value: SCROLL_HEIGHT_SHORT_PX,
      configurable: true,
    });
    Object.defineProperty(document.documentElement, 'clientHeight', {
      value: CLIENT_HEIGHT_PX,
      configurable: true,
    });

    function TestConsumer() {
      useDynamicOverscroll();
      const navigate = useNavigate();
      return (
        <button
          type="button"
          onClick={() => {
            const result = navigate('/hiragana');
            if (result instanceof Promise) {
              result.catch(() => undefined);
            }
          }}
        >
          Navigate
        </button>
      );
    }

    render(
      <MemoryRouter initialEntries={['/']}>
        <TestConsumer />
      </MemoryRouter>
    );

    expect(document.documentElement.style.overscrollBehaviorY).toBe('none');

    Object.defineProperty(document.documentElement, 'scrollHeight', {
      value: SCROLL_HEIGHT_TALL_PX,
      configurable: true,
    });

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Navigate' }));
    });

    expect(document.documentElement.style.overscrollBehaviorY).toBe('auto');
  });
});
