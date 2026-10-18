import { act, render, screen, waitFor } from '@testing-library/react';
import { useEffect, useState } from 'react';
import { createRoutesStub, MemoryRouter, Outlet } from 'react-router';
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

describe('Hiragana Route', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
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

    render(
      <MemoryRouter>
        <Page {...({} as unknown as Route.ComponentProps)} />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { level: 1, name: /hiragana/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /^Gojūon/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /^Dakuten/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /^Handakuten/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /^Yōon/i })).toBeInTheDocument();

    await waitFor(() => {
      const aLink = screen.getByRole('link', { name: /practice あ/i });
      expect(aLink).toBeInTheDocument();
    });
  });

  it('handles IndexedDB loading failure gracefully', async () => {
    vi.mocked(loadAllQuizEvents).mockRejectedValue(new Error('DB Failed'));

    render(
      <MemoryRouter>
        <Page {...({} as unknown as Route.ComponentProps)} />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { level: 1, name: /hiragana/i })).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByRole('link', { name: /practice あ/i })).toBeInTheDocument();
    });
  });

  it('ignores resolution after unmount', async () => {
    const { promise: eventsPromise, resolve: resolveEvents } = Promise.withResolvers<QuizEvent[]>();

    vi.mocked(loadAllQuizEvents).mockReturnValue(eventsPromise);

    const { unmount } = render(
      <MemoryRouter>
        <Page {...({} as unknown as Route.ComponentProps)} />
      </MemoryRouter>
    );

    unmount();
    resolveEvents([]);
    await Promise.resolve();
  });

  it('preserves initial shuffled order across multiple mounts', async () => {
    vi.mocked(loadAllQuizEvents).mockResolvedValue([]);

    const { unmount } = render(
      <MemoryRouter>
        <Page {...({} as unknown as Route.ComponentProps)} />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('link', { name: /practice あ/i })).toBeInTheDocument();
    });

    const initialLinks = screen
      .getAllByRole('link', { name: /^practice /i })
      .map((el) => el.getAttribute('aria-label'));

    unmount();

    render(
      <MemoryRouter>
        <Page {...({} as unknown as Route.ComponentProps)} />
      </MemoryRouter>
    );

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
});
