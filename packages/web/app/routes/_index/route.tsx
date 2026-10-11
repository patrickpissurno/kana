import { cn } from 'cn';
import { Link } from 'react-router';
import type { Route } from './+types/route';
import { buttonVariants } from '../../components/ui/button';

export function meta({}: Route.MetaArgs) {
  return [
    { title: 'Kana - Learn Japanese' },
    { name: 'description', content: 'Master Japanese Hiragana with spaced repetition.' },
  ];
}

export default function Page({}: Route.ComponentProps) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center p-6 text-center">
      <div className="flex max-w-sm flex-col items-center gap-6">
        <div className="flex flex-col items-center gap-2">
          <span className="text-primary text-6xl font-bold tracking-tight">かな</span>
          <h1 className="text-foreground text-3xl font-extrabold tracking-tight">Kana</h1>
          <p className="text-muted-foreground text-sm">
            Master Japanese Hiragana with spaced repetition.
          </p>
        </div>
        <Link
          to="/hiragana"
          className={cn(buttonVariants({ size: 'lg' }), 'w-full text-base font-semibold')}
        >
          Practice Hiragana
        </Link>
      </div>
    </main>
  );
}
