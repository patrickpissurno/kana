import { describe, expect, it } from 'vitest';
import type { QuizEvent } from '../types/quiz';
import { resolveEventCollision } from './resolve-event-collision';

const TEST_TIMESTAMP = 1_700_000_000_000;
const GLYPH_A = 'あ';
const GLYPH_I = 'い';

describe('resolveEventCollision', () => {
  it('chooses the event with greater glyph code point when glyphs differ', () => {
    const eventA: QuizEvent = {
      glyph: GLYPH_A,
      timestamp: TEST_TIMESTAMP,
      result: 'correct',
    };
    const eventB: QuizEvent = {
      glyph: GLYPH_I,
      timestamp: TEST_TIMESTAMP,
      result: 'correct',
    };

    expect(resolveEventCollision(eventA, eventB)).toBe(eventB);
    expect(resolveEventCollision(eventB, eventA)).toBe(eventB);
  });

  it('chooses the event with higher result precedence when glyphs are equal', () => {
    const eventCorrect: QuizEvent = {
      glyph: GLYPH_A,
      timestamp: TEST_TIMESTAMP,
      result: 'correct',
    };
    const eventWrong: QuizEvent = {
      glyph: GLYPH_A,
      timestamp: TEST_TIMESTAMP,
      result: 'wrong',
    };
    const eventSkipped: QuizEvent = {
      glyph: GLYPH_A,
      timestamp: TEST_TIMESTAMP,
      result: 'skipped',
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
      result: 'correct',
    };
    const event2: QuizEvent = {
      glyph: GLYPH_A,
      timestamp: TEST_TIMESTAMP,
      result: 'correct',
    };

    expect(resolveEventCollision(event1, event2)).toBe(event1);
  });
});
