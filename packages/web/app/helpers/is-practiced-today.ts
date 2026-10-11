import { isToday } from 'date-fns';
import type { QuizEvent } from '../types/quiz';

export function isPracticedToday(events: QuizEvent[]): boolean {
  return events.some((event) => event.result !== 'skipped' && isToday(new Date(event.timestamp)));
}
