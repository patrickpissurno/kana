import type { QuizEvent } from '../types/quiz';
import { syncQuizEvents } from '../endpoints/sync/quiz-events';
import { getDb, STORE_NAME } from './get-db';
import { loadAllQuizEvents } from './load-all-quiz-events';
import { resolveEventCollision } from './resolve-event-collision';
import { getLastSyncedTimestamp, setLastSyncedTimestamp } from './sync-storage';

export const SYNC_MISMATCH_ERROR_PREFIX = 'Sync mismatch:';

async function upsertEvent(db: IDBDatabase, event: QuizEvent): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_NAME], 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const getReq = store.get(event.timestamp);

    getReq.onsuccess = () => {
      const existing = getReq.result as QuizEvent | undefined;
      const winner = existing ? resolveEventCollision(existing, event) : event;
      const putReq = store.put(winner);
      putReq.onsuccess = () => {
        resolve();
      };
      putReq.onerror = () => {
        reject(new Error('Failed to put quiz event'));
      };
    };

    getReq.onerror = () => {
      reject(new Error('Failed to get quiz event'));
    };
  });
}

async function upsertMissingEvents(db: IDBDatabase, missing: QuizEvent[]): Promise<void> {
  await Promise.all(missing.map(async (event) => upsertEvent(db, event)));
}

export async function performQuizEventsSync(): Promise<void> {
  try {
    const allEvents = await loadAllQuizEvents();
    const totalItems = allEvents.length;
    const lastTimestamp = getLastSyncedTimestamp() ?? 0;
    const items =
      lastTimestamp > 0 ? allEvents.filter((e) => e.timestamp > lastTimestamp) : allEvents;

    const response = await syncQuizEvents({ items, totalItems });
    if (!response.data) {
      return;
    }

    const { missing, totalItems: serverTotalItems } = response.data;

    if (missing.length > 0) {
      const db = await getDb();
      await upsertMissingEvents(db, missing);
    }

    const allEventsTimestamps = [
      lastTimestamp,
      ...items.map((i) => i.timestamp),
      ...missing.map((m) => m.timestamp),
    ];
    const maxTimestamp = Math.max(...allEventsTimestamps);
    if (maxTimestamp > 0) {
      setLastSyncedTimestamp(maxTimestamp);
    }

    const finalEvents = await loadAllQuizEvents();
    if (finalEvents.length < serverTotalItems) {
      console.error(
        `${SYNC_MISMATCH_ERROR_PREFIX} local count ${finalEvents.length} is less than server total ${serverTotalItems}`
      );
    }
  } catch {
    // Failures should be silently ignored (network issues, etc.)
  }
}
