import { cn } from 'cn';
import { useState } from 'react';
import { Link } from 'react-router';
import type { QuizComponentProps } from '../../types/quiz';
import { HIRAGANA_MAP } from '../../data/hiragana';
import { Button, buttonVariants } from '../ui/button';
import { Input } from '../ui/input';

type QuizState = 'idle' | 'correct' | 'wrong';

const SINGLE_CHAR_LENGTH = 1;

export function RomajiInputQuiz({ glyph, onCorrectAnswer, onWrongAnswer }: QuizComponentProps) {
  const [quizState, setQuizState] = useState<QuizState>('idle');

  const entry = HIRAGANA_MAP.get(glyph);
  const canonicalRomaji = entry?.romaji ?? '';

  const handleSubmit = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (quizState !== 'idle') {
      return;
    }

    const formData = new FormData(e.currentTarget);
    const rawInput = formData.get('romaji');
    const input = typeof rawInput === 'string' ? rawInput.trim().toLowerCase() : '';

    if (input === canonicalRomaji) {
      setQuizState('correct');
      onCorrectAnswer();
    } else {
      setQuizState('wrong');
      onWrongAnswer();
    }
  };

  const isAnswered = quizState !== 'idle';
  const isDigraph = glyph.length > SINGLE_CHAR_LENGTH;

  return (
    <div className="flex w-full max-w-sm flex-col items-center">
      {/* Glyph Display Box */}
      <div className="border-border bg-card mb-8 flex h-48 w-48 items-center justify-center rounded-3xl border shadow-sm">
        <span
          className={cn(
            'font-medium tracking-tight text-foreground select-none',
            isDigraph ? 'text-6xl' : 'text-7xl'
          )}
        >
          {glyph}
        </span>
      </div>

      {/* Uncontrolled Form */}
      <form onSubmit={handleSubmit} className="flex w-full flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Input
            id="romaji-input"
            name="romaji"
            type="text"
            placeholder="Type romaji..."
            autoFocus
            disabled={isAnswered}
            inputMode="text"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="go"
            className="h-12 text-center text-lg"
            aria-label="Romaji input"
          />
        </div>

        {!isAnswered && (
          <Button type="submit" size="lg" className="w-full">
            Submit
          </Button>
        )}
      </form>

      {/* Immediate Visual Feedback & Continue CTA */}
      {quizState === 'correct' && (
        <div className="mt-6 flex w-full flex-col items-center gap-4">
          <div className="w-full rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-center text-sm font-medium text-emerald-400">
            Correct!
          </div>
          <Link
            to="/hiragana"
            className={cn(buttonVariants({ size: 'lg', variant: 'default' }), 'w-full')}
          >
            Continue
          </Link>
        </div>
      )}

      {quizState === 'wrong' && (
        <div className="mt-6 flex w-full flex-col items-center gap-4">
          <div className="border-destructive/30 bg-destructive/10 text-destructive w-full rounded-2xl border p-3 text-center text-sm font-medium">
            Incorrect. The reading is{' '}
            <span className="font-semibold underline">{canonicalRomaji}</span>
          </div>
          <Link
            to="/hiragana"
            className={cn(buttonVariants({ size: 'lg', variant: 'secondary' }), 'w-full')}
          >
            Continue
          </Link>
        </div>
      )}
    </div>
  );
}
