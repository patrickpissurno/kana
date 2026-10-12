import type { QuizEvent, QuizResult } from '../types/quiz';

const RESULT_PRECEDENCE: Record<QuizResult, number> = {
  correct: 3,
  wrong: 2,
  skipped: 1,
};

export function resolveEventCollision(a: QuizEvent, b: QuizEvent): QuizEvent {
  if (a.glyph !== b.glyph) {
    return a.glyph > b.glyph ? a : b;
  }
  const precA = RESULT_PRECEDENCE[a.result];
  const precB = RESULT_PRECEDENCE[b.result];
  if (precA !== precB) {
    return precA > precB ? a : b;
  }
  return a;
}
