import { cn } from 'cn';
import { ArrowLeft } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useOutletContext } from 'react-router';
import { buttonVariants } from '~/components/ui/button';
import type { GlyphItem } from '../../components/hiragana/glyph-section';
import type { UsePreserveScrollPositionProps } from '../../helpers/use-preserve-scroll-position';
import type { QuizEvent } from '../../types/quiz';
import type { Route } from './+types/route';
import { GlyphSection } from '../../components/hiragana/glyph-section';
import { HIRAGANA_SECTIONS } from '../../data/hiragana';
import { calculateGlyphScore } from '../../helpers/calculate-glyph-score';
import { isCooldownActive } from '../../helpers/is-cooldown-active';
import { isPracticedToday } from '../../helpers/is-practiced-today';
import { loadAllQuizEvents } from '../../helpers/load-all-quiz-events';
import { shuffleArray } from '../../helpers/shuffle-array';
import { usePreserveScrollPosition } from '../../helpers/use-preserve-scroll-position';
import { QUIZ_RESULT } from '../../types/quiz';

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
  canPractice: boolean;
};

const INITIAL_SCORE = 0;

const CANONICAL_SECTIONS: SectionState[] = HIRAGANA_SECTIONS.map((section) => ({
  id: section.id,
  title: section.title,
  description: section.description,
  canPractice: false,
  entries: section.entries.map((entry) => ({
    glyph: entry.glyph,
    score: INITIAL_SCORE,
    isPracticedToday: false,
    cooldownActive: false,
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
      cooldownActive: false,
    }));
    return {
      id: section.id,
      title: section.title,
      description: section.description,
      canPractice: false,
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

const SCROLL_CONFIG: UsePreserveScrollPositionProps = {
  key: 'hiragana',
  shouldSave: (next) => next.pathname === '/quiz' || next.pathname === '/practice',
};

export default function Page({}: Route.ComponentProps) {
  usePreserveScrollPosition(SCROLL_CONFIG);
  const outletContext = useOutletContext<{ activationKey?: number } | null>();
  const activationKey = outletContext?.activationKey;
  const [sections, setSections] = useState<SectionState[]>(getInitialSections);
  const [loading, setLoading] = useState(true);

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
          let hasLearned = false;
          const entries = section.entries.map((entry) => {
            const glyphEvents = eventsByGlyph.get(entry.glyph) ?? [];
            if (!hasLearned && glyphEvents.some((e) => e.result === QUIZ_RESULT.CORRECT)) {
              hasLearned = true;
            }
            const score = calculateGlyphScore(glyphEvents);
            const practiced = isPracticedToday(glyphEvents);
            const cooldown = isCooldownActive(glyphEvents);
            return {
              glyph: entry.glyph,
              score,
              isPracticedToday: practiced,
              cooldownActive: cooldown,
            };
          });

          entries.sort((a, b) => b.score - a.score);

          return {
            ...section,
            canPractice: hasLearned,
            entries,
          };
        });

        setSections(updated);
        setLoading(false);
      })
      .catch(() => {
        setSections(structuredClone(getSessionSections()));
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [activationKey]);

  const canPracticeAll = !loading && sections.some((section) => section.canPractice);

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col px-4 py-6 sm:py-10">
      <Link
        replace
        to="/"
        className={cn(
          buttonVariants({ variant: 'ghost', size: 'icon' }),
          'text-muted-foreground hover:text-foreground select-none mb-5'
        )}
        aria-label="Home"
        draggable={false}
      >
        <ArrowLeft className="size-5" />
      </Link>

      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
            ひらがな Hiragana
          </h1>
          <p className="text-muted-foreground text-sm">Select any character to practice</p>
        </div>
        {canPracticeAll && (
          <Link
            replace
            to="/practice?kind=hiragana"
            className={cn(buttonVariants({ variant: 'default', size: 'sm' }), 'select-none')}
            aria-label="Practice all Hiragana"
            draggable={false}
          >
            Practice
          </Link>
        )}
      </header>

      <div className="flex flex-col gap-6">
        {sections.map((section) => (
          <GlyphSection
            key={section.id}
            sectionId={section.id}
            title={section.title}
            description={section.description}
            entries={section.entries}
            loading={loading}
            canPractice={section.canPractice}
          />
        ))}
      </div>
    </main>
  );
}
