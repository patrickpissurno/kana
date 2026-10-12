import type { ReactNode } from 'react';
import { cn } from 'cn';
import { useInitDb } from '../../helpers/use-init-db';

export function DbGate({ children }: { children: ReactNode }) {
  const { isIndicatorVisible, error } = useInitDb();

  return (
    <>
      {isIndicatorVisible && (
        <div
          role="status"
          aria-label="Loading application"
          className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950 p-4 text-neutral-400"
        >
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-700 border-t-neutral-200" />
            <span className="text-sm font-medium">Loading Kana...</span>
          </div>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950 p-4 text-neutral-300"
        >
          <div className="flex max-w-sm flex-col items-center gap-2 text-center">
            <h1 className="text-base font-semibold text-rose-400">Database Initialization Error</h1>
            <p className="text-sm text-neutral-400">{error.message}</p>
          </div>
        </div>
      )}

      <div className={cn('flex flex-1 flex-col', (isIndicatorVisible || error) && 'hidden')}>
        {children}
      </div>
    </>
  );
}
