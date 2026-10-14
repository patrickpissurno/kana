import { loginCredentialsSchema } from '@kana/helpers/auth/schemas';
import { Field, ValidatedForm, validationError } from '@rvf/react-router';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useEffect } from 'react';
import { Link, useActionData, useNavigate, useNavigation } from 'react-router';
import type { Route } from './+types/route';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { setStoredUser } from '../../helpers/user-storage';

export function meta({}: Route.MetaArgs) {
  return [
    { title: 'Sign in - Kana' },
    { name: 'description', content: 'Sign in to sync your progress across devices.' },
  ];
}

export async function clientAction({ request }: Route.ClientActionArgs) {
  const formData = await request.formData();
  const backendUrl = import.meta.env['VITE_BACKEND_URL'] ?? '';
  const res = await fetch(`${backendUrl}/auth/login`, {
    method: 'POST',
    body: formData,
    mode: 'cors',
    credentials: 'include',
  });

  const data = await res.json();

  if (!res.ok) {
    if (data?.error?.fieldErrors) {
      return validationError({ fieldErrors: data.error.fieldErrors });
    }
    return {
      nonFieldError: data?.error?.nonFieldError ?? 'An unexpected error occurred',
    };
  }

  return {
    success: true,
    user: data,
  };
}

export default function Page({}: Route.ComponentProps) {
  const actionData = useActionData<typeof clientAction>();
  const navigate = useNavigate();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';

  useEffect(() => {
    if (actionData && 'success' in actionData && actionData.success && actionData.user) {
      setStoredUser(actionData.user);
      const maybePromise = navigate('/profile', { replace: true });
      if (maybePromise) {
        maybePromise.catch(() => undefined);
      }
    }
  }, [actionData, navigate]);

  const nonFieldError =
    actionData && 'nonFieldError' in actionData ? actionData.nonFieldError : null;

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center p-6 text-center">
      <Link
        to="/profile"
        className="text-muted-foreground hover:text-foreground mb-6 self-start text-sm font-medium transition-colors select-none"
        aria-label="Back"
        draggable={false}
      >
        <ArrowLeft className="size-5" />
      </Link>

      <div className="mb-6 flex w-full flex-col items-center gap-2">
        <h1 className="text-foreground text-2xl font-bold tracking-tight">Sign in</h1>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Sign in to sync your progress across all your devices and never lose your streak.
        </p>
      </div>

      {nonFieldError && (
        <div
          role="alert"
          className="border-destructive/30 bg-destructive/10 text-destructive mb-6 w-full rounded-2xl border p-3 text-center text-sm font-medium"
        >
          {nonFieldError}
        </div>
      )}

      <ValidatedForm
        schema={loginCredentialsSchema}
        defaultValues={{ email: '', password: '' }}
        method="post"
        className="flex w-full flex-col gap-4"
      >
        <Field name="email">
          {(field) => (
            <div className="flex flex-col gap-1.5 text-left">
              <Input
                {...field.getInputProps({
                  id: 'email',
                  type: 'email',
                  placeholder: 'Email',
                  autoComplete: 'email',
                  autoCapitalize: 'none',
                  autoCorrect: 'off',
                  spellCheck: false,
                  'aria-label': 'Email',
                  'aria-invalid': Boolean(field.error()),
                })}
              />
              {field.error() && (
                <p className="text-destructive text-xs font-medium">{field.error()}</p>
              )}
            </div>
          )}
        </Field>

        <Field name="password">
          {(field) => (
            <div className="flex flex-col gap-1.5 text-left">
              <Input
                {...field.getInputProps({
                  id: 'password',
                  type: 'password',
                  placeholder: 'Password',
                  autoComplete: 'current-password',
                  'aria-label': 'Password',
                  'aria-invalid': Boolean(field.error()),
                })}
              />
              {field.error() && (
                <p className="text-destructive text-xs font-medium">{field.error()}</p>
              )}
            </div>
          )}
        </Field>

        <div className="w-full pt-2">
          <Button
            type="submit"
            size="lg"
            disabled={isSubmitting}
            className="w-full text-base font-semibold select-none"
          >
            {isSubmitting ? (
              <Loader2 className="size-5 animate-spin" aria-label="Signing in..." />
            ) : (
              'Sign in'
            )}
          </Button>
        </div>
      </ValidatedForm>
    </main>
  );
}
