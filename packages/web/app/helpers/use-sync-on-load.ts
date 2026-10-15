import { useEffect } from 'react';
import { performQuizEventsSync } from './sync-quiz-events';
import { getStoredUser } from './user-storage';

export function useSyncOnLoad(): void {
  useEffect(() => {
    const user = getStoredUser();
    if (!user) {
      return;
    }

    performQuizEventsSync().catch(() => undefined);
  }, []);
}
