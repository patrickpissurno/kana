import { cn } from 'cn';
import { Link } from 'react-router';
import { Progress } from '../ui/progress';

export type GlyphCardProps = {
  glyph: string;
  score: number;
  isPracticedToday: boolean;
};

const SINGLE_CHAR_LENGTH = 1;

export function GlyphCard({ glyph, score, isPracticedToday }: GlyphCardProps) {
  const isDigraph = glyph.length > SINGLE_CHAR_LENGTH;

  return (
    <Link
      to={`/quiz?glyph=${encodeURIComponent(glyph)}`}
      aria-label={`Practice ${glyph}`}
      className={cn(
        'group flex flex-col items-center justify-between rounded-2xl bg-card p-3 shadow-xs transition-all active:scale-95 hover:bg-accent/40',
        isPracticedToday ? 'border-2 border-primary shadow-primary/10' : 'border border-border/60'
      )}
    >
      <div className="flex h-14 w-full items-center justify-center">
        <span
          className={cn(
            'font-medium tracking-tight text-foreground transition-transform group-hover:scale-105',
            isDigraph ? 'text-2xl' : 'text-3xl'
          )}
        >
          {glyph}
        </span>
      </div>
      <div className="w-full pt-1">
        <Progress value={score} className="h-1.5 w-full" aria-label={`Score: ${score}%`} />
      </div>
    </Link>
  );
}
