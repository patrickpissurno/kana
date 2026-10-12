import { GlyphCard } from './glyph-card';

export type GlyphItem = {
  glyph: string;
  score: number;
  isPracticedToday: boolean;
  cooldownActive: boolean;
};

export type GlyphSectionProps = {
  title: string;
  description: string;
  entries: GlyphItem[];
  loading: boolean;
};

export function GlyphSection({ title, description, entries, loading }: GlyphSectionProps) {
  return (
    <section className="mb-8 w-full">
      <div className="mb-3 px-1">
        <h2 className="text-foreground text-lg font-semibold tracking-tight">{title}</h2>
        <p className="text-muted-foreground text-xs">{description}</p>
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
