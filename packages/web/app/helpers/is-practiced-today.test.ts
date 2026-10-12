import { subDays } from 'date-fns';
import { describe, expect, it } from 'vitest';
import type { QuizEvent } from '../types/quiz';
import { isPracticedToday } from './is-practiced-today';

describe('isPracticedToday', () => {
  it('returns false when no events exist', () => {
    expect(isPracticedToday([])).toBe(false);
  });

  it('returns false when today events are only skipped', () => {
    const events: QuizEvent[] = [{ glyph: 'あ', timestamp: Date.now(), result: 'skipped' }];
    expect(isPracticedToday(events)).toBe(false);
  });

  it('returns false when practiced on previous days but not today', () => {
    const yesterday = subDays(new Date(), 1).getTime();
    const events: QuizEvent[] = [{ glyph: 'あ', timestamp: yesterday, result: 'correct' }];
    expect(isPracticedToday(events)).toBe(false);
  });

  it('returns false when today events are only wrong', () => {
    const eventsWrong: QuizEvent[] = [{ glyph: 'あ', timestamp: Date.now(), result: 'wrong' }];
    expect(isPracticedToday(eventsWrong)).toBe(false);
  });

  it('returns true when a correct attempt occurred today', () => {
    const eventsCorrect: QuizEvent[] = [{ glyph: 'あ', timestamp: Date.now(), result: 'correct' }];
    expect(isPracticedToday(eventsCorrect)).toBe(true);
  });
});
