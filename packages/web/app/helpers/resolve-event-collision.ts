import type { QuizEvent } from '../types/quiz';

const SURROGATE_THRESHOLD = 0xffff;
const SURROGATE_PAIR_CODE_UNITS = 2;
const SINGLE_CODE_UNIT = 1;

export function compareCollateC(a: string, b: string): number {
  let i = 0;
  let j = 0;
  const lenA = a.length;
  const lenB = b.length;

  while (i < lenA && j < lenB) {
    const cpA = a.codePointAt(i) as number;
    const cpB = b.codePointAt(j) as number;

    if (cpA !== cpB) {
      return cpA - cpB;
    }

    i += cpA > SURROGATE_THRESHOLD ? SURROGATE_PAIR_CODE_UNITS : SINGLE_CODE_UNIT;
    j += cpB > SURROGATE_THRESHOLD ? SURROGATE_PAIR_CODE_UNITS : SINGLE_CODE_UNIT;
  }

  if (i < lenA) {
    return 1;
  }
  if (j < lenB) {
    return -1;
  }
  return 0;
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
