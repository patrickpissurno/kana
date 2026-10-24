import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import type { Route } from './+types/route';
import { PracticeResults } from '../../components/practice/practice-results';
import { PracticeSession } from '../../components/practice/practice-session';
import { HIRAGANA_ENTRIES, HIRAGANA_SECTIONS } from '../../data/hiragana';
import { loadLearnedGlyphs } from '../../helpers/load-learned-glyphs';
import { shuffleArray } from '../../helpers/shuffle-array';

export function meta({}: Route.MetaArgs) {
  return [
    { title: 'Practice - Kana' },
    { name: 'description', content: 'Practice Japanese Kana glyphs.' },
  ];
}

type PracticeStats = {
  correctCount: number;
  wrongCount: number;
  totalDurationMs: number;
};

const INITIAL_STATS: PracticeStats = {
  correctCount: 0,
  wrongCount: 0,
  totalDurationMs: 0,
};

export default function Page({}: Route.ComponentProps) {
  const [searchParams] = useSearchParams();
  const kind = searchParams.get('kind');
  const sectionId = searchParams.get('section');

  const isValidKind = kind === 'hiragana';
  const targetSection = sectionId
    ? HIRAGANA_SECTIONS.find((sec) => sec.id === sectionId)
    : undefined;
  const isInvalidSection = Boolean(sectionId && !targetSection);
  const isValidSession = isValidKind && !isInvalidSection;

  const scopeEntries = targetSection ? targetSection.entries : HIRAGANA_ENTRIES;

  const [queue, setQueue] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(() => isValidSession);
  const [isFinished, setIsFinished] = useState<boolean>(false);
  const [stats, setStats] = useState<PracticeStats>(INITIAL_STATS);

  useEffect(() => {
    let isMounted = true;

    if (isValidSession) {
      const candidateGlyphs = scopeEntries.map((entry) => entry.glyph);

      loadLearnedGlyphs(candidateGlyphs)
        .then((learnedGlyphs) => {
          if (!isMounted) {
            return;
          }

          if (learnedGlyphs.length > 0) {
            setQueue(shuffleArray(learnedGlyphs));
          }
          setIsLoading(false);
        })
        .catch(() => {
          if (isMounted) {
            setIsLoading(false);
          }
        });
    }

    return () => {
      isMounted = false;
    };
  }, [isValidSession, scopeEntries]);

  const handleAnswer = (result: { isCorrect: boolean; durationMs: number }) => {
    setStats((prev) => ({
      correctCount: prev.correctCount + (result.isCorrect ? 1 : 0),
      wrongCount: prev.wrongCount + (result.isCorrect ? 0 : 1),
      totalDurationMs: prev.totalDurationMs + result.durationMs,
    }));

    if (currentIndex + 1 < queue.length) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setIsFinished(true);
    }
  };

  if (!isValidSession) {
    return (
      <main className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center p-6 text-center">
        <h1 className="text-foreground mb-2 text-2xl font-bold tracking-tight">
          Practice Not Found
        </h1>
        <p className="text-muted-foreground mb-6 text-sm">
          The requested practice session was not recognized.
        </p>
        <Link replace to="/hiragana" className="text-primary text-sm font-semibold hover:underline">
          Return to Hiragana
        </Link>
      </main>
    );
  }

  if (isLoading) {
    return (
      <main className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center p-6 text-center">
        <p className="text-muted-foreground text-sm">Loading practice session...</p>
      </main>
    );
  }

  if (queue.length === 0) {
    return (
      <main className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center p-6 text-center">
        <h1 className="text-foreground mb-2 text-2xl font-bold tracking-tight">
          No Characters to Practice
        </h1>
        <p className="text-muted-foreground mb-6 text-sm">
          You haven't answered any characters in this section correctly yet. Practice individual
          characters first!
        </p>
        <Link replace to="/hiragana" className="text-primary text-sm font-semibold hover:underline">
          Return to Hiragana
        </Link>
      </main>
    );
  }

  if (isFinished) {
    return (
      <PracticeResults
        totalQuestions={queue.length}
        correctCount={stats.correctCount}
        wrongCount={stats.wrongCount}
        totalDurationMs={stats.totalDurationMs}
      />
    );
  }

  const currentGlyph = queue[currentIndex] as string;

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center p-6">
      <div className="flex w-full flex-col items-center justify-center py-6">
        <PracticeSession
          key={currentGlyph}
          glyph={currentGlyph}
          scopeEntries={scopeEntries}
          learnedGlyphs={queue}
          questionNumber={currentIndex + 1}
          totalQuestions={queue.length}
          onAnswer={handleAnswer}
        />
      </div>
    </main>
  );
}
