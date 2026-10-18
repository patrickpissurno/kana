import { describe, expect, it } from 'vitest';
import type { QuizEvent } from '../types/quiz';
import { QUIZ_RESULT } from '../types/quiz';
import { isCooldownActive } from './is-cooldown-active';

const FIXED_NOW = 1700000000000;
const ONE_MINUTE_MS = 60_000;
const TWO_MINUTES_MS = 120_000;
const COOLDOWN_MAX_MS = 10_800_000;
const ONE_MS = 1;

describe('isCooldownActive', () => {
  it('returns false when no events exist', () => {
    expect(isCooldownActive([])).toBe(false);
  });

  it('returns false when all events are skipped', () => {
    const events: QuizEvent[] = [
      { glyph: 'あ', timestamp: FIXED_NOW - ONE_MINUTE_MS, result: QUIZ_RESULT.SKIPPED },
    ];
    expect(isCooldownActive(events, FIXED_NOW)).toBe(false);
  });

  it('returns false when the latest non-skipped event is in the future', () => {
    const events: QuizEvent[] = [
      { glyph: 'あ', timestamp: FIXED_NOW + ONE_MINUTE_MS, result: QUIZ_RESULT.CORRECT },
    ];
    expect(isCooldownActive(events, FIXED_NOW)).toBe(false);
  });

  it('returns false when the latest non-skipped event is older than 180 minutes', () => {
    const events: QuizEvent[] = [
      {
        glyph: 'あ',
        timestamp: FIXED_NOW - (COOLDOWN_MAX_MS + ONE_MS),
        result: QUIZ_RESULT.CORRECT,
      },
    ];
    expect(isCooldownActive(events, FIXED_NOW)).toBe(false);
  });

  it('returns true when a correct attempt is within 180 minutes', () => {
    const events: QuizEvent[] = [
      { glyph: 'あ', timestamp: FIXED_NOW - ONE_MINUTE_MS, result: QUIZ_RESULT.CORRECT },
    ];
    expect(isCooldownActive(events, FIXED_NOW)).toBe(true);
  });

  it('returns true when a wrong attempt is within 180 minutes', () => {
    const events: QuizEvent[] = [
      { glyph: 'あ', timestamp: FIXED_NOW - ONE_MINUTE_MS, result: QUIZ_RESULT.WRONG },
    ];
    expect(isCooldownActive(events, FIXED_NOW)).toBe(true);
  });

  it('returns true exactly at the 180-minute boundary', () => {
    const events: QuizEvent[] = [
      { glyph: 'あ', timestamp: FIXED_NOW - COOLDOWN_MAX_MS, result: QUIZ_RESULT.CORRECT },
    ];
    expect(isCooldownActive(events, FIXED_NOW)).toBe(true);
  });

  it('skips trailing skipped attempts and checks the most recent non-skipped attempt', () => {
    const events: QuizEvent[] = [
      { glyph: 'あ', timestamp: FIXED_NOW - TWO_MINUTES_MS, result: QUIZ_RESULT.CORRECT },
      { glyph: 'あ', timestamp: FIXED_NOW - ONE_MINUTE_MS, result: QUIZ_RESULT.SKIPPED },
    ];
    expect(isCooldownActive(events, FIXED_NOW)).toBe(true);
  });

  it('uses Date.now() as default when now is omitted', () => {
    const recentEvent: QuizEvent[] = [
      { glyph: 'あ', timestamp: Date.now() - ONE_MINUTE_MS, result: QUIZ_RESULT.CORRECT },
    ];
    expect(isCooldownActive(recentEvent)).toBe(true);
  });
});
