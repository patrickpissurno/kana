import { cn } from 'cn';
import { useEffect, useRef, useState } from 'react';
import type { HiraganaEntry } from '../../data/hiragana';
import { HIRAGANA_ENTRIES, HIRAGANA_MAP } from '../../data/hiragana';
import { appendQuizEvent } from '../../helpers/append-quiz-event';
import { shuffleArray } from '../../helpers/shuffle-array';
import { updateQuizEvent } from '../../helpers/update-quiz-event';
import { QUIZ_RESULT } from '../../types/quiz';
import { Progress } from '../ui/progress';

export type PracticeSessionProps = {
  glyph: string;
  scopeEntries: HiraganaEntry[];
  questionNumber: number;
  totalQuestions: number;
  onAnswer: (result: { isCorrect: boolean; durationMs: number }) => void;
};

const SUCCESS_COUNTDOWN_MS = 3000;
const ERROR_COUNTDOWN_MS = 5000;
const COUNTDOWN_TICK_MS = 100;
const MS_PER_SECOND = 1000;
const PERCENT_MAX = 100;
const DISTRACTOR_COUNT = 3;

function calculateElapsedMs(startTime: number): number {
  return Math.max(0, Math.round(performance.now() - startTime));
}

function generateChoices(targetGlyph: string, scopeEntries: HiraganaEntry[]): string[] {
  const targetEntry = HIRAGANA_MAP.get(targetGlyph);
  const targetRomaji = targetEntry?.romaji ?? '';

  let candidates = scopeEntries.filter(
    (entry) => entry.glyph !== targetGlyph && entry.romaji !== targetRomaji
  );

  if (candidates.length < DISTRACTOR_COUNT) {
    candidates = HIRAGANA_ENTRIES.filter(
      (entry) => entry.glyph !== targetGlyph && entry.romaji !== targetRomaji
    );
  }

  const shuffledCandidates = shuffleArray(candidates);
  const distractors = shuffledCandidates.slice(0, DISTRACTOR_COUNT).map((entry) => entry.glyph);

  return shuffleArray([targetGlyph, ...distractors]);
}

export function PracticeSession({
  glyph,
  scopeEntries,
  questionNumber,
  totalQuestions,
  onAnswer,
}: PracticeSessionProps) {
  const [choices] = useState(() => generateChoices(glyph, scopeEntries));
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [countdownRemainingMs, setCountdownRemainingMs] = useState<number>(0);
  const [totalCountdownMs, setTotalCountdownMs] = useState<number>(0);

  const eventTimestampPromiseRef = useRef<Promise<number | null> | null>(null);
  const questionStartTimeRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const entry = HIRAGANA_MAP.get(glyph);
  const canonicalRomaji = entry?.romaji ?? '';

  useEffect(() => {
    questionStartTimeRef.current = performance.now();
    eventTimestampPromiseRef.current = appendQuizEvent(glyph).catch(() => null);

    return () => {
      if (timerRef.current !== null) {
        clearInterval(timerRef.current);
      }
    };
  }, [glyph]);

  const handleSelectChoice = (chosenGlyph: string) => {
    const durationMs = calculateElapsedMs(questionStartTimeRef.current);
    const isCorrect = chosenGlyph === glyph;
    const countdownDuration = isCorrect ? SUCCESS_COUNTDOWN_MS : ERROR_COUNTDOWN_MS;

    setSelectedChoice(chosenGlyph);
    setTotalCountdownMs(countdownDuration);
    setCountdownRemainingMs(countdownDuration);

    eventTimestampPromiseRef.current
      ?.then(async (timestamp) => {
        if (timestamp !== null) {
          await updateQuizEvent(timestamp, isCorrect ? QUIZ_RESULT.CORRECT : QUIZ_RESULT.WRONG);
        }
      })
      .catch(() => {
        // IDB error handled gracefully
      });

    let remainingMs = countdownDuration;
    const timer = setInterval(() => {
      remainingMs -= COUNTDOWN_TICK_MS;
      if (remainingMs <= 0) {
        clearInterval(timer);
        timerRef.current = null;
        setCountdownRemainingMs(0);
        onAnswer({ isCorrect, durationMs });
      } else {
        setCountdownRemainingMs(remainingMs);
      }
    }, COUNTDOWN_TICK_MS);
    timerRef.current = timer;
  };

  const isAnswered = selectedChoice !== null;
  const progressPercent =
    totalCountdownMs > 0
      ? Math.max(
          0,
          Math.min(
            PERCENT_MAX,
            ((totalCountdownMs - countdownRemainingMs) / totalCountdownMs) * PERCENT_MAX
          )
        )
      : 0;

  return (
    <div className="flex w-full max-w-sm flex-col items-center">
      <div className="text-muted-foreground mb-4 text-xs font-medium">
        Question {questionNumber} of {totalQuestions}
      </div>

      <div className="border-border bg-card mb-8 flex h-44 w-44 items-center justify-center rounded-3xl border shadow-sm sm:h-48 sm:w-48">
        <span className="text-foreground text-5xl font-medium tracking-tight select-none sm:text-6xl">
          {canonicalRomaji}
        </span>
      </div>

      <div className="grid w-full grid-cols-2 gap-3 sm:gap-4">
        {choices.map((choiceGlyph) => {
          const isTarget = choiceGlyph === glyph;
          return (
            <button
              key={choiceGlyph}
              type="button"
              disabled={isAnswered}
              onClick={() => handleSelectChoice(choiceGlyph)}
              className={cn(
                'flex h-24 items-center justify-center rounded-2xl text-3xl font-medium select-none transition-all sm:h-28 sm:text-4xl',
                !isAnswered &&
                  'border-border/80 bg-card hover:bg-accent/40 text-foreground cursor-pointer active:scale-95 border',
                isAnswered &&
                  isTarget &&
                  'border-2 border-emerald-500/80 bg-emerald-500/10 text-emerald-400 font-semibold',
                isAnswered &&
                  !isTarget &&
                  'border-2 border-destructive/80 bg-destructive/10 text-destructive'
              )}
              aria-label={`Option ${choiceGlyph}`}
            >
              {choiceGlyph}
            </button>
          );
        })}
      </div>

      <div
        className={cn('mt-6 flex w-full flex-col items-center gap-2', !isAnswered && 'invisible')}
      >
        <Progress
          value={progressPercent}
          className="w-full"
          aria-label="Countdown to next question"
        />
        <span className="text-muted-foreground text-xs font-medium">
          Next in {Math.ceil(countdownRemainingMs / MS_PER_SECOND)}s...
        </span>
      </div>
    </div>
  );
}
