import { Download, Share, SquarePlus, X } from 'lucide-react';
import { useState } from 'react';
import { isIos, isStandalone, usePwaInstall } from '../../helpers/use-pwa-install';
import { Button } from '../ui/button';

export const PWA_INSTALL_DISMISSED_KEY = 'kana_pwa_install_dismissed';

export function isPermanentlyDismissed(
  storage: Storage | null = typeof localStorage !== 'undefined' ? localStorage : null
): boolean {
  if (!storage) {
    return false;
  }
  try {
    return storage.getItem(PWA_INSTALL_DISMISSED_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setPermanentlyDismissed(
  storage: Storage | null = typeof localStorage !== 'undefined' ? localStorage : null
): void {
  if (!storage) {
    return;
  }
  try {
    storage.setItem(PWA_INSTALL_DISMISSED_KEY, 'true');
  } catch {
    // Graceful fallback if localStorage is disabled
  }
}

export function InstallBanner() {
  const [dismissed, setDismissed] = useState(isPermanentlyDismissed);
  const [standalone] = useState(isStandalone);
  const [iosDevice] = useState(isIos);
  const { canInstall, install } = usePwaInstall();

  const handleInstall = () => {
    install().catch(() => undefined);
  };

  const handleDismiss = () => {
    setPermanentlyDismissed();
    setDismissed(true);
  };

  if (dismissed || standalone) {
    return null;
  }

  if (iosDevice) {
    return (
      <aside
        aria-label="Install Kana App"
        className="border-border bg-card/95 fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-md items-center justify-between gap-3 rounded-2xl border p-3.5 shadow-xl backdrop-blur-md select-none"
      >
        <div className="text-foreground flex items-center gap-3 text-sm">
          <Download className="text-primary size-5 shrink-0" aria-hidden="true" />
          <p className="leading-snug">
            To install, tap Share{' '}
            <Share className="text-primary inline size-4 align-text-bottom" aria-label="Share" />{' '}
            then &ldquo;Add to Home Screen&rdquo;{' '}
            <SquarePlus
              className="text-primary inline size-4 align-text-bottom"
              aria-label="Add to Home Screen"
            />
            .
          </p>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          className="text-muted-foreground hover:text-foreground rounded-full p-1 transition-colors"
          aria-label="Dismiss install banner"
        >
          <X className="size-4" />
        </button>
      </aside>
    );
  }

  if (!canInstall) {
    return null;
  }

  return (
    <aside
      aria-label="Install Kana App"
      className="border-border bg-card/95 fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-md items-center justify-between gap-3 rounded-2xl border p-3.5 shadow-xl backdrop-blur-md select-none"
    >
      <div className="text-foreground flex items-center gap-3 text-sm">
        <Download className="text-primary size-5 shrink-0" aria-hidden="true" />
        <span className="font-medium">Install Kana for offline practice</span>
      </div>
      <div className="flex items-center gap-2">
        <Button size="sm" onClick={handleInstall}>
          Install
        </Button>
        <button
          type="button"
          onClick={handleDismiss}
          className="text-muted-foreground hover:text-foreground rounded-full p-1 transition-colors"
          aria-label="Dismiss install banner"
        >
          <X className="size-4" />
        </button>
      </div>
    </aside>
  );
}
