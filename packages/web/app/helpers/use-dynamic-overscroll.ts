import { useEffect } from 'react';
import { useLocation } from 'react-router';

const SUBPIXEL_THRESHOLD_PX = 1;

export function updateDynamicOverscroll(): void {
  const root = document.documentElement;
  const isScrollable = root.scrollHeight - root.clientHeight > SUBPIXEL_THRESHOLD_PX;
  const target = isScrollable ? 'auto' : 'none';

  if (root.style.overscrollBehaviorY !== target) {
    root.style.overscrollBehaviorY = target;
  }
}

export function useDynamicOverscroll(): void {
  const location = useLocation();

  useEffect(() => {
    updateDynamicOverscroll();

    const handleResize = () => {
      updateDynamicOverscroll();
    };

    window.addEventListener('resize', handleResize);

    const observer = new ResizeObserver(() => {
      updateDynamicOverscroll();
    });

    observer.observe(document.body);

    return () => {
      window.removeEventListener('resize', handleResize);
      observer.disconnect();
      document.documentElement.style.overscrollBehaviorY = '';
    };
  }, [location.pathname]);
}
