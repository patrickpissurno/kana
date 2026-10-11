import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { QuizEvent } from '../../types/quiz';
import type { Route } from './+types/route';
import { loadAllQuizEvents } from '../../helpers/load-all-quiz-events';
import Page, { meta } from './route';

vi.mock('../../helpers/load-all-quiz-events', () => ({
  loadAllQuizEvents: vi.fn(),
}));

const EXPECTED_META_COUNT = 2;
const TEST_EVENT_ID_1 = 1;
const TEST_EVENT_ID_2 = 2;
const TEST_EVENT_ID_3 = 3;
const TIMESTAMP_NOW = 1700000000000;
const TIMESTAMP_LATER = 1700000005000;

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
        id: TEST_EVENT_ID_1,
        glyph: 'あ',
        timestamp: TIMESTAMP_NOW,
        result: 'correct',
      },
      {
        id: TEST_EVENT_ID_2,
        glyph: 'あ',
        timestamp: TIMESTAMP_LATER,
        result: 'correct',
      },
      {
        id: TEST_EVENT_ID_3,
        glyph: 'い',
        timestamp: TIMESTAMP_NOW,
        result: 'wrong',
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
});
