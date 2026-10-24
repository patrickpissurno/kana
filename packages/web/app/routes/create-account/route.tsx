import { registerSchema } from '@kana/helpers/auth/schemas';
import { Field, useForm } from '@rvf/react-router';
import { cn } from 'cn';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useEffect } from 'react';
import { Link, useActionData, useNavigate } from 'react-router';
import { register } from '~/endpoints/auth/register';
import type { Route } from './+types/route';
import { Button, buttonVariants } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { getDeviceId } from '../../helpers/sync-storage';

export function meta({}: Route.MetaArgs) {
  return [
    { title: 'Create account - Kana' },
    { name: 'description', content: 'Create an account to sync your progress across devices.' },
  ];
}

export async function clientAction({ request }: Route.ClientActionArgs) {
  return register({ formData: await request.formData() });
}

export default function Page({}: Route.ComponentProps) {
  const actionData = useActionData<typeof clientAction>();
  const navigate = useNavigate();

  useEffect(() => {
    if (actionData?.data) {
      const maybePromise = navigate('/profile', { replace: true });
      if (maybePromise) {
        maybePromise.catch(() => undefined);
      }
    }
  }, [actionData, navigate]);

  const nonFieldError = actionData?.nonFieldError;

  const form = useForm({
    method: 'post',
    schema: registerSchema,
    validationBehaviorConfig: {
      initial: 'onSubmit',
      whenTouched: 'onSubmit',
      whenSubmitted: 'onSubmit',
    },
    defaultValues: { name: '', email: '', password: '' },
    otherFormProps: {
      noValidate: true,
    },
  });

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center p-6 text-center sm:pt-10">
      <Link
        replace
        to="/profile"
        className={cn(
          buttonVariants({ variant: 'ghost', size: 'icon' }),
          'text-muted-foreground hover:text-foreground select-none mb-6 self-start'
        )}
        aria-label="Back"
        draggable={false}
      >
        <ArrowLeft className="size-5" />
      </Link>

      <div className="mb-6 flex w-full flex-col items-center gap-2">
        <h1 className="text-foreground text-2xl font-bold tracking-tight">Create account</h1>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Create an account to sync your progress across all your devices and never lose your
          streak.
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

      <form {...form.getFormProps()} className="flex w-full flex-col gap-4">
        <input
          type="hidden"
          name="device_id"
          defaultValue={getDeviceId() ?? undefined}
          disabled={!getDeviceId()}
        />
        <Field scope={form.scope('name')}>
          {(field) => (
            <div className="flex flex-col gap-1.5 text-left">
              <Input
                {...field.getInputProps({
                  type: 'text',
                  placeholder: 'Name or nickname',
                  autoComplete: 'name',
                  autoCapitalize: 'words',
                  autoCorrect: 'off',
                  spellCheck: false,
                  'aria-label': 'Name',
                  'aria-invalid': Boolean(field.error()),
                })}
              />
              {field.error() && (
                <p className="text-destructive text-xs font-medium">{field.error()}</p>
              )}
            </div>
          )}
        </Field>

        <Field scope={form.scope('email')}>
          {(field) => (
            <div className="flex flex-col gap-1.5 text-left">
              <Input
                {...field.getInputProps({
                  type: 'text',
                  inputMode: 'email',
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

        <Field scope={form.scope('password')}>
          {(field) => (
            <div className="flex flex-col gap-1.5 text-left">
              <Input
                {...field.getInputProps({
                  type: 'password',
                  placeholder: 'Password',
                  autoComplete: 'new-password',
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
            disabled={form.formState.isSubmitting}
            className="w-full text-base font-semibold select-none"
          >
            {form.formState.isSubmitting ? (
              <Loader2 className="size-5 animate-spin" aria-label="Creating account..." />
            ) : (
              'Create account'
            )}
          </Button>
        </div>
      </form>
    </main>
  );
}
