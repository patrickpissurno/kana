import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Route } from './+types/route';
import { appendQuizEvent } from '../../helpers/append-quiz-event';
import { updateQuizEvent } from '../../helpers/update-quiz-event';
import Page, { meta } from './route';

vi.mock('../../helpers/append-quiz-event', () => ({
  appendQuizEvent: vi.fn(),
}));

vi.mock('../../helpers/update-quiz-event', () => ({
  updateQuizEvent: vi.fn(),
}));

const EXPECTED_META_COUNT = 2;
const TEST_EVENT_ID = 42;
const CALL_COUNT_ONE = 1;
const CALL_COUNT_ZERO = 0;

describe('Quiz Route', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns expected meta tags', () => {
    const tags = meta({} as unknown as Route.MetaArgs);
    expect(tags).toHaveLength(EXPECTED_META_COUNT);
    expect(tags[0]).toEqual({ title: 'Quiz - Kana' });
  });

  it('renders invalid glyph state when glyph is not found', () => {
    render(
      <MemoryRouter initialEntries={['/quiz?glyph=invalid']}>
        <Page {...({} as unknown as Route.ComponentProps)} />
      </MemoryRouter>
    );

    expect(
      screen.getByRole('heading', { level: 1, name: /character not found/i })
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /return to hiragana/i })).toHaveAttribute(
      'href',
      '/hiragana'
    );
    expect(appendQuizEvent).toHaveBeenCalledTimes(CALL_COUNT_ZERO);
  });

  it('renders invalid glyph state when glyph parameter is missing', () => {
    render(
      <MemoryRouter initialEntries={['/quiz']}>
        <Page {...({} as unknown as Route.ComponentProps)} />
      </MemoryRouter>
    );

    expect(
      screen.getByRole('heading', { level: 1, name: /character not found/i })
    ).toBeInTheDocument();
  });

  it('logs skipped event on load and updates to correct upon correct answer', async () => {
    const user = userEvent.setup();
    vi.mocked(appendQuizEvent).mockResolvedValue(TEST_EVENT_ID);
    vi.mocked(updateQuizEvent).mockResolvedValue();

    render(
      <MemoryRouter initialEntries={['/quiz?glyph=あ']}>
        <Page {...({} as unknown as Route.ComponentProps)} />
      </MemoryRouter>
    );

    expect(appendQuizEvent).toHaveBeenCalledWith('あ');

    const input = screen.getByRole('textbox', { name: /romaji input/i });
    const submitBtn = screen.getByRole('button', { name: /submit/i });

    await user.type(input, 'a');
    await user.click(submitBtn);

    await waitFor(() => {
      expect(updateQuizEvent).toHaveBeenCalledWith(TEST_EVENT_ID, 'correct');
    });

    expect(screen.getByText('Correct!')).toBeInTheDocument();
  });

  it('updates to wrong upon wrong answer', async () => {
    const user = userEvent.setup();
    vi.mocked(appendQuizEvent).mockResolvedValue(TEST_EVENT_ID);
    vi.mocked(updateQuizEvent).mockResolvedValue();

    render(
      <MemoryRouter initialEntries={['/quiz?glyph=あ']}>
        <Page {...({} as unknown as Route.ComponentProps)} />
      </MemoryRouter>
    );

    const input = screen.getByRole('textbox', { name: /romaji input/i });
    const submitBtn = screen.getByRole('button', { name: /submit/i });

    await user.type(input, 'wrong');
    await user.click(submitBtn);

    await waitFor(() => {
      expect(updateQuizEvent).toHaveBeenCalledWith(TEST_EVENT_ID, 'wrong');
    });

    expect(screen.getByText(/the reading is/i)).toBeInTheDocument();
  });

  it('handles appendQuizEvent failure gracefully for correct answer', async () => {
    const user = userEvent.setup();
    vi.mocked(appendQuizEvent).mockRejectedValue(new Error('Append error'));
    vi.mocked(updateQuizEvent).mockResolvedValue();

    render(
      <MemoryRouter initialEntries={['/quiz?glyph=あ']}>
        <Page {...({} as unknown as Route.ComponentProps)} />
      </MemoryRouter>
    );

    const input = screen.getByRole('textbox', { name: /romaji input/i });
    const submitBtn = screen.getByRole('button', { name: /submit/i });

    await user.type(input, 'a');
    await user.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Correct!')).toBeInTheDocument();
    });

    expect(updateQuizEvent).toHaveBeenCalledTimes(CALL_COUNT_ZERO);
  });

  it('handles appendQuizEvent failure gracefully for wrong answer', async () => {
    const user = userEvent.setup();
    vi.mocked(appendQuizEvent).mockRejectedValue(new Error('Append error'));
    vi.mocked(updateQuizEvent).mockResolvedValue();

    render(
      <MemoryRouter initialEntries={['/quiz?glyph=あ']}>
        <Page {...({} as unknown as Route.ComponentProps)} />
      </MemoryRouter>
    );

    const input = screen.getByRole('textbox', { name: /romaji input/i });
    const submitBtn = screen.getByRole('button', { name: /submit/i });

    await user.type(input, 'wrong');
    await user.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/the reading is/i)).toBeInTheDocument();
    });

    expect(updateQuizEvent).toHaveBeenCalledTimes(CALL_COUNT_ZERO);
  });

  it('handles updateQuizEvent rejection gracefully for correct answer', async () => {
    const user = userEvent.setup();
    vi.mocked(appendQuizEvent).mockResolvedValue(TEST_EVENT_ID);
    vi.mocked(updateQuizEvent).mockRejectedValue(new Error('Update error'));

    render(
      <MemoryRouter initialEntries={['/quiz?glyph=あ']}>
        <Page {...({} as unknown as Route.ComponentProps)} />
      </MemoryRouter>
    );

    const input = screen.getByRole('textbox', { name: /romaji input/i });
    const submitBtn = screen.getByRole('button', { name: /submit/i });

    await user.type(input, 'a');
    await user.click(submitBtn);

    await waitFor(() => {
      expect(updateQuizEvent).toHaveBeenCalledTimes(CALL_COUNT_ONE);
    });
  });

  it('handles updateQuizEvent rejection gracefully for wrong answer', async () => {
    const user = userEvent.setup();
    vi.mocked(appendQuizEvent).mockResolvedValue(TEST_EVENT_ID);
    vi.mocked(updateQuizEvent).mockRejectedValue(new Error('Update error'));

    render(
      <MemoryRouter initialEntries={['/quiz?glyph=あ']}>
        <Page {...({} as unknown as Route.ComponentProps)} />
      </MemoryRouter>
    );

    const input = screen.getByRole('textbox', { name: /romaji input/i });
    const submitBtn = screen.getByRole('button', { name: /submit/i });

    await user.type(input, 'wrong');
    await user.click(submitBtn);

    await waitFor(() => {
      expect(updateQuizEvent).toHaveBeenCalledTimes(CALL_COUNT_ONE);
    });
  });
});
