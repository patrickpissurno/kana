import { act, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HIRAGANA_SECTIONS } from '../../data/hiragana';
import { appendQuizEvent } from '../../helpers/append-quiz-event';
import { updateQuizEvent } from '../../helpers/update-quiz-event';
import { QUIZ_RESULT } from '../../types/quiz';
import { PracticeSession } from './practice-session';

vi.mock('../../helpers/append-quiz-event', () => ({
  appendQuizEvent: vi.fn<() => Promise<number>>(),
}));

vi.mock('../../helpers/update-quiz-event', () => ({
  updateQuizEvent: vi.fn<() => Promise<void>>(),
}));

const GOJUON_ENTRIES = HIRAGANA_SECTIONS[0]?.entries ?? [];
const QUESTION_ONE = 1;
const TOTAL_FIVE = 5;
const TIMESTAMP_MOCK = 1_700_000_000_000;
const COUNTDOWN_SUCCESS_MS = 3000;
const COUNTDOWN_ERROR_MS = 5000;
const EXPECTED_BUTTON_COUNT = 4;

describe('PracticeSession', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.useFakeTimers();
  });

  it('renders romaji and handles correct answer selection with 3s countdown', async () => {
    vi.mocked(appendQuizEvent).mockResolvedValue(TIMESTAMP_MOCK);
    vi.mocked(updateQuizEvent).mockResolvedValue(undefined);
    const onAnswer = vi.fn<(_result: { isCorrect: boolean; durationMs: number }) => void>();

    render(
      <PracticeSession
        glyph="あ"
        scopeEntries={GOJUON_ENTRIES}
        questionNumber={QUESTION_ONE}
        totalQuestions={TOTAL_FIVE}
        onAnswer={onAnswer}
      />
    );

    expect(screen.getByText('Question 1 of 5')).toBeInTheDocument();
    expect(screen.getByText('a')).toBeInTheDocument();

    const correctButton = screen.getByRole('button', { name: 'Option あ' });
    expect(correctButton).toBeInTheDocument();
    expect(appendQuizEvent).toHaveBeenCalledWith('あ');

    act(() => {
      correctButton.click();
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(updateQuizEvent).toHaveBeenCalledWith(TIMESTAMP_MOCK, QUIZ_RESULT.CORRECT);
    expect(screen.getByText(/Next in 3s/i)).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(COUNTDOWN_SUCCESS_MS);
    });

    expect(onAnswer).toHaveBeenCalledTimes(1);
    expect(onAnswer).toHaveBeenCalledWith({
      isCorrect: true,
      durationMs: expect.any(Number),
    });
  });

  it('handles wrong answer selection with 5s countdown', async () => {
    vi.mocked(appendQuizEvent).mockResolvedValue(TIMESTAMP_MOCK);
    vi.mocked(updateQuizEvent).mockResolvedValue(undefined);
    const onAnswer = vi.fn<(_result: { isCorrect: boolean; durationMs: number }) => void>();

    render(
      <PracticeSession
        glyph="あ"
        scopeEntries={GOJUON_ENTRIES}
        questionNumber={QUESTION_ONE}
        totalQuestions={TOTAL_FIVE}
        onAnswer={onAnswer}
      />
    );

    const allButtons = screen.getAllByRole('button');
    const wrongButton = allButtons.find((btn) => btn.getAttribute('aria-label') !== 'Option あ')!;

    act(() => {
      wrongButton.click();
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(updateQuizEvent).toHaveBeenCalledWith(TIMESTAMP_MOCK, QUIZ_RESULT.WRONG);
    expect(screen.getByText(/Next in 5s/i)).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(COUNTDOWN_ERROR_MS);
    });

    expect(onAnswer).toHaveBeenCalledTimes(1);
    expect(onAnswer).toHaveBeenCalledWith({
      isCorrect: false,
      durationMs: expect.any(Number),
    });
  });

  it('falls back to HIRAGANA_ENTRIES when scopeEntries has fewer than 3 candidates', () => {
    vi.mocked(appendQuizEvent).mockResolvedValue(TIMESTAMP_MOCK);
    const onAnswer = vi.fn<(_result: { isCorrect: boolean; durationMs: number }) => void>();

    render(
      <PracticeSession
        glyph="あ"
        scopeEntries={[]}
        questionNumber={QUESTION_ONE}
        totalQuestions={TOTAL_FIVE}
        onAnswer={onAnswer}
      />
    );

    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(EXPECTED_BUTTON_COUNT);
  });

  it('handles IDB append and update rejections gracefully', async () => {
    vi.mocked(appendQuizEvent).mockRejectedValue(new Error('IDB fail'));
    const onAnswer = vi.fn<(_result: { isCorrect: boolean; durationMs: number }) => void>();

    render(
      <PracticeSession
        glyph="あ"
        scopeEntries={GOJUON_ENTRIES}
        questionNumber={QUESTION_ONE}
        totalQuestions={TOTAL_FIVE}
        onAnswer={onAnswer}
      />
    );

    const correctButton = screen.getByRole('button', { name: 'Option あ' });
    act(() => {
      correctButton.click();
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(updateQuizEvent).not.toHaveBeenCalled();
  });

  it('handles updateQuizEvent rejection gracefully', async () => {
    vi.mocked(appendQuizEvent).mockResolvedValue(TIMESTAMP_MOCK);
    vi.mocked(updateQuizEvent).mockRejectedValue(new Error('Update failed'));
    const onAnswer = vi.fn<(_result: { isCorrect: boolean; durationMs: number }) => void>();

    render(
      <PracticeSession
        glyph="あ"
        scopeEntries={GOJUON_ENTRIES}
        questionNumber={QUESTION_ONE}
        totalQuestions={TOTAL_FIVE}
        onAnswer={onAnswer}
      />
    );

    const correctButton = screen.getByRole('button', { name: 'Option あ' });
    act(() => {
      correctButton.click();
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(updateQuizEvent).toHaveBeenCalledWith(TIMESTAMP_MOCK, QUIZ_RESULT.CORRECT);
  });

  it('cleans up timer on unmount', () => {
    vi.mocked(appendQuizEvent).mockResolvedValue(TIMESTAMP_MOCK);
    const onAnswer = vi.fn<(_result: { isCorrect: boolean; durationMs: number }) => void>();

    const { unmount } = render(
      <PracticeSession
        glyph="あ"
        scopeEntries={GOJUON_ENTRIES}
        questionNumber={QUESTION_ONE}
        totalQuestions={TOTAL_FIVE}
        onAnswer={onAnswer}
      />
    );

    const correctButton = screen.getByRole('button', { name: 'Option あ' });
    act(() => {
      correctButton.click();
    });

    act(() => {
      unmount();
    });

    act(() => {
      vi.advanceTimersByTime(COUNTDOWN_SUCCESS_MS);
    });
  });

  it('handles unrecognized glyph gracefully', () => {
    vi.mocked(appendQuizEvent).mockResolvedValue(TIMESTAMP_MOCK);
    const onAnswer = vi.fn<(_result: { isCorrect: boolean; durationMs: number }) => void>();

    render(
      <PracticeSession
        glyph="unknown"
        scopeEntries={[]}
        questionNumber={QUESTION_ONE}
        totalQuestions={TOTAL_FIVE}
        onAnswer={onAnswer}
      />
    );

    expect(screen.getByText('Question 1 of 5')).toBeInTheDocument();
  });
});
