import type { QuizEvent } from '../types/quiz';
import { getDb, STORE_NAME } from './get-db';

export async function loadAllQuizEvents(): Promise<QuizEvent[]> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_NAME], 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      resolve(request.result as QuizEvent[]);
    };

    request.onerror = () => {
      reject(request.error ?? new Error('Failed to load quiz events'));
    };
  });
}
