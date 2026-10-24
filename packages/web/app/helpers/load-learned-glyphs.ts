import type { QuizEvent } from '../types/quiz';
import { QUIZ_RESULT } from '../types/quiz';
import { getDb, GLYPH_INDEX, STORE_NAME } from './get-db';

async function queryCandidate(index: IDBIndex, glyph: string): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const request = index.getAll(glyph);

    request.onsuccess = () => {
      const events = request.result as QuizEvent[];
      const isLearned = events.some((event) => event.result === QUIZ_RESULT.CORRECT);
      resolve(isLearned ? glyph : null);
    };

    request.onerror = () => {
      reject(request.error ?? new Error(`Failed to query events for glyph: ${glyph}`));
    };
  });
}

export async function loadLearnedGlyphs(candidateGlyphs: string[]): Promise<string[]> {
  if (candidateGlyphs.length === 0) {
    return [];
  }

  const db = await getDb();
  const tx = db.transaction([STORE_NAME], 'readonly');
  const index = tx.objectStore(STORE_NAME).index(GLYPH_INDEX);

  const queries = candidateGlyphs.map(async (glyph) => queryCandidate(index, glyph));
  const results = await Promise.all(queries);

  return results.filter((glyph): glyph is string => glyph !== null);
}
