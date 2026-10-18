import { useEffect } from 'react';
import { getSessionData } from './session-data-storage';
import { performQuizEventsSync } from './sync-quiz-events';

export function useSyncOnLoad(): void {
  useEffect(() => {
    const sessionData = getSessionData();
    if (!sessionData) {
      return;
    }

    performQuizEventsSync().catch(() => undefined);
  }, []);
}
