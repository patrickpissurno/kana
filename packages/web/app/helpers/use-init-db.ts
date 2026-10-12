import { useLayoutEffect, useState } from 'react';
import { getDb } from './get-db';

const SHOW_DELAY_MS = 150;
const MIN_DISPLAY_MS = 1000;

export type DbInitState = {
  isIndicatorVisible: boolean;
  error: Error | null;
};

export function useInitDb(): DbInitState {
  const [isIndicatorVisible, setIsIndicatorVisible] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useLayoutEffect(() => {
    const isMounted = { current: true };
    let indicatorShownAt: number | null = null;
    let showTimer: ReturnType<typeof setTimeout> | null = null;
    let hideTimer: ReturnType<typeof setTimeout> | null = null;

    const clearTimers = () => {
      if (showTimer) {
        clearTimeout(showTimer);
        showTimer = null;
      }
      if (hideTimer) {
        clearTimeout(hideTimer);
        hideTimer = null;
      }
    };

    const completeWithDelay = (onComplete: () => void) => {
      clearTimers();

      if (indicatorShownAt === null) {
        onComplete();
        return;
      }

      const elapsed = Date.now() - indicatorShownAt;
      const remaining = Math.max(0, MIN_DISPLAY_MS - elapsed);

      if (remaining > 0) {
        hideTimer = setTimeout(() => {
          onComplete();
        }, remaining);
      } else {
        onComplete();
      }
    };

    showTimer = setTimeout(() => {
      indicatorShownAt = Date.now();
      setIsIndicatorVisible(true);
    }, SHOW_DELAY_MS);

    getDb()
      .then(() => {
        if (!isMounted.current) {
          return;
        }
        completeWithDelay(() => {
          setIsIndicatorVisible(false);
        });
      })
      .catch((err: unknown) => {
        if (!isMounted.current) {
          return;
        }
        const resolvedError =
          err instanceof Error ? err : new Error('Database initialization failed');
        completeWithDelay(() => {
          setIsIndicatorVisible(false);
          setError(resolvedError);
        });
      });

    return () => {
      isMounted.current = false;
      clearTimers();
    };
  }, []);

  return { isIndicatorVisible, error };
}
