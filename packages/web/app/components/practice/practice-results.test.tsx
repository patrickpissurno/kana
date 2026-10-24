import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { formatAverageTime, formatDuration, PracticeResults } from './practice-results';

const TOTAL_TEN = 10;
const CORRECT_EIGHT = 8;
const WRONG_TWO = 2;
const DURATION_UNDER_MINUTE_MS = 15_000;
const DURATION_OVER_MINUTE_MS = 85_000;
const NEGATIVE_DURATION_MS = -1000;
const POSITIVE_AVERAGE_MS = 2400;
const NEGATIVE_AVERAGE_MS = -500;
const ZERO = 0;

describe('PracticeResults', () => {
  it('formats durations correctly for seconds and minutes', () => {
    expect(formatDuration(DURATION_UNDER_MINUTE_MS)).toBe('15s');
    expect(formatDuration(DURATION_OVER_MINUTE_MS)).toBe('1m 25s');
    expect(formatDuration(NEGATIVE_DURATION_MS)).toBe('0s');
  });

  it('formats average time correctly', () => {
    expect(formatAverageTime(POSITIVE_AVERAGE_MS)).toBe('2.4s');
    expect(formatAverageTime(NEGATIVE_AVERAGE_MS)).toBe('0.0s');
  });

  it('renders stats accurately for standard practice session', () => {
    render(
      <MemoryRouter>
        <PracticeResults
          totalQuestions={TOTAL_TEN}
          correctCount={CORRECT_EIGHT}
          wrongCount={WRONG_TWO}
          totalDurationMs={DURATION_UNDER_MINUTE_MS}
        />
      </MemoryRouter>
    );

    expect(
      screen.getByRole('heading', { level: 1, name: 'Practice complete' })
    ).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('80%')).toBeInTheDocument();
    expect(screen.getByText('15s')).toBeInTheDocument();
    expect(screen.getByText('1.5s')).toBeInTheDocument();

    const backLink = screen.getByRole('link', { name: 'Back to Hiragana' });
    expect(backLink).toBeInTheDocument();
    expect(backLink).toHaveAttribute('href', '/hiragana');
  });

  it('handles zero total questions gracefully without NaN', () => {
    render(
      <MemoryRouter>
        <PracticeResults
          totalQuestions={ZERO}
          correctCount={ZERO}
          wrongCount={ZERO}
          totalDurationMs={ZERO}
        />
      </MemoryRouter>
    );

    expect(screen.getByText('0%')).toBeInTheDocument();
    expect(screen.getByText('0.0s')).toBeInTheDocument();
  });
});
