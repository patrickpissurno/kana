import type { QuizEvent } from '../types/quiz';
import { QUIZ_RESULT } from '../types/quiz';
import { getDb, STORE_NAME } from './get-db';

export async function appendQuizEvent(glyph: string): Promise<number> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_NAME], 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    const event: QuizEvent = {
      glyph,
      timestamp: Date.now(),
      result: QUIZ_RESULT.SKIPPED,
    };

    const request = store.add(event);

    request.onsuccess = () => {
      resolve(request.result as number);
    };

    request.onerror = () => {
      reject(request.error ?? new Error('Failed to append quiz event'));
    };
  });
}
