import { isToday } from 'date-fns';
import type { QuizEvent } from '../types/quiz';

export function isPracticedToday(events: QuizEvent[]): boolean {
  return events.some((event) => event.result === 'correct' && isToday(new Date(event.timestamp)));
}
