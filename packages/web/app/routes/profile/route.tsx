import type { User } from '@kana/helpers/auth/schemas';
import { cn } from 'cn';
import { ArrowLeft, Loader2, User as UserIcon } from 'lucide-react';
import { Link } from 'react-router';
import type { Route } from './+types/route';
import { Avatar, AvatarFallback } from '../../components/ui/avatar';
import { Button, buttonVariants } from '../../components/ui/button';
import { getStoredUser } from '../../helpers/user-storage';

export function meta({}: Route.MetaArgs) {
  return [
    { title: 'Profile - Kana' },
    { name: 'description', content: 'Manage your Kana profile and synchronization.' },
  ];
}

export type ProfileLoaderData = {
  user: User | null;
};

export function clientLoader(): ProfileLoaderData {
  return { user: getStoredUser() };
}

export function HydrateFallback({}: Route.HydrateFallbackProps) {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center p-6 text-center">
      <Loader2 className="text-muted-foreground size-8 animate-spin" aria-label="Loading profile" />
    </main>
  );
}

export function getInitials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) {
    return '';
  }
  const parts = trimmed.split(/\s+/);
  const first = parts[0] as string;
  if (parts.length === 1) {
    return first.slice(0, 1).toUpperCase();
  }
  const last = parts[parts.length - 1] as string;
  return (first.slice(0, 1) + last.slice(0, 1)).toUpperCase();
}

export default function Page({ loaderData }: Route.ComponentProps) {
  const user = loaderData.user;

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center p-6 text-center">
      <Link
        to="/"
        className="text-muted-foreground hover:text-foreground mb-6 self-start text-sm font-medium transition-colors select-none"
        aria-label="Home"
        draggable={false}
      >
        <ArrowLeft className="size-5" />
      </Link>

      <div className="flex w-full flex-col items-center gap-6 pt-4">
        {user ? (
          <>
            <Avatar className="border-border size-20 border">
              <AvatarFallback className="bg-muted text-muted-foreground text-xl font-semibold">
                {getInitials(user.name) || <UserIcon className="size-10" />}
              </AvatarFallback>
            </Avatar>

            <div className="flex flex-col items-center gap-1">
              <h1 className="text-foreground text-2xl font-bold tracking-tight">{user.name}</h1>
              <p className="text-muted-foreground text-xs">Last sync: Sep 13th, 2026 14:20:00</p>
            </div>

            <div className="w-full pt-2">
              <Button
                variant="outline"
                size="lg"
                className="w-full text-base font-semibold select-none"
                type="button"
              >
                Sign out
              </Button>
            </div>
          </>
        ) : (
          <>
            <Avatar className="border-border size-20 border">
              <AvatarFallback className="bg-muted text-muted-foreground">
                <UserIcon className="size-10" />
              </AvatarFallback>
            </Avatar>

            <div className="flex flex-col items-center gap-2">
              <h1 className="text-foreground text-2xl font-bold tracking-tight">Welcome back!</h1>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Sign in to sync your progress across all your devices and never lose your streak.
                It&apos;s completely free.
              </p>
            </div>

            <div className="flex w-full flex-col gap-3 pt-2">
              <Link
                to="/sign-in"
                className={cn(
                  buttonVariants({ variant: 'default', size: 'lg' }),
                  'w-full text-base font-semibold select-none'
                )}
                draggable={false}
              >
                Sign in
              </Link>
              <Link
                to="/create-account"
                className={cn(
                  buttonVariants({ variant: 'outline', size: 'lg' }),
                  'w-full text-base font-semibold select-none'
                )}
                draggable={false}
              >
                Create account
              </Link>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
