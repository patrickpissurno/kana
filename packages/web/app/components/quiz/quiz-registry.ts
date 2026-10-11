import type { ComponentType } from 'react';
import type { QuizComponentProps } from '../../types/quiz';
import { RomajiInputQuiz } from './romaji-input-quiz';

export const QUIZ_COMPONENTS: readonly ComponentType<QuizComponentProps>[] = [
  RomajiInputQuiz,
] as const;

export function getRandomQuizComponent(
  random: () => number = Math.random
): ComponentType<QuizComponentProps> {
  const index = Math.floor(random() * QUIZ_COMPONENTS.length);
  return QUIZ_COMPONENTS[index] ?? RomajiInputQuiz;
}
