export function registerServiceWorker(): void {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  const register = () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        window.addEventListener('online', () => {
          registration.update().catch(() => undefined);
        });
      })
      .catch(() => undefined);
  };

  if (document.readyState === 'complete') {
    register();
  } else {
    window.addEventListener('load', register);
  }
}
