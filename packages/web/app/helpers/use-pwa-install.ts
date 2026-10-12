import { useEffect, useState } from 'react';

export type BeforeInstallPromptEvent = {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
} & Event;

export function isIos(
  nav: Navigator | null = typeof navigator !== 'undefined' ? navigator : null
): boolean {
  if (!nav) {
    return false;
  }
  const isAppleDevice = /iphone|ipad|ipod/i.test(nav.userAgent);
  const isTouchMac = /macintosh/i.test(nav.userAgent) && nav.maxTouchPoints > 1;
  return isAppleDevice || isTouchMac;
}

export function isStandalone(
  win: Window | null = typeof window !== 'undefined' ? window : null,
  nav: Navigator | null = typeof navigator !== 'undefined' ? navigator : null
): boolean {
  if (!win) {
    return false;
  }
  const isStandaloneMedia =
    typeof win.matchMedia === 'function' && win.matchMedia('(display-mode: standalone)').matches;
  const isNavigatorStandalone =
    nav !== null && (nav as unknown as { standalone?: boolean }).standalone === true;
  return isStandaloneMedia || isNavigatorStandalone;
}

export function usePwaInstall() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setPromptEvent(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setPromptEvent(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const install = async () => {
    if (!promptEvent) {
      return;
    }
    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    if (choice.outcome === 'accepted') {
      setIsInstalled(true);
    }
    setPromptEvent(null);
  };

  return {
    canInstall: promptEvent !== null && !isInstalled,
    install,
  };
}
