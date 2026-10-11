import { describe, expect, it } from 'vitest';
import { getRandomQuizComponent, QUIZ_COMPONENTS } from './quiz-registry';
import { RomajiInputQuiz } from './romaji-input-quiz';

const EXPECTED_MIN_LENGTH = 1;
const RANDOM_ZERO = 0;
const OUT_OF_BOUNDS_RANDOM = 10;

describe('quiz-registry', () => {
  it('registers RomajiInputQuiz in QUIZ_COMPONENTS', () => {
    expect(QUIZ_COMPONENTS.length).toBeGreaterThanOrEqual(EXPECTED_MIN_LENGTH);
    expect(QUIZ_COMPONENTS).toContain(RomajiInputQuiz);
  });

  it('returns a quiz component using default random generator', () => {
    const Component = getRandomQuizComponent();
    expect(Component).toBe(RomajiInputQuiz);
  });

  it('selects component with custom random generator', () => {
    const Component = getRandomQuizComponent(() => RANDOM_ZERO);
    expect(Component).toBe(RomajiInputQuiz);
  });

  it('falls back to default component when index is out of bounds', () => {
    const Component = getRandomQuizComponent(() => OUT_OF_BOUNDS_RANDOM);
    expect(Component).toBe(RomajiInputQuiz);
  });
});
