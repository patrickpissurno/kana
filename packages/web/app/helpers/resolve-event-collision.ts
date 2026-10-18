import type { QuizEvent } from '../types/quiz';

export function compareCollateC(a: string, b: string): number {
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const diff = a.charCodeAt(i) - b.charCodeAt(i);
    if (diff !== 0) {
      return diff;
    }
  }
  return a.length - b.length;
}

export function resolveEventCollision(a: QuizEvent, b: QuizEvent): QuizEvent {
  if (a.glyph !== b.glyph) {
    return compareCollateC(a.glyph, b.glyph) > 0 ? a : b;
  }
  if (a.result !== b.result) {
    return a.result > b.result ? a : b;
  }
  return a;
}
