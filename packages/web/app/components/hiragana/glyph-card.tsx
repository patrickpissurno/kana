import { cn } from 'cn';
import { Clock } from 'lucide-react';
import { Link } from 'react-router';
import { Progress } from '../ui/progress';

export type GlyphCardProps = {
  glyph: string;
  score: number;
  isPracticedToday: boolean;
  loading: boolean;
  cooldownActive: boolean;
};

const SINGLE_CHAR_LENGTH = 1;

export function GlyphCard({
  glyph,
  score,
  isPracticedToday,
  loading,
  cooldownActive,
}: GlyphCardProps) {
  const isDigraph = glyph.length > SINGLE_CHAR_LENGTH;

  return (
    <Link
      to={`/quiz?glyph=${encodeURIComponent(glyph)}`}
      aria-label={`Practice ${glyph}`}
      className={cn(
        'group flex flex-col items-center justify-between rounded-2xl bg-card p-3 shadow-xs transition-all active:scale-95 hover:bg-accent/40',
        isPracticedToday ? 'border border-primary ring ring-primary' : 'border border-border/60'
      )}
    >
      <div className="flex h-14 w-full items-center justify-center">
        <span
          className={cn(
            'font-medium tracking-tight text-foreground transition-transform group-hover:scale-105',
            isDigraph ? 'text-2xl' : 'text-3xl',
            loading ? 'opacity-0' : ''
          )}
        >
          {glyph}
        </span>
      </div>
      <div className={cn('flex w-full flex-row items-center gap-1', cooldownActive ? '' : 'pt-1')}>
        <Progress value={score} className="w-full" aria-label={`Score: ${score}%`} />
        {cooldownActive && <Clock className="size-4 shrink-0 text-taupe-600" strokeWidth={2} />}
      </div>
    </Link>
  );
}
