export type QuizResult = 'correct' | 'wrong' | 'skipped';

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
