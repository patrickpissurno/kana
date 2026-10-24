import { act, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Route } from './+types/route';
import { appendQuizEvent } from '../../helpers/append-quiz-event';
import { loadLearnedGlyphs } from '../../helpers/load-learned-glyphs';
import { updateQuizEvent } from '../../helpers/update-quiz-event';
import Page, { meta } from './route';

const EXPECTED_META_COUNT = 2;
const MOCK_TIMESTAMP = 1_700_000_000_000;
const SUCCESS_COUNTDOWN_MS = 3000;
const ERROR_COUNTDOWN_MS = 5000;

vi.mock('../../helpers/load-learned-glyphs', () => ({
  loadLearnedGlyphs: vi.fn<() => Promise<string[]>>(),
}));

vi.mock('../../helpers/append-quiz-event', () => ({
  appendQuizEvent: vi.fn<() => Promise<number>>(),
}));

vi.mock('../../helpers/update-quiz-event', () => ({
  updateQuizEvent: vi.fn<() => Promise<void>>(),
}));

describe('Practice Route', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.useFakeTimers();
    vi.mocked(appendQuizEvent).mockResolvedValue(MOCK_TIMESTAMP);
    vi.mocked(updateQuizEvent).mockResolvedValue(undefined);
  });

  it('returns expected meta tags', () => {
    const tags = meta({} as unknown as Route.MetaArgs);
    expect(tags).toHaveLength(EXPECTED_META_COUNT);
    expect(tags[0]).toEqual({ title: 'Practice - Kana' });
  });

  it('renders not found when kind parameter is missing', () => {
    render(
      <MemoryRouter initialEntries={['/practice']}>
        <Page {...({} as unknown as Route.ComponentProps)} />
      </MemoryRouter>
    );

    expect(
      screen.getByRole('heading', { level: 1, name: 'Practice Not Found' })
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Return to Hiragana' })).toHaveAttribute(
      'href',
      '/hiragana'
    );
  });

  it('renders not found when kind is invalid', () => {
    render(
      <MemoryRouter initialEntries={['/practice?kind=katakana']}>
        <Page {...({} as unknown as Route.ComponentProps)} />
      </MemoryRouter>
    );

    expect(
      screen.getByRole('heading', { level: 1, name: 'Practice Not Found' })
    ).toBeInTheDocument();
  });

  it('renders not found when section is invalid', () => {
    render(
      <MemoryRouter initialEntries={['/practice?kind=hiragana&section=unknown_sec']}>
        <Page {...({} as unknown as Route.ComponentProps)} />
      </MemoryRouter>
    );

    expect(
      screen.getByRole('heading', { level: 1, name: 'Practice Not Found' })
    ).toBeInTheDocument();
  });

  it('shows loading and then empty state when no glyphs have been learned', async () => {
    const { promise, resolve } = Promise.withResolvers<string[]>();
    vi.mocked(loadLearnedGlyphs).mockReturnValue(promise);

    render(
      <MemoryRouter initialEntries={['/practice?kind=hiragana&section=gojuon']}>
        <Page {...({} as unknown as Route.ComponentProps)} />
      </MemoryRouter>
    );

    expect(screen.getByText('Loading practice session...')).toBeInTheDocument();

    await act(async () => {
      resolve([]);
      await Promise.resolve();
    });

    expect(
      screen.getByRole('heading', { level: 1, name: 'No Characters to Practice' })
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Return to Hiragana' })).toHaveAttribute(
      'href',
      '/hiragana'
    );
  });

  it('handles loadLearnedGlyphs rejection gracefully by showing empty state', async () => {
    vi.mocked(loadLearnedGlyphs).mockRejectedValue(new Error('IDB error'));

    render(
      <MemoryRouter initialEntries={['/practice?kind=hiragana&section=gojuon']}>
        <Page {...({} as unknown as Route.ComponentProps)} />
      </MemoryRouter>
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(
      screen.getByRole('heading', { level: 1, name: 'No Characters to Practice' })
    ).toBeInTheDocument();
  });

  it('ignores resolution when component unmounts before load completes', async () => {
    const { promise, resolve } = Promise.withResolvers<string[]>();
    vi.mocked(loadLearnedGlyphs).mockReturnValue(promise);

    const { unmount } = render(
      <MemoryRouter initialEntries={['/practice?kind=hiragana']}>
        <Page {...({} as unknown as Route.ComponentProps)} />
      </MemoryRouter>
    );

    act(() => {
      unmount();
    });

    await act(async () => {
      resolve(['あ']);
      await Promise.resolve();
    });
  });

  it('ignores rejection when component unmounts before load completes', async () => {
    const { promise, reject } = Promise.withResolvers<string[]>();
    vi.mocked(loadLearnedGlyphs).mockReturnValue(promise);

    const { unmount } = render(
      <MemoryRouter initialEntries={['/practice?kind=hiragana']}>
        <Page {...({} as unknown as Route.ComponentProps)} />
      </MemoryRouter>
    );

    act(() => {
      unmount();
    });

    await act(async () => {
      reject(new Error('IDB fail after unmount'));
      await Promise.resolve();
    });
  });

  it('progresses through questions and displays results on completion for section scope', async () => {
    vi.mocked(loadLearnedGlyphs).mockResolvedValue(['あ', 'い']);

    render(
      <MemoryRouter initialEntries={['/practice?kind=hiragana&section=gojuon']}>
        <Page {...({} as unknown as Route.ComponentProps)} />
      </MemoryRouter>
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByText('Question 1 of 2')).toBeInTheDocument();

    // Answer first question with wrong option
    const allButtonsQ1 = screen.getAllByRole('button');
    const wrongOption =
      allButtonsQ1.find((btn) => btn.getAttribute('aria-label') !== 'Option あ') ??
      allButtonsQ1[0]!;
    act(() => {
      wrongOption.click();
    });

    await act(async () => {
      await Promise.resolve();
    });

    act(() => {
      vi.advanceTimersByTime(ERROR_COUNTDOWN_MS);
    });

    // Advance to question 2
    expect(screen.getByText('Question 2 of 2')).toBeInTheDocument();
    expect(appendQuizEvent).toHaveBeenCalledWith('あ');
    expect(updateQuizEvent).toHaveBeenCalled();

    const allButtonsQ2 = screen.getAllByRole('button');
    const secondOption = allButtonsQ2[0]!;
    act(() => {
      secondOption.click();
    });

    act(() => {
      vi.advanceTimersByTime(ERROR_COUNTDOWN_MS);
    });

    // Practice complete results screen
    expect(
      screen.getByRole('heading', { level: 1, name: 'Practice complete' })
    ).toBeInTheDocument();
    expect(screen.getByText('Total questions')).toBeInTheDocument();
  });

  it('progresses through questions for all-hiragana scope with correct answers', async () => {
    vi.mocked(loadLearnedGlyphs).mockResolvedValue(['あ']);

    render(
      <MemoryRouter initialEntries={['/practice?kind=hiragana']}>
        <Page {...({} as unknown as Route.ComponentProps)} />
      </MemoryRouter>
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByText('Question 1 of 1')).toBeInTheDocument();

    const correctButton = screen.getByRole('button', { name: 'Option あ' });
    act(() => {
      correctButton.click();
    });

    act(() => {
      vi.advanceTimersByTime(SUCCESS_COUNTDOWN_MS);
    });

    expect(
      screen.getByRole('heading', { level: 1, name: 'Practice complete' })
    ).toBeInTheDocument();
  });
});
