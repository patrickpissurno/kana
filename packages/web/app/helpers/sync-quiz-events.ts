import type { QuizEvent, QuizResult } from '../types/quiz';
import { syncQuizEvents } from '../endpoints/sync/quiz-events';
import { getDb, STORE_NAME } from './get-db';
import { loadAllQuizEvents } from './load-all-quiz-events';
import { resolveEventCollision } from './resolve-event-collision';
import { getLastSyncedTimestamp, setLastSyncedTimestamp } from './sync-storage';

export async function performQuizEventsSync(): Promise<void> {
  try {
    const allEvents = await loadAllQuizEvents();
    const lastTimestamp = getLastSyncedTimestamp() ?? 0;
    const items =
      lastTimestamp > 0 ? allEvents.filter((e) => e.timestamp > lastTimestamp) : allEvents;

    const timestamps: number[] = [];
    const glyphs: string[] = [];
    const results: QuizResult[] = [];
    for (const item of items) {
      timestamps.push(item.timestamp);
      glyphs.push(item.glyph);
      results.push(item.result);
    }

    const response = await syncQuizEvents({ timestamps, glyphs, results });
    if (!response.data) {
      return;
    }

    const {
      timestamps: missingTimestamps,
      glyphs: missingGlyphs,
      results: missingResults,
    } = response.data;

    if (missingTimestamps.length > 0) {
      const db = await getDb();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction([STORE_NAME], 'readwrite');
        const store = tx.objectStore(STORE_NAME);

        const localMap = new Map<number, QuizEvent>();
        for (const event of allEvents) {
          localMap.set(event.timestamp, event);
        }

        let remaining = missingTimestamps.length;
        const handleSuccess = () => {
          remaining -= 1;
          if (remaining === 0) {
            resolve();
          }
        };
        const handleError = () => {
          reject(new Error('Transaction failed'));
        };

        for (let i = 0; i < missingTimestamps.length; i++) {
          const ts = missingTimestamps[i] as number;
          const glyph = missingGlyphs[i] as string;
          const res = missingResults[i] as QuizResult;
          const incomingEvent: QuizEvent = {
            timestamp: ts,
            glyph,
            result: res,
          };
          const existing = localMap.get(ts);
          const winner = existing ? resolveEventCollision(existing, incomingEvent) : incomingEvent;
          const req = store.put(winner);
          req.onsuccess = handleSuccess;
          req.onerror = handleError;
        }
      });
    }

    let maxTimestamp = lastTimestamp;
    for (const item of items) {
      if (item.timestamp > maxTimestamp) {
        maxTimestamp = item.timestamp;
      }
    }
    for (const ts of missingTimestamps) {
      if (ts > maxTimestamp) {
        maxTimestamp = ts;
      }
    }

    if (maxTimestamp > 0) {
      setLastSyncedTimestamp(maxTimestamp);
    }
  } catch {
    // Failures should be silently ignored (network issues, etc.)
  }
}
