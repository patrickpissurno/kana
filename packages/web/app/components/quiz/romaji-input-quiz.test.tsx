import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { RomajiInputQuiz } from './romaji-input-quiz';

const CALL_COUNT_ZERO = 0;
const CALL_COUNT_ONE = 1;

describe('RomajiInputQuiz', () => {
  it('disables submit button when input is blank and enables when typed', async () => {
    const user = userEvent.setup();
    const handleCorrect = vi.fn<() => void>();
    const handleWrong = vi.fn<() => void>();

    render(
      <MemoryRouter>
        <RomajiInputQuiz glyph="あ" onCorrectAnswer={handleCorrect} onWrongAnswer={handleWrong} />
      </MemoryRouter>
    );

    const input = screen.getByRole('textbox', { name: /romaji input/i });
    const submitButton = screen.getByRole('button', { name: /submit/i });

    // Initially blank -> disabled
    expect(submitButton).toBeDisabled();

    // Type spaces only -> remains disabled
    await user.type(input, '   ');
    expect(submitButton).toBeDisabled();

    // Blur on whitespace -> trims value to empty
    fireEvent.blur(input);
    expect(input).toHaveValue('');
    expect(submitButton).toBeDisabled();

    // Type valid text -> becomes enabled
    await user.type(input, ' a ');
    expect(submitButton).not.toBeDisabled();

    // Blur on valid text -> trims value
    fireEvent.blur(input);
    expect(input).toHaveValue('a');
    expect(submitButton).not.toBeDisabled();
  });

  it('renders a single-char glyph and handles correct submission with state theming', async () => {
    const user = userEvent.setup();
    const handleCorrect = vi.fn<() => void>();
    const handleWrong = vi.fn<() => void>();

    render(
      <MemoryRouter>
        <RomajiInputQuiz glyph="あ" onCorrectAnswer={handleCorrect} onWrongAnswer={handleWrong} />
      </MemoryRouter>
    );

    const glyphDisplay = screen.getByText('あ');
    expect(glyphDisplay).toHaveClass('text-7xl', 'text-foreground');

    const input = screen.getByRole('textbox', { name: /romaji input/i });
    const submitButton = screen.getByRole('button', { name: /submit/i });

    await user.type(input, '  A  ');
    expect(submitButton).not.toBeDisabled();
    await user.click(submitButton);

    expect(handleCorrect).toHaveBeenCalledTimes(CALL_COUNT_ONE);
    expect(handleWrong).toHaveBeenCalledTimes(CALL_COUNT_ZERO);

    // Box theming check
    const boxContainer = glyphDisplay.parentElement;
    expect(boxContainer).toHaveClass('border-emerald-500/40', 'bg-emerald-500/10');
    expect(glyphDisplay).not.toHaveClass('text-foreground');

    // Input field and buttons hidden altogether
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /submit/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /i don't know/i })).not.toBeInTheDocument();

    // Success copy contains user answer
    expect(screen.getByText(/correct! answer:/i)).toBeInTheDocument();
    expect(screen.getByText('a')).toBeInTheDocument();

    const continueLink = screen.getByRole('link', { name: /continue/i });
    expect(continueLink).toBeInTheDocument();
    expect(continueLink).toHaveAttribute('href', '/hiragana');
  });

  it('renders a digraph glyph and handles wrong submission with hint text', async () => {
    const user = userEvent.setup();
    const handleCorrect = vi.fn<() => void>();
    const handleWrong = vi.fn<() => void>();

    render(
      <MemoryRouter>
        <RomajiInputQuiz glyph="きゃ" onCorrectAnswer={handleCorrect} onWrongAnswer={handleWrong} />
      </MemoryRouter>
    );

    const glyphDisplay = screen.getByText('きゃ');
    expect(glyphDisplay).toHaveClass('text-6xl', 'text-foreground');

    const input = screen.getByRole('textbox', { name: /romaji input/i });
    await user.type(input, 'ka');
    await user.click(screen.getByRole('button', { name: /submit/i }));

    expect(handleWrong).toHaveBeenCalledTimes(CALL_COUNT_ONE);
    expect(handleCorrect).toHaveBeenCalledTimes(CALL_COUNT_ZERO);

    // Box theming check
    const boxContainer = glyphDisplay.parentElement;
    expect(boxContainer).toHaveClass('border-destructive/40', 'bg-destructive/10');

    // Input field hidden altogether
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();

    // Canonical reading and user answer hint
    expect(screen.getByText(/incorrect. the reading is/i)).toBeInTheDocument();
    expect(screen.getByText('kya')).toBeInTheDocument();
    expect(screen.getByText(/you answered:/i)).toBeInTheDocument();
    expect(screen.getByText('ka')).toBeInTheDocument();

    const continueLink = screen.getByRole('link', { name: /continue/i });
    expect(continueLink).toBeInTheDocument();
    expect(continueLink).toHaveAttribute('href', '/hiragana');
  });

  it('handles "I don\'t know" button triggering failed state without "Incorrect." and without hint', async () => {
    const user = userEvent.setup();
    const handleCorrect = vi.fn<() => void>();
    const handleWrong = vi.fn<() => void>();

    render(
      <MemoryRouter>
        <RomajiInputQuiz glyph="き" onCorrectAnswer={handleCorrect} onWrongAnswer={handleWrong} />
      </MemoryRouter>
    );

    const glyphDisplay = screen.getByText('き');
    const dontKnowButton = screen.getByRole('button', { name: /i don't know/i });
    expect(dontKnowButton).toBeInTheDocument();

    await user.click(dontKnowButton);

    expect(handleWrong).toHaveBeenCalledTimes(CALL_COUNT_ONE);
    expect(handleCorrect).toHaveBeenCalledTimes(CALL_COUNT_ZERO);

    // Box theming check
    const boxContainer = glyphDisplay.parentElement;
    expect(boxContainer).toHaveClass('border-destructive/40', 'bg-destructive/10');

    // Form hidden altogether
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /i don't know/i })).not.toBeInTheDocument();

    // Copy omits "Incorrect." and shows "The reading is ki"
    expect(screen.getByText(/the reading is/i)).toBeInTheDocument();
    expect(screen.queryByText(/incorrect/i)).not.toBeInTheDocument();
    expect(screen.getByText('ki')).toBeInTheDocument();

    // Hint text omitted
    expect(screen.queryByText(/you answered:/i)).not.toBeInTheDocument();

    const continueLink = screen.getByRole('link', { name: /continue/i });
    expect(continueLink).toBeInTheDocument();
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
