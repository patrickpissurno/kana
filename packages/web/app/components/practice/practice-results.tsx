import { cn } from 'cn';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router';
import { buttonVariants } from '../ui/button';

export type PracticeResultsProps = {
  totalQuestions: number;
  correctCount: number;
  wrongCount: number;
  totalDurationMs: number;
};

const MS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;
const SINGLE_DECIMAL_PLACE = 1;
const PERCENT_MULTIPLIER = 100;

export function formatDuration(durationMs: number): string {
  const totalSeconds = Math.max(0, Math.round(durationMs / MS_PER_SECOND));
  const minutes = Math.floor(totalSeconds / SECONDS_PER_MINUTE);
  const seconds = totalSeconds % SECONDS_PER_MINUTE;

  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

export function formatAverageTime(averageMs: number): string {
  const seconds = Math.max(0, averageMs / MS_PER_SECOND);
  return `${seconds.toFixed(SINGLE_DECIMAL_PLACE)}s`;
}

export function PracticeResults({
  totalQuestions,
  correctCount,
  wrongCount,
  totalDurationMs,
}: PracticeResultsProps) {
  const accuracy =
    totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * PERCENT_MULTIPLIER) : 0;
  const averageTimeMs = totalQuestions > 0 ? totalDurationMs / totalQuestions : 0;

  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col px-4 py-6 sm:py-10">
      <Link
        replace
        to="/hiragana"
        className={cn(
          buttonVariants({ variant: 'ghost', size: 'icon' }),
          'text-muted-foreground hover:text-foreground select-none mb-5'
        )}
        aria-label="Back to Hiragana"
        draggable={false}
      >
        <ArrowLeft className="size-5" />
      </Link>

      <header className="mb-8">
        <h1 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
          Practice complete
        </h1>
        <p className="text-muted-foreground text-sm">Summary of your practice session</p>
      </header>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="bg-card border-border/80 rounded-2xl border p-4 shadow-xs">
          <p className="text-muted-foreground text-xs font-medium">Accuracy</p>
          <p className="text-foreground mt-2 text-2xl font-bold">{accuracy}%</p>
        </div>

        <div className="bg-card border-border/80 rounded-2xl border p-4 shadow-xs">
          <p className="text-muted-foreground text-xs font-medium">Avg time / item</p>
          <p className="text-foreground mt-2 text-2xl font-bold">
            {formatAverageTime(averageTimeMs)}
          </p>
        </div>

        <div className="bg-card border-border/80 rounded-2xl border p-4 shadow-xs">
          <p className="text-muted-foreground text-xs font-medium">Total duration</p>
          <p className="text-foreground mt-2 text-2xl font-bold">
            {formatDuration(totalDurationMs)}
          </p>
        </div>

        <div className="bg-card border-border/80 rounded-2xl border p-4 shadow-xs">
          <p className="text-muted-foreground text-xs font-medium">Total questions</p>
          <p className="text-foreground mt-2 text-2xl font-bold">{totalQuestions}</p>
        </div>

        <div className="bg-card border-border/80 rounded-2xl border p-4 shadow-xs">
          <p className="text-muted-foreground text-xs font-medium">Correct answers</p>
          <p className="mt-2 text-2xl font-bold">{correctCount}</p>
        </div>

        <div className="bg-card border-border/80 rounded-2xl border p-4 shadow-xs">
          <p className="text-muted-foreground text-xs font-medium">Wrong answers</p>
          <p className="mt-2 text-2xl font-bold">{wrongCount}</p>
        </div>
      </div>
    </div>
  );
}
