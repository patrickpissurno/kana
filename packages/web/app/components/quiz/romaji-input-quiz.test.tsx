import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { RomajiInputQuiz } from './romaji-input-quiz';

const CALL_COUNT_ZERO = 0;
const CALL_COUNT_ONE = 1;

describe('RomajiInputQuiz', () => {
  it('renders a single-char glyph and handles correct submission', async () => {
    const user = userEvent.setup();
    const handleCorrect = vi.fn<() => void>();
    const handleWrong = vi.fn<() => void>();

    render(
      <MemoryRouter>
        <RomajiInputQuiz glyph="あ" onCorrectAnswer={handleCorrect} onWrongAnswer={handleWrong} />
      </MemoryRouter>
    );

    const glyphDisplay = screen.getByText('あ');
    expect(glyphDisplay).toHaveClass('text-7xl');

    const input = screen.getByRole('textbox', { name: /romaji input/i });
    expect(input).toBeInTheDocument();
    expect(input).not.toBeDisabled();

    const submitButton = screen.getByRole('button', { name: /submit/i });
    expect(submitButton).toBeInTheDocument();

    await user.type(input, '  A  ');
    await user.click(submitButton);

    expect(handleCorrect).toHaveBeenCalledTimes(CALL_COUNT_ONE);
    expect(handleWrong).toHaveBeenCalledTimes(CALL_COUNT_ZERO);
    expect(screen.getByText('Correct!')).toBeInTheDocument();

    const continueLink = screen.getByRole('link', { name: /continue/i });
    expect(continueLink).toBeInTheDocument();
    expect(continueLink).toHaveAttribute('href', '/hiragana');
    expect(input).toBeDisabled();
    expect(screen.queryByRole('button', { name: /submit/i })).not.toBeInTheDocument();
  });

  it('renders a digraph glyph and handles wrong submission', async () => {
    const user = userEvent.setup();
    const handleCorrect = vi.fn<() => void>();
    const handleWrong = vi.fn<() => void>();

    render(
      <MemoryRouter>
        <RomajiInputQuiz glyph="きゃ" onCorrectAnswer={handleCorrect} onWrongAnswer={handleWrong} />
      </MemoryRouter>
    );

    const glyphDisplay = screen.getByText('きゃ');
    expect(glyphDisplay).toHaveClass('text-6xl');

    const input = screen.getByRole('textbox', { name: /romaji input/i });
    await user.type(input, 'ka');
    await user.click(screen.getByRole('button', { name: /submit/i }));

    expect(handleWrong).toHaveBeenCalledTimes(CALL_COUNT_ONE);
    expect(handleCorrect).toHaveBeenCalledTimes(CALL_COUNT_ZERO);
    expect(screen.getByText(/the reading is/i)).toBeInTheDocument();
    expect(screen.getByText('kya')).toBeInTheDocument();

    const continueLink = screen.getByRole('link', { name: /continue/i });
    expect(continueLink).toBeInTheDocument();
    expect(continueLink).toHaveAttribute('href', '/hiragana');
  });

  it('prevents re-submission if already answered', async () => {
    const user = userEvent.setup();
    const handleCorrect = vi.fn<() => void>();
    const handleWrong = vi.fn<() => void>();

    const { container } = render(
      <MemoryRouter>
        <RomajiInputQuiz glyph="い" onCorrectAnswer={handleCorrect} onWrongAnswer={handleWrong} />
      </MemoryRouter>
    );

    const input = screen.getByRole('textbox', { name: /romaji input/i });
    await user.type(input, 'i');
    await user.click(screen.getByRole('button', { name: /submit/i }));

    expect(handleCorrect).toHaveBeenCalledTimes(CALL_COUNT_ONE);

    // Manually trigger submit event on form when state is already answered
    const form = container.querySelector('form');
    if (form) {
      fireEvent.submit(form);
    }

    expect(handleCorrect).toHaveBeenCalledTimes(CALL_COUNT_ONE);
  });

  it('handles empty or non-string form data and unknown glyph fallback', () => {
    const handleCorrect = vi.fn<() => void>();
    const handleWrong = vi.fn<() => void>();

    const { container } = render(
      <MemoryRouter>
        <RomajiInputQuiz glyph="?" onCorrectAnswer={handleCorrect} onWrongAnswer={handleWrong} />
      </MemoryRouter>
    );

    const form = container.querySelector('form');
    expect(form).toBeInTheDocument();

    // Remove the input so formData.get('romaji') returns null
    const input = screen.getByRole('textbox', { name: /romaji input/i });
    input.remove();

    if (form) {
      fireEvent.submit(form);
    }

    // Since '?' is unknown, canonicalRomaji is '', and missing input yields ''
    expect(handleCorrect).toHaveBeenCalledTimes(CALL_COUNT_ONE);
    expect(handleWrong).toHaveBeenCalledTimes(CALL_COUNT_ZERO);
  });
});
