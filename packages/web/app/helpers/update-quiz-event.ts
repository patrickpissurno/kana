import type { QuizEvent, QuizResult } from '../types/quiz';
import { getDb, STORE_NAME } from './get-db';

export async function updateQuizEvent(
  id: number,
  result: Exclude<QuizResult, 'skipped'>
): Promise<void> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_NAME], 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    const getRequest = store.get(id);

    getRequest.onsuccess = () => {
      const record = getRequest.result as QuizEvent | undefined;
      if (!record) {
        reject(new Error(`Quiz event with id ${id} not found`));
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
