import { act, render, screen, waitFor } from '@testing-library/react';
import { useEffect, useState } from 'react';
import { createRoutesStub, Outlet } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { QuizEvent } from '../../types/quiz';
import type { Route } from './+types/route';
import { loadAllQuizEvents } from '../../helpers/load-all-quiz-events';
import { QUIZ_RESULT } from '../../types/quiz';
import Page, { meta } from './route';

vi.mock('../../helpers/load-all-quiz-events', () => ({
  loadAllQuizEvents: vi.fn(),
}));

const EXPECTED_META_COUNT = 2;
const TIMESTAMP_NOW = 1700000000000;
const TIMESTAMP_LATER = 1700000005000;
const INITIAL_ACTIVATION_KEY = 1000;
const UPDATED_ACTIVATION_KEY = 2000;
const EXPECTED_CALL_COUNT_TWICE = 2;
const SCROLL_Y_400 = 400;

function renderHiragana(initialEntries = ['/hiragana']) {
  const Stub = createRoutesStub([
    {
      path: '/hiragana',
      Component: () => <Page {...({} as unknown as Route.ComponentProps)} />,
    },
    {
      path: '/quiz',
      Component: () => null,
    },
    {
      path: '/',
      Component: () => null,
    },
  ]);
  return render(<Stub initialEntries={initialEntries} />);
}

describe('Hiragana Route', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
  });

  it('returns expected meta tags', () => {
    const tags = meta({} as unknown as Route.MetaArgs);
    expect(tags).toHaveLength(EXPECTED_META_COUNT);
    expect(tags[0]).toEqual({ title: 'Hiragana - Kana' });
  });

  it('renders all sections and updates scores from IndexedDB', async () => {
    const mockEvents: QuizEvent[] = [
      {
        glyph: 'あ',
        timestamp: TIMESTAMP_NOW,
        result: QUIZ_RESULT.CORRECT,
      },
      {
        glyph: 'あ',
        timestamp: TIMESTAMP_LATER,
        result: QUIZ_RESULT.CORRECT,
      },
      {
        glyph: 'い',
        timestamp: TIMESTAMP_NOW,
        result: QUIZ_RESULT.WRONG,
      },
    ];

    vi.mocked(loadAllQuizEvents).mockResolvedValue(mockEvents);

    renderHiragana();

    expect(screen.getByRole('heading', { level: 1, name: /hiragana/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /^Gojūon/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /^Dakuten/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /^Handakuten/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /^Yōon/i })).toBeInTheDocument();

    await waitFor(() => {
      const aLink = screen.getByRole('link', { name: /practice あ/i });
      expect(aLink).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Practice all Hiragana' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Practice Gojūon (五十音)' })).toBeInTheDocument();
      expect(
        screen.queryByRole('link', { name: 'Practice Dakuten (濁点)' })
      ).not.toBeInTheDocument();
    });
  });

  it('handles IndexedDB loading failure gracefully', async () => {
    vi.mocked(loadAllQuizEvents).mockRejectedValue(new Error('DB Failed'));

    renderHiragana();

    expect(screen.getByRole('heading', { level: 1, name: /hiragana/i })).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByRole('link', { name: /practice あ/i })).toBeInTheDocument();
      expect(screen.queryByRole('link', { name: 'Practice all Hiragana' })).not.toBeInTheDocument();
    });
  });

  it('ignores resolution after unmount', async () => {
    const { promise: eventsPromise, resolve: resolveEvents } = Promise.withResolvers<QuizEvent[]>();

    vi.mocked(loadAllQuizEvents).mockReturnValue(eventsPromise);

    const { unmount } = renderHiragana();

    unmount();
    resolveEvents([]);
    await Promise.resolve();
  });

  it('preserves initial shuffled order across multiple mounts', async () => {
    vi.mocked(loadAllQuizEvents).mockResolvedValue([]);

    const { unmount } = renderHiragana();

    await waitFor(() => {
      expect(screen.getByRole('link', { name: /practice あ/i })).toBeInTheDocument();
    });

    const initialLinks = screen
      .getAllByRole('link', { name: /^practice /i })
      .map((el) => el.getAttribute('aria-label'));

    unmount();

    renderHiragana();

    await waitFor(() => {
      expect(screen.getByRole('link', { name: /practice あ/i })).toBeInTheDocument();
    });

    const remountLinks = screen
      .getAllByRole('link', { name: /^practice /i })
      .map((el) => el.getAttribute('aria-label'));

    expect(remountLinks).toEqual(initialLinks);
  });

  it('reloads events when activationKey changes', async () => {
    vi.mocked(loadAllQuizEvents).mockResolvedValue([]);

    let setKeyFn: ((key: number) => void) | undefined = undefined;

    function Parent() {
      const [key, setKey] = useState(INITIAL_ACTIVATION_KEY);

      useEffect(() => {
        setKeyFn = setKey;
      }, []);

      return <Outlet context={{ activationKey: key }} />;
    }

    const Stub = createRoutesStub([
      {
        path: '/',
        Component: Parent,
        children: [
          {
            index: true,
            Component: () => <Page {...({} as unknown as Route.ComponentProps)} />,
          },
        ],
      },
    ]);

    render(<Stub initialEntries={['/']} />);

    await waitFor(() => {
      expect(loadAllQuizEvents).toHaveBeenCalledTimes(1);
    });

    act(() => {
      setKeyFn?.(UPDATED_ACTIVATION_KEY);
    });

    await waitFor(() => {
      expect(loadAllQuizEvents).toHaveBeenCalledTimes(EXPECTED_CALL_COUNT_TWICE);
    });
  });

  it('restores scroll position when navigating to hiragana with restoreScroll state', async () => {
    vi.mocked(loadAllQuizEvents).mockResolvedValue([]);
    Object.defineProperty(window, 'scrollY', {
      value: SCROLL_Y_400,
      configurable: true,
      writable: true,
    });

    const { unmount } = renderHiragana();
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /hiragana/i })).toBeInTheDocument();
    });

    // Simulate clicking a card to quiz
    const quizLink = screen.getByRole('link', { name: /practice あ/i });
    act(() => {
      quizLink.click();
    });

    unmount();

    // Re-render with restoreScroll state
    renderHiragana([
      {
        pathname: '/hiragana',
        state: { restoreScroll: true },
      } as unknown as string,
    ]);

    expect(window.scrollTo).toHaveBeenCalledWith(0, SCROLL_Y_400);
  });

  it('clears saved scroll position when navigating to home', async () => {
    vi.mocked(loadAllQuizEvents).mockResolvedValue([]);
    Object.defineProperty(window, 'scrollY', {
      value: SCROLL_Y_400,
      configurable: true,
      writable: true,
    });

    // Step 1: Navigate to quiz to store scroll position
    const { unmount: unmount1 } = renderHiragana();
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /hiragana/i })).toBeInTheDocument();
    });

    const quizLink = screen.getByRole('link', { name: /practice あ/i });
    act(() => {
      quizLink.click();
    });
    unmount1();

    // Step 2: Render hiragana again and click home link to clear position
    const { unmount: unmount2 } = renderHiragana();
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /hiragana/i })).toBeInTheDocument();
    });

    const homeLink = screen.getByRole('link', { name: 'Home' });
    act(() => {
      homeLink.click();
    });
    unmount2();

    // Step 3: Re-render with restoreScroll state; since it was cleared, window.scrollTo should not be called
    renderHiragana([
      {
        pathname: '/hiragana',
        state: { restoreScroll: true },
      } as unknown as string,
    ]);

    expect(window.scrollTo).not.toHaveBeenCalled();
  });
});
