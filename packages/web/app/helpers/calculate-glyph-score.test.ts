import { subDays } from 'date-fns';
import { describe, expect, it } from 'vitest';
import type { QuizEvent } from '../types/quiz';
import { calculateGlyphScore } from './calculate-glyph-score';

const OFFSET_1_SECOND = 1000;
const OFFSET_2_SECONDS = 2000;
const OFFSET_HALF_SECOND = 500;
const TIME_OFFSET_10_MS = 10;
const TIME_OFFSET_20_MS = 20;

const DAYS_OFFSET_1 = 1;
const DAYS_OFFSET_2 = 2;
const DAYS_OFFSET_3 = 3;
const DAYS_OFFSET_4 = 4;

const EXPECTED_DAY1_SCORE = 40;
const EXPECTED_ACCURACY_SCORE = 9;
const EXPECTED_DAY2_SCORE = 70;
const EXPECTED_DAY3_SCORE = 100;
const EXPECTED_DECAY_SCORE = 2;
const EXPECTED_WRONG_PENALTY_SCORE = 7;

describe('calculateGlyphScore', () => {
  const BASE_NOW = new Date('2026-10-12T12:00:00Z').getTime();

  it('returns 0 when there are no attempts or only skipped events', () => {
    expect(calculateGlyphScore([])).toBe(0);
    expect(calculateGlyphScore([{ glyph: 'あ', timestamp: BASE_NOW, result: 'skipped' }])).toBe(0);
  });

  it('returns 0 when all attempts are wrong (k = 0)', () => {
    const events: QuizEvent[] = [{ glyph: 'あ', timestamp: BASE_NOW, result: 'wrong' }];
    expect(calculateGlyphScore(events, BASE_NOW)).toBe(0);
  });

  it('calculates score for day 1 mastery cap (k = 1, cap = 40%)', () => {
    const events: QuizEvent[] = [
      { glyph: 'あ', timestamp: BASE_NOW - OFFSET_1_SECOND, result: 'correct' },
      { glyph: 'あ', timestamp: BASE_NOW - OFFSET_HALF_SECOND, result: 'correct' },
      { glyph: 'あ', timestamp: BASE_NOW, result: 'correct' },
    ];
    expect(calculateGlyphScore(events, BASE_NOW)).toBe(EXPECTED_DAY1_SCORE);
  });

  it('weights daily credit by streak and accuracy', () => {
    const events: QuizEvent[] = [
      { glyph: 'あ', timestamp: BASE_NOW - OFFSET_2_SECONDS, result: 'correct' },
      { glyph: 'あ', timestamp: BASE_NOW - OFFSET_1_SECOND, result: 'wrong' },
      { glyph: 'あ', timestamp: BASE_NOW, result: 'correct' },
    ];
    expect(calculateGlyphScore(events, BASE_NOW)).toBe(EXPECTED_ACCURACY_SCORE);
  });

  it('applies stability and acquisition caps across 2, 3, 4, and 5+ days', () => {
    const day1 = subDays(BASE_NOW, DAYS_OFFSET_4).getTime();
    const day2 = subDays(BASE_NOW, DAYS_OFFSET_3).getTime();
    const day3 = subDays(BASE_NOW, DAYS_OFFSET_2).getTime();
    const day4 = subDays(BASE_NOW, DAYS_OFFSET_1).getTime();
    const day5 = BASE_NOW;

    const buildDay = (timestamp: number): QuizEvent[] => [
      { glyph: 'あ', timestamp, result: 'correct' },
      { glyph: 'あ', timestamp: timestamp + TIME_OFFSET_10_MS, result: 'correct' },
      { glyph: 'あ', timestamp: timestamp + TIME_OFFSET_20_MS, result: 'correct' },
    ];

    // 2 distinct days
    const events2 = [...buildDay(day4), ...buildDay(day5)];
    expect(calculateGlyphScore(events2, day5)).toBe(EXPECTED_DAY2_SCORE);

    // 3 distinct days
    const events3 = [...buildDay(day3), ...events2];
    expect(calculateGlyphScore(events3, day5)).toBe(EXPECTED_DAY3_SCORE);

    // 4 distinct days
    const events4 = [...buildDay(day2), ...events3];
    expect(calculateGlyphScore(events4, day5)).toBe(EXPECTED_DAY3_SCORE);

    // 5 distinct days
    const events5 = [...buildDay(day1), ...events4];
    expect(calculateGlyphScore(events5, day5)).toBe(EXPECTED_DAY3_SCORE);
  });

  it('decays retention over time based on forgetting curve', () => {
    const threeDaysAgo = subDays(BASE_NOW, DAYS_OFFSET_3).getTime();
    const events: QuizEvent[] = [
      { glyph: 'あ', timestamp: threeDaysAgo, result: 'correct' },
      { glyph: 'あ', timestamp: threeDaysAgo + TIME_OFFSET_10_MS, result: 'correct' },
      { glyph: 'あ', timestamp: threeDaysAgo + TIME_OFFSET_20_MS, result: 'correct' },
    ];
    expect(calculateGlyphScore(events, BASE_NOW)).toBe(EXPECTED_DECAY_SCORE);
  });

  it('drops stability to 0.5 when the most recent attempt is wrong', () => {
    const events: QuizEvent[] = [
      { glyph: 'あ', timestamp: BASE_NOW - OFFSET_1_SECOND, result: 'correct' },
      { glyph: 'あ', timestamp: BASE_NOW, result: 'wrong' },
    ];
    expect(calculateGlyphScore(events, BASE_NOW)).toBe(EXPECTED_WRONG_PENALTY_SCORE);
  });

  it('uses default now parameter when not provided', () => {
    const events: QuizEvent[] = [{ glyph: 'あ', timestamp: Date.now(), result: 'correct' }];
    const score = calculateGlyphScore(events);
    expect(score).toBeGreaterThan(0);
  });
});
