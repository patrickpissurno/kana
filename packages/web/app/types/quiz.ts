export type QuizResult = 'correct' | 'wrong' | 'skipped';

export type QuizEvent = {
  id?: number;
  glyph: string;
  timestamp: number;
  result: QuizResult;
};

export type QuizComponentProps = {
  glyph: string;
  onCorrectAnswer: () => void;
  onWrongAnswer: () => void;
};
