import { fireEvent, render, screen } from '@testing-library/react';
import { createRoutesStub, useNavigate } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { UsePreserveScrollPositionProps } from './use-preserve-scroll-position';
import {
  getScrollPositionForTesting,
  resetScrollPositionsForTesting,
  usePreserveScrollPosition,
} from './use-preserve-scroll-position';

const TEST_KEY = 'test-key';
const SCROLL_Y_500 = 500;
const SCROLL_Y_0 = 0;

function safeNavigate(navigate: ReturnType<typeof useNavigate>, to: string): void {
  const result = navigate(to);
  if (result instanceof Promise) {
    result.catch(() => undefined);
  }
}

describe('usePreserveScrollPosition', () => {
  beforeEach(() => {
    resetScrollPositionsForTesting();
    vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
  });

  it('saves scroll position when shouldSave returns true on navigation', () => {
    Object.defineProperty(window, 'scrollY', {
      value: SCROLL_Y_500,
      configurable: true,
      writable: true,
    });

    function SourceComponent() {
      const config: UsePreserveScrollPositionProps = {
        key: TEST_KEY,
        shouldSave: (next) => next.pathname === '/quiz',
        shouldClear: (next) => next.pathname === '/home',
      };
      usePreserveScrollPosition(config);
      const navigate = useNavigate();
      return (
        <button type="button" onClick={() => safeNavigate(navigate, '/quiz')}>
          Go Quiz
        </button>
      );
    }

    const Stub = createRoutesStub([
      { path: '/source', Component: SourceComponent },
      { path: '/quiz', Component: () => null },
    ]);

    render(<Stub initialEntries={['/source']} />);

    expect(getScrollPositionForTesting(TEST_KEY)).toBeUndefined();

    fireEvent.click(screen.getByRole('button', { name: 'Go Quiz' }));

    expect(getScrollPositionForTesting(TEST_KEY)).toBe(SCROLL_Y_500);
  });

  it('clears scroll position when shouldClear returns true on navigation', () => {
    Object.defineProperty(window, 'scrollY', {
      value: SCROLL_Y_500,
      configurable: true,
      writable: true,
    });

    function SourceComponent() {
      const config: UsePreserveScrollPositionProps = {
        key: TEST_KEY,
        shouldSave: (next) => next.pathname === '/quiz',
        shouldClear: (next) => next.pathname === '/home',
      };
      usePreserveScrollPosition(config);
      const navigate = useNavigate();
      return (
        <>
          <button type="button" onClick={() => safeNavigate(navigate, '/quiz')}>
            Go Quiz
          </button>
          <button type="button" onClick={() => safeNavigate(navigate, '/home')}>
            Go Home
          </button>
        </>
      );
    }

    const Stub = createRoutesStub([
      { path: '/source', Component: SourceComponent },
      { path: '/quiz', Component: () => null },
      { path: '/home', Component: () => null },
    ]);

    render(<Stub initialEntries={['/source']} />);

    fireEvent.click(screen.getByRole('button', { name: 'Go Quiz' }));
    expect(getScrollPositionForTesting(TEST_KEY)).toBe(SCROLL_Y_500);

    // Re-render source and navigate to clear target
    render(<Stub initialEntries={['/source']} />);
    fireEvent.click(screen.getByRole('button', { name: 'Go Home' }));
    expect(getScrollPositionForTesting(TEST_KEY)).toBeUndefined();
  });

  it('does not save or clear when neither condition matches', () => {
    Object.defineProperty(window, 'scrollY', {
      value: SCROLL_Y_500,
      configurable: true,
      writable: true,
    });

    function SourceComponent() {
      const config: UsePreserveScrollPositionProps = {
        key: TEST_KEY,
        shouldSave: (next) => next.pathname === '/quiz',
        shouldClear: (next) => next.pathname === '/home',
      };
      usePreserveScrollPosition(config);
      const navigate = useNavigate();
      return (
        <button type="button" onClick={() => safeNavigate(navigate, '/other')}>
          Go Other
        </button>
      );
    }

    const Stub = createRoutesStub([
      { path: '/source', Component: SourceComponent },
      { path: '/other', Component: () => null },
    ]);

    render(<Stub initialEntries={['/source']} />);

    fireEvent.click(screen.getByRole('button', { name: 'Go Other' }));

    expect(getScrollPositionForTesting(TEST_KEY)).toBeUndefined();
  });

  it('restores saved scroll position when location.state has restoreScroll = true', () => {
    Object.defineProperty(window, 'scrollY', {
      value: SCROLL_Y_500,
      configurable: true,
      writable: true,
    });

    function SourceComponent() {
      const config: UsePreserveScrollPositionProps = {
        key: TEST_KEY,
        shouldSave: (next) => next.pathname === '/destination',
        shouldClear: () => false,
      };
      usePreserveScrollPosition(config);
      const navigate = useNavigate();
      return (
        <button type="button" onClick={() => safeNavigate(navigate, '/destination')}>
          Go Dest
        </button>
      );
    }

    function DestinationComponent() {
      const config: UsePreserveScrollPositionProps = {
        key: TEST_KEY,
        shouldSave: () => false,
        shouldClear: () => false,
      };
      usePreserveScrollPosition(config);
      return null;
    }

    const Stub = createRoutesStub([
      { path: '/source', Component: SourceComponent },
      { path: '/destination', Component: DestinationComponent },
    ]);

    render(<Stub initialEntries={['/source']} />);

    fireEvent.click(screen.getByRole('button', { name: 'Go Dest' }));

    // Render destination with restoreScroll state
    render(
      <Stub
        initialEntries={[
          {
            pathname: '/destination',
            state: { restoreScroll: true },
          },
        ]}
      />
    );

    expect(window.scrollTo).toHaveBeenCalledWith(0, SCROLL_Y_500);
  });

  it('does not restore scroll position when restoreScroll state is absent or false', () => {
    function DestinationComponent() {
      const config: UsePreserveScrollPositionProps = {
        key: TEST_KEY,
        shouldSave: () => false,
        shouldClear: () => false,
      };
      usePreserveScrollPosition(config);
      return null;
    }

    const Stub = createRoutesStub([{ path: '/destination', Component: DestinationComponent }]);

    // No state
    render(<Stub initialEntries={['/destination']} />);
    expect(window.scrollTo).not.toHaveBeenCalled();

    // False state
    render(
      <Stub
        initialEntries={[
          {
            pathname: '/destination',
            state: { restoreScroll: false },
          },
        ]}
      />
    );
    expect(window.scrollTo).not.toHaveBeenCalled();

    // Non-object state (e.g. primitive string)
    render(
      <Stub
        initialEntries={[
          {
            pathname: '/destination',
            state: 'unexpected-state',
          },
        ]}
      />
    );
    expect(window.scrollTo).not.toHaveBeenCalled();
  });

  it('does not restore scroll position when saved value is 0 or undefined', () => {
    function DestinationComponent() {
      const config: UsePreserveScrollPositionProps = {
        key: TEST_KEY,
        shouldSave: () => false,
        shouldClear: () => false,
      };
      usePreserveScrollPosition(config);
      return null;
    }

    const Stub = createRoutesStub([{ path: '/destination', Component: DestinationComponent }]);

    // When nothing is in the map (undefined)
    render(
      <Stub
        initialEntries={[
          {
            pathname: '/destination',
            state: { restoreScroll: true },
          },
        ]}
      />
    );
    expect(window.scrollTo).not.toHaveBeenCalled();

    // When saved position is 0
    Object.defineProperty(window, 'scrollY', {
      value: SCROLL_Y_0,
      configurable: true,
      writable: true,
    });

    function SourceComponent() {
      const config: UsePreserveScrollPositionProps = {
        key: TEST_KEY,
        shouldSave: () => true,
        shouldClear: () => false,
      };
      usePreserveScrollPosition(config);
      const navigate = useNavigate();
      return (
        <button type="button" onClick={() => safeNavigate(navigate, '/destination')}>
          Go Dest
        </button>
      );
    }

    const StubWithZero = createRoutesStub([
      { path: '/source', Component: SourceComponent },
      { path: '/destination', Component: DestinationComponent },
    ]);

    render(<StubWithZero initialEntries={['/source']} />);
    fireEvent.click(screen.getByRole('button', { name: 'Go Dest' }));

    render(
      <StubWithZero
        initialEntries={[
          {
            pathname: '/destination',
            state: { restoreScroll: true },
          },
        ]}
      />
    );
    expect(window.scrollTo).not.toHaveBeenCalled();
  });
});
