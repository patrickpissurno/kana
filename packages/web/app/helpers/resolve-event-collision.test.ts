import { describe, expect, it } from 'vitest';
import type { QuizEvent } from '../types/quiz';
import { QUIZ_RESULT } from '../types/quiz';
import { compareCollateC, resolveEventCollision } from './resolve-event-collision';

const TEST_TIMESTAMP = 1_700_000_000_000;
const GLYPH_A = 'あ';
const GLYPH_I = 'い';

describe('compareCollateC', () => {
  it('correctly compares strings based on UTF-8 code point values', () => {
    expect(compareCollateC('a', 'b')).toBeLessThan(0);
    expect(compareCollateC('b', 'a')).toBeGreaterThan(0);
    expect(compareCollateC('a', 'a')).toBe(0);
  });

  it('compares strings with different lengths where one is prefix of another', () => {
    expect(compareCollateC('abc', 'abcd')).toBeLessThan(0);
    expect(compareCollateC('abcd', 'abc')).toBeGreaterThan(0);
  });
});

describe('resolveEventCollision', () => {
  it('chooses the event with greater glyph code point when glyphs differ', () => {
    const eventA: QuizEvent = {
      glyph: GLYPH_A,
      timestamp: TEST_TIMESTAMP,
      result: QUIZ_RESULT.CORRECT,
    };
    const eventB: QuizEvent = {
      glyph: GLYPH_I,
      timestamp: TEST_TIMESTAMP,
      result: QUIZ_RESULT.CORRECT,
    };

    expect(resolveEventCollision(eventA, eventB)).toBe(eventB);
    expect(resolveEventCollision(eventB, eventA)).toBe(eventB);
  });

  it('chooses the event with higher result precedence when glyphs are equal', () => {
    const eventCorrect: QuizEvent = {
      glyph: GLYPH_A,
      timestamp: TEST_TIMESTAMP,
      result: QUIZ_RESULT.CORRECT,
    };
    const eventWrong: QuizEvent = {
      glyph: GLYPH_A,
      timestamp: TEST_TIMESTAMP,
      result: QUIZ_RESULT.WRONG,
    };
    const eventSkipped: QuizEvent = {
      glyph: GLYPH_A,
      timestamp: TEST_TIMESTAMP,
      result: QUIZ_RESULT.SKIPPED,
    };

    expect(resolveEventCollision(eventCorrect, eventWrong)).toBe(eventCorrect);
    expect(resolveEventCollision(eventWrong, eventCorrect)).toBe(eventCorrect);

    expect(resolveEventCollision(eventWrong, eventSkipped)).toBe(eventWrong);
    expect(resolveEventCollision(eventSkipped, eventWrong)).toBe(eventWrong);
  });

  it('returns first event when both events are identical', () => {
    const event1: QuizEvent = {
      glyph: GLYPH_A,
      timestamp: TEST_TIMESTAMP,
      result: QUIZ_RESULT.CORRECT,
    };
    const event2: QuizEvent = {
      glyph: GLYPH_A,
      timestamp: TEST_TIMESTAMP,
      result: QUIZ_RESULT.CORRECT,
    };

    expect(resolveEventCollision(event1, event2)).toBe(event1);
  });
});
