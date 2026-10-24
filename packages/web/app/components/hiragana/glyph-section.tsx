import { cn } from 'cn';
import { Link } from 'react-router';
import { buttonVariants } from '../ui/button';
import { GlyphCard } from './glyph-card';

export type GlyphItem = {
  glyph: string;
  score: number;
  isPracticedToday: boolean;
  cooldownActive: boolean;
};

export type GlyphSectionProps = {
  sectionId?: string;
  title: string;
  description: string;
  entries: GlyphItem[];
  loading: boolean;
  canPractice?: boolean;
};

export function GlyphSection({
  sectionId,
  title,
  description,
  entries,
  loading,
  canPractice,
}: GlyphSectionProps) {
  return (
    <section className="mb-8 w-full">
      <div className="mb-3 flex items-center justify-between px-1">
        <div>
          <h2 className="text-foreground text-lg font-semibold tracking-tight">{title}</h2>
          <p className="text-muted-foreground text-xs">{description}</p>
        </div>
        {canPractice && sectionId && (
          <Link
            to={`/practice?kind=hiragana&section=${sectionId}`}
            className={cn(
              buttonVariants({ variant: 'outline', size: 'sm' }),
              'h-8 px-3 text-xs select-none'
            )}
            aria-label={`Practice ${title}`}
            draggable={false}
          >
            Practice
          </Link>
        )}
      </div>
      <div className="grid grid-cols-4 gap-2.5 sm:grid-cols-5">
        {entries.map((entry) => (
          <GlyphCard
            key={entry.glyph}
            glyph={entry.glyph}
            score={entry.score}
            isPracticedToday={entry.isPracticedToday}
            loading={loading}
            cooldownActive={entry.cooldownActive}
          />
        ))}
      </div>
    </section>
  );
}
