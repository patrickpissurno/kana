import { startOfDay } from 'date-fns';
import type { QuizEvent } from '../types/quiz';
import { QUIZ_RESULT } from '../types/quiz';

const MS_PER_DAY = 86_400_000;
const MAX_DAILY_SUCCESS_CREDIT = 3;
const WRONG_ATTEMPT_STABILITY = 0.5;
const PERCENT_MULTIPLIER = 100;
const MAX_PERCENT_SCORE = 100;
const MIN_PERCENT_SCORE = 0;

const STABILITY_DAY_1 = 1.0;
const STABILITY_DAY_2 = 3.0;
const STABILITY_DAY_3 = 7.0;
const STABILITY_DAY_4 = 14.0;
const STABILITY_DAY_MAX = 30.0;

const CAP_DAY_1 = 0.4;
const CAP_DAY_2 = 0.7;
const CAP_DAY_MAX = 1.0;

const DAYS_1 = 1;
const DAYS_2 = 2;
const DAYS_3 = 3;
const DAYS_4 = 4;

function getStability(k: number, isLastWrong: boolean): number {
  if (isLastWrong) {
    return WRONG_ATTEMPT_STABILITY;
  }
  if (k === DAYS_1) {
    return STABILITY_DAY_1;
  }
  if (k === DAYS_2) {
    return STABILITY_DAY_2;
  }
  if (k === DAYS_3) {
    return STABILITY_DAY_3;
  }
  if (k === DAYS_4) {
    return STABILITY_DAY_4;
  }
  return STABILITY_DAY_MAX;
}

function getAcquisitionCap(k: number): number {
  if (k === DAYS_1) {
    return CAP_DAY_1;
  }
  if (k === DAYS_2) {
    return CAP_DAY_2;
  }
  return CAP_DAY_MAX;
}

export function calculateGlyphScore(events: QuizEvent[], now: number = Date.now()): number {
  const attempts = events.filter((e) => e.result !== QUIZ_RESULT.SKIPPED);
  const sorted = [...attempts].sort((a, b) => a.timestamp - b.timestamp);
  const lastAttempt = sorted[sorted.length - 1];
  if (!lastAttempt) {
    return MIN_PERCENT_SCORE;
  }
  const isLastWrong = lastAttempt.result === QUIZ_RESULT.WRONG;

  // Group attempts by calendar day
  const dayGroups = new Map<number, QuizEvent[]>();
  for (const attempt of sorted) {
    const dayKey = startOfDay(new Date(attempt.timestamp)).getTime();
    const group = dayGroups.get(dayKey) ?? [];
    group.push(attempt);
    dayGroups.set(dayKey, group);
  }

  const dayScores = new Map<number, number>();
  for (const [dayKey, dayAttempts] of dayGroups.entries()) {
    let currentStreak = 0;
    let maxStreak = 0;
    let correctCount = 0;
    let wrongCount = 0;

    for (const attempt of dayAttempts) {
      if (attempt.result === QUIZ_RESULT.CORRECT) {
        correctCount += 1;
        currentStreak += 1;
        if (currentStreak > maxStreak) {
          maxStreak = currentStreak;
        }
      } else {
        wrongCount += 1;
        currentStreak = 0;
      }
    }

    const sDay = Math.min(MAX_DAILY_SUCCESS_CREDIT, maxStreak);
    const accuracy = correctCount / (correctCount + wrongCount);
    const cDay = (sDay / MAX_DAILY_SUCCESS_CREDIT) * accuracy;
    dayScores.set(dayKey, cDay);
  }

  // Count distinct calendar days with practice that achieved credit
  let k = 0;
  for (const score of dayScores.values()) {
    if (score > 0) {
      k += 1;
    }
  }

  if (k === 0) {
    return MIN_PERCENT_SCORE;
  }

  const lastDayKey = startOfDay(new Date(lastAttempt.timestamp)).getTime();
  const cLatest = dayScores.get(lastDayKey) as number;

  const stability = getStability(k, isLastWrong);
  const deltaT = Math.max(0, (now - lastAttempt.timestamp) / MS_PER_DAY);
  const r = Math.exp(-deltaT / stability);
  const cap = getAcquisitionCap(k);

  const rawScore = PERCENT_MULTIPLIER * cap * r * cLatest;
  return Math.min(MAX_PERCENT_SCORE, Math.max(MIN_PERCENT_SCORE, Math.round(rawScore)));
}
