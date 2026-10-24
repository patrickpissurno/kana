import type { Location } from 'react-router';
import { useLayoutEffect } from 'react';
import { useBlocker, useLocation } from 'react-router';

export type UsePreserveScrollPositionProps = {
  key: string;
  shouldSave: (next: Location) => boolean;
};

const scrollPositions = new Map<string, number>();

export function resetScrollPositionsForTesting(): void {
  scrollPositions.clear();
}

export function getScrollPositionForTesting(key: string): number | undefined {
  return scrollPositions.get(key);
}

export function usePreserveScrollPosition({
  key,
  shouldSave,
}: UsePreserveScrollPositionProps): void {
  const location = useLocation();

  useBlocker(({ nextLocation }) => {
    if (shouldSave(nextLocation)) {
      scrollPositions.set(key, Math.max(0, Math.round(window.scrollY)));
    } else {
      scrollPositions.delete(key);
    }
    return false;
  });

  useLayoutEffect(() => {
    const isRestoreScroll = Boolean(
      location.state &&
      typeof location.state === 'object' &&
      'restoreScroll' in location.state &&
      location.state.restoreScroll
    );

    if (isRestoreScroll) {
      const savedY = scrollPositions.get(key);
      if (savedY !== undefined && savedY > 0) {
        window.scrollTo(0, savedY);
      }
    }
  }, [key, location.state]);
}
