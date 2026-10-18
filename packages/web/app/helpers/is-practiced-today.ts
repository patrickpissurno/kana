import { isToday } from 'date-fns';
import type { QuizEvent } from '../types/quiz';
import { QUIZ_RESULT } from '../types/quiz';

export function isPracticedToday(events: QuizEvent[]): boolean {
  return events.some(
    (event) => event.result === QUIZ_RESULT.CORRECT && isToday(new Date(event.timestamp))
  );
}
