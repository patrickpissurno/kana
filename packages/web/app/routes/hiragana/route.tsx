import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import type { GlyphItem } from '../../components/hiragana/glyph-section';
import type { QuizEvent } from '../../types/quiz';
import type { Route } from './+types/route';
import { GlyphSection } from '../../components/hiragana/glyph-section';
import { HIRAGANA_SECTIONS } from '../../data/hiragana';
import { calculateGlyphScore } from '../../helpers/calculate-glyph-score';
import { isPracticedToday } from '../../helpers/is-practiced-today';
import { loadAllQuizEvents } from '../../helpers/load-all-quiz-events';
import { shuffleArray } from '../../helpers/shuffle-array';

export function meta({}: Route.MetaArgs) {
  return [
    { title: 'Hiragana - Kana' },
    { name: 'description', content: 'Practice all 104 Japanese Hiragana glyphs.' },
  ];
}

type SectionState = {
  id: string;
  title: string;
  description: string;
  entries: GlyphItem[];
};

const INITIAL_SCORE = 0;

const CANONICAL_SECTIONS: SectionState[] = HIRAGANA_SECTIONS.map((section) => ({
  id: section.id,
  title: section.title,
  description: section.description,
  entries: section.entries.map((entry) => ({
    glyph: entry.glyph,
    score: INITIAL_SCORE,
    isPracticedToday: false,
  })),
}));

let sessionShuffledSections: SectionState[] | null = null;

function getSessionSections(): SectionState[] {
  sessionShuffledSections ??= HIRAGANA_SECTIONS.map((section) => {
    const shuffled = shuffleArray(section.entries);
    const entries: GlyphItem[] = shuffled.map((entry) => ({
      glyph: entry.glyph,
      score: INITIAL_SCORE,
      isPracticedToday: false,
    }));
    return {
      id: section.id,
      title: section.title,
      description: section.description,
      entries,
    };
  });
  return sessionShuffledSections;
}

function getInitialSections(): SectionState[] {
  if (sessionShuffledSections) {
    return structuredClone(sessionShuffledSections);
  }
  return structuredClone(CANONICAL_SECTIONS);
}

function groupEventsByGlyph(events: QuizEvent[]): Map<string, QuizEvent[]> {
  const map = new Map<string, QuizEvent[]>();
  for (const event of events) {
    const existing = map.get(event.glyph);
    if (existing) {
      existing.push(event);
    } else {
      map.set(event.glyph, [event]);
    }
  }
  return map;
}

export default function Page({}: Route.ComponentProps) {
  const [sections, setSections] = useState<SectionState[]>(getInitialSections);

  useEffect(() => {
    let isMounted = true;

    loadAllQuizEvents()
      .then((events) => {
        if (!isMounted) {
          return;
        }

        const eventsByGlyph = groupEventsByGlyph(events);
        const baseline = getSessionSections();

        const updated = baseline.map((section) => {
          const entries = section.entries.map((entry) => {
            const glyphEvents = eventsByGlyph.get(entry.glyph) ?? [];
            const score = calculateGlyphScore(glyphEvents);
            const practiced = isPracticedToday(glyphEvents);
            return {
              glyph: entry.glyph,
              score,
              isPracticedToday: practiced,
            };
          });

          entries.sort((a, b) => b.score - a.score);

          return {
            ...section,
            entries,
          };
        });

        setSections(updated);
      })
      .catch(() => {
        setSections(structuredClone(getSessionSections()));
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col px-4 py-6 sm:py-10">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
            ひらがな Hiragana
          </h1>
          <p className="text-muted-foreground text-sm">
            Select any character to practice. Sorted by mastery.
          </p>
        </div>
        <Link
          to="/"
          className="text-muted-foreground hover:text-foreground text-sm font-medium transition-colors"
        >
          Home
        </Link>
      </header>

      <div className="flex flex-col gap-6">
        {sections.map((section) => (
          <GlyphSection
            key={section.id}
            title={section.title}
            description={section.description}
            entries={section.entries}
          />
        ))}
      </div>
    </main>
  );
}
