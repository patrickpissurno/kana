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
  const [userAnswer, setUserAnswer] = useState<string>('');
  const [isBlank, setIsBlank] = useState<boolean>(true);
  const [isDontKnow, setIsDontKnow] = useState<boolean>(false);

  const entry = HIRAGANA_MAP.get(glyph);
  const canonicalRomaji = entry?.romaji ?? '';

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsBlank(e.target.value.trim() === '');
  };

  const handleInputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.value = e.target.value.trim();
    setIsBlank(e.target.value === '');
  };

  const handleSubmit = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);
    const rawInput = formData.get('romaji');
    const input = typeof rawInput === 'string' ? rawInput.trim().toLowerCase() : '';
    setUserAnswer(input);

    if (input === canonicalRomaji) {
      setQuizState('correct');
      onCorrectAnswer();
    } else {
      setQuizState('wrong');
      onWrongAnswer();
    }
  };

  const handleDontKnow = () => {
    setIsDontKnow(true);
    setQuizState('wrong');
    onWrongAnswer();
  };

  const isAnswered = quizState !== 'idle';
  const isDigraph = glyph.length > SINGLE_CHAR_LENGTH;

  return (
    <div className="flex w-full max-w-sm flex-col items-center">
      {/* Glyph Display Box themed on state color */}
      <div
        className={cn(
          'mb-8 flex h-48 w-48 items-center justify-center rounded-3xl border shadow-sm transition-colors',
          quizState === 'idle' && 'border-border bg-card',
          quizState === 'correct' && 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400',
          quizState === 'wrong' && 'border-destructive/40 bg-destructive/10 text-destructive'
        )}
      >
        <span
          className={cn(
            'font-medium tracking-tight select-none',
            quizState === 'idle' && 'text-foreground',
            isDigraph ? 'text-6xl' : 'text-7xl'
          )}
        >
          {glyph}
        </span>
      </div>

      {/* Uncontrolled Form (hidden altogether when answered) */}
      {!isAnswered && (
        <form onSubmit={handleSubmit} className="flex w-full flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Input
              id="romaji-input"
              name="romaji"
              type="text"
              placeholder="Type romaji..."
              autoFocus
              inputMode="text"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="go"
              onChange={handleInputChange}
              onBlur={handleInputBlur}
              className="h-12 text-center text-lg"
              aria-label="Romaji input"
            />
          </div>

          <Button type="submit" size="lg" disabled={isBlank} className="w-full">
            Submit
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="lg"
            onClick={handleDontKnow}
            className="text-muted-foreground w-full"
          >
            I don't know
          </Button>
        </form>
      )}

      {/* Immediate Visual Feedback & Continue CTA */}
      {quizState === 'correct' && (
        <div className="flex w-full flex-col items-center gap-4">
          <div className="w-full rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-center text-sm font-medium text-emerald-400">
            Correct! Answer: <span className="font-semibold underline">{userAnswer}</span>
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
        <div className="flex w-full flex-col items-center gap-4">
          <div className="flex w-full flex-col items-center gap-2">
            <div className="border-destructive/30 bg-destructive/10 text-destructive w-full rounded-2xl border p-3 text-center text-sm font-medium">
              {isDontKnow ? 'The reading is ' : 'Incorrect. The reading is '}
              <span className="font-semibold underline">{canonicalRomaji}</span>
            </div>
            {!isDontKnow && (
              <p className="text-muted-foreground text-xs">
                You answered: <span className="text-foreground font-semibold">{userAnswer}</span>
              </p>
            )}
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
