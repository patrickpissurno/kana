import type { QuizEvent, QuizResult } from '../types/quiz';
import { QUIZ_RESULT } from '../types/quiz';
import { getDb, STORE_NAME } from './get-db';

export async function updateQuizEvent(
  timestamp: number,
  result: Exclude<QuizResult, typeof QUIZ_RESULT.SKIPPED>
): Promise<void> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_NAME], 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    const getRequest = store.get(timestamp);

    getRequest.onsuccess = () => {
      const record = getRequest.result as QuizEvent | undefined;
      if (!record) {
        reject(new Error(`Quiz event with timestamp ${timestamp} not found`));
        return;
      }

      record.result = result;
      const putRequest = store.put(record);

      putRequest.onsuccess = () => {
        resolve();
      };

      putRequest.onerror = () => {
        reject(putRequest.error ?? new Error('Failed to update quiz event'));
      };
    };

    getRequest.onerror = () => {
      reject(getRequest.error ?? new Error('Failed to find quiz event'));
    };
  });
}
