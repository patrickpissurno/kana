import { cn } from 'cn';
import { User } from 'lucide-react';
import { Link } from 'react-router';
import type { Route } from './+types/route';
import { InstallBanner } from '../../components/pwa/install-banner';
import { buttonVariants } from '../../components/ui/button';

export function meta({}: Route.MetaArgs) {
  return [
    { title: 'Kana - Learn Japanese' },
    { name: 'description', content: 'Master Japanese Hiragana with spaced repetition.' },
  ];
}

export default function Page({}: Route.ComponentProps) {
  return (
    <>
      <div className="absolute top-[env(safe-area-inset-top,0px)] w-full max-w-xl self-center px-4 pt-6 sm:pt-10">
        <Link
          replace
          to="/profile"
          className={cn(
            buttonVariants({ variant: 'ghost', size: 'icon' }),
            'text-muted-foreground hover:text-foreground select-none flex ml-auto'
          )}
          aria-label="Profile"
          draggable={false}
        >
          <User className="size-5" />
        </Link>
      </div>
      <main className="flex flex-1 flex-col items-center justify-center p-6 text-center">
        <div className="flex max-w-sm flex-col items-center gap-6">
          <div className="flex flex-col items-center gap-2">
            <span className="text-primary text-6xl font-bold tracking-tight">かな</span>
            <h1 className="text-foreground text-3xl font-extrabold tracking-tight">Kana</h1>
            <p className="text-muted-foreground text-sm">
              Master Japanese Hiragana with spaced repetition.
            </p>
          </div>
          <Link
            replace
            to="/hiragana"
            className={cn(
              buttonVariants({ size: 'lg' }),
              'w-full text-base font-semibold select-none'
            )}
            draggable={false}
          >
            Practice Hiragana
          </Link>
        </div>
      </main>
      <InstallBanner />
    </>
  );
}
