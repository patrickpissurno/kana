import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import type { Route } from './+types/route';
import { getRandomQuizComponent } from '../../components/quiz/quiz-registry';
import { HIRAGANA_MAP } from '../../data/hiragana';
import { appendQuizEvent } from '../../helpers/append-quiz-event';
import { updateQuizEvent } from '../../helpers/update-quiz-event';
import { QUIZ_RESULT } from '../../types/quiz';

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
  const eventTimestampPromiseRef = useRef<Promise<number | null> | null>(null);

  useEffect(() => {
    if (!isValidGlyph) {
      return;
    }

    eventTimestampPromiseRef.current = appendQuizEvent(glyph).catch(() => null);
  }, [glyph, isValidGlyph]);

  const handleCorrect = () => {
    eventTimestampPromiseRef.current
      ?.then(async (timestamp) => {
        if (timestamp !== null) {
          await updateQuizEvent(timestamp, QUIZ_RESULT.CORRECT);
        }
      })
      .catch(() => {
        // IDB error handled gracefully
      });
  };

  const handleWrong = () => {
    eventTimestampPromiseRef.current
      ?.then(async (timestamp) => {
        if (timestamp !== null) {
          await updateQuizEvent(timestamp, QUIZ_RESULT.WRONG);
        }
      })
      .catch(() => {
        // IDB error handled gracefully
      });
  };

  if (!isValidGlyph) {
    return (
      <main className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center p-6 text-center">
        <h1 className="text-foreground mb-2 text-2xl font-bold tracking-tight">
          Character Not Found
        </h1>
        <p className="text-muted-foreground mb-6 text-sm">
          The requested kana character was not recognized.
        </p>
        <Link replace to="/hiragana" className="text-primary text-sm font-semibold hover:underline">
          Return to Hiragana
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center p-6">
      <div className="flex w-full flex-col items-center justify-center py-6">
        <QuizComponent glyph={glyph} onCorrectAnswer={handleCorrect} onWrongAnswer={handleWrong} />
      </div>
    </main>
  );
}
