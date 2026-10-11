import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import type { Route } from './+types/route';
import { getRandomQuizComponent } from '../../components/quiz/quiz-registry';
import { HIRAGANA_MAP } from '../../data/hiragana';
import { appendQuizEvent } from '../../helpers/append-quiz-event';
import { updateQuizEvent } from '../../helpers/update-quiz-event';

export function meta({}: Route.MetaArgs) {
  return [
    { title: 'Quiz - Kana' },
    { name: 'description', content: 'Practice Japanese Kana glyph.' },
  ];
}

export default function Page({}: Route.ComponentProps) {
  const [searchParams] = useSearchParams();
  const glyph = searchParams.get('glyph') ?? '';
  const isValidGlyph = HIRAGANA_MAP.has(glyph);

  const [QuizComponent] = useState(() => getRandomQuizComponent());
  const eventIdPromiseRef = useRef<Promise<number | null> | null>(null);

  useEffect(() => {
    if (!isValidGlyph) {
      return;
    }

    eventIdPromiseRef.current = appendQuizEvent(glyph).catch(() => null);
  }, [glyph, isValidGlyph]);

  const handleCorrect = () => {
    eventIdPromiseRef.current
      ?.then(async (id) => {
        if (id !== null) {
          await updateQuizEvent(id, 'correct');
        }
      })
      .catch(() => {
        // IDB error handled gracefully
      });
  };

  const handleWrong = () => {
    eventIdPromiseRef.current
      ?.then(async (id) => {
        if (id !== null) {
          await updateQuizEvent(id, 'wrong');
        }
      })
      .catch(() => {
        // IDB error handled gracefully
      });
  };

  if (!isValidGlyph) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-sm flex-col items-center justify-center p-6 text-center">
        <h1 className="text-foreground mb-2 text-2xl font-bold tracking-tight">
          Character Not Found
        </h1>
        <p className="text-muted-foreground mb-6 text-sm">
          The requested kana character was not recognized.
        </p>
        <Link to="/hiragana" className="text-primary text-sm font-semibold hover:underline">
          Return to Hiragana
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-between p-6">
      <header className="flex w-full items-center justify-between pt-2">
        <Link
          to="/hiragana"
          className="text-muted-foreground hover:text-foreground text-sm font-medium transition-colors"
        >
          ← Hiragana
        </Link>
      </header>

      <div className="flex w-full flex-col items-center justify-center py-10">
        <QuizComponent glyph={glyph} onCorrectAnswer={handleCorrect} onWrongAnswer={handleWrong} />
      </div>

      <footer className="pb-4 text-center">
        <span className="text-muted-foreground text-xs">Single-character quiz</span>
      </footer>
    </main>
  );
}
