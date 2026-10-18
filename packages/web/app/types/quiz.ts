import type { QuizResult } from '@kana/helpers/sync/schemas';
import { QUIZ_RESULT } from '@kana/helpers/sync/schemas';

export { QUIZ_RESULT };
export type { QuizResult };

export type QuizEvent = {
  glyph: string;
  timestamp: number;
  result: QuizResult;
};

export type QuizComponentProps = {
  glyph: string;
  onCorrectAnswer: () => void;
  onWrongAnswer: () => void;
};
