import { useEffect, useRef, useState } from 'react';

const THROTTLE_MS = 1000;

export function useWindowReactivation(): number {
  const [activationKey, setActivationKey] = useState(() => Date.now());
  const wasHiddenRef = useRef(false);
  const lastFiredRef = useRef(0);

  useEffect(() => {
    lastFiredRef.current = Date.now();

    const handleReactivation = () => {
      const now = Date.now();
      if (!wasHiddenRef.current) {
        return;
      }
      if (document.visibilityState !== 'visible') {
        return;
      }
      if (now - lastFiredRef.current < THROTTLE_MS) {
        return;
      }

      wasHiddenRef.current = false;
      lastFiredRef.current = now;
      setActivationKey(now);
    };

    const handleInactive = () => {
      wasHiddenRef.current = true;
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        handleInactive();
        return;
      }
      handleReactivation();
    };

    const handleWindowBlur = () => {
      handleInactive();
    };

    const handleWindowFocus = () => {
      handleReactivation();
    };

    const handlePageShow = (e: PageTransitionEvent) => {
      if (e.persisted) {
        wasHiddenRef.current = true;
        handleReactivation();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', handleWindowFocus);
    window.addEventListener('pageshow', handlePageShow);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('focus', handleWindowFocus);
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, []);

  return activationKey;
}
