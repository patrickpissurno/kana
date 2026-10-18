import type { QuizEvent } from '../types/quiz';
import { QUIZ_RESULT } from '../types/quiz';

const COOLDOWN_DURATION_MS = 10_800_000;

export function isCooldownActive(events: QuizEvent[], now: number = Date.now()): boolean {
  for (let i = events.length - 1; i >= 0; i--) {
    const event = events[i] as QuizEvent;
    if (event.result === QUIZ_RESULT.SKIPPED) {
      continue;
    }
    const elapsed = now - event.timestamp;
    return elapsed >= 0 && elapsed <= COOLDOWN_DURATION_MS;
  }
  return false;
}
