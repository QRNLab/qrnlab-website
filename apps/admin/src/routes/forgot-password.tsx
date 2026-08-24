import { Show } from 'solid-js';
import { createSignal } from 'solid-js';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Field } from '../components/ui/Field';
import { Input } from '../components/ui/Input';
import { requestPasswordReset } from '../lib/session';
import { toast } from '../lib/toast';

export default function ForgotPassword() {
  const [email, setEmail] = createSignal('');
  const [error, setError] = createSignal<string | null>(null);
  const [submitting, setSubmitting] = createSignal(false);
  const [done, setDone] = createSignal(false);

  const onSubmit = async (event: SubmitEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      // better-auth appends `?token=...` to this URL after it verifies the
      // reset token, so point it at the SPA's reset-password route.
      const redirectTo = `${window.location.origin}/reset-password`;
      await requestPasswordReset(email().trim(), redirectTo);
      setDone(true);
      toast.success('Reset link sent', {
        description: 'Check your inbox for a password reset link.',
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Could not send the reset email. Try again later.';
      setError(message);
      toast.error('Could not send email', { description: message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div class="mx-auto flex min-h-full max-w-sm flex-col justify-center gap-6 py-12">
      <Show
        when={done()}
        fallback={
          <>
            <header>
              <span class="eyebrow eyebrow-amber">Account</span>
              <h1 class="font-display text-2xl font-bold tracking-[-0.02em] text-fg sm:text-3xl">
                Reset password
              </h1>
              <p class="mt-2 max-w-prose text-sm leading-relaxed text-fg-soft">
                Enter your email and we'll send you a link to set a new password.
              </p>
            </header>

            <Card>
              <form class="flex flex-col gap-4" onSubmit={onSubmit} novalidate>
                <Field label="Email" required>
                  <Input
                    type="email"
                    name="email"
                    value={email()}
                    onInput={(event) => setEmail(event.currentTarget.value)}
                    autocomplete="email"
                    placeholder="you@example.com"
                    required
                  />
                </Field>

                <Show when={error()}>
                  <p role="alert" class="font-mono text-[11px] uppercase tracking-[0.06em] text-red">
                    {error()}
                  </p>
                </Show>

                <Button type="submit" fullWidth isLoading={submitting()}>
                  Send reset link
                </Button>
              </form>
            </Card>

            <p class="text-center text-sm leading-relaxed text-fg-soft">
              Remembered it?{' '}
              <a href="/login" class="text-amber hover:underline">
                Sign in
              </a>
            </p>
          </>
        }
      >
        <Card>
          <div class="flex flex-col gap-3">
            <span class="eyebrow eyebrow-green">Check your email</span>
            <h1 class="font-display text-2xl font-bold tracking-[-0.02em] text-fg">
              Reset link sent
            </h1>
            <p class="text-sm leading-relaxed text-fg-soft">
              If an account exists for <span class="font-medium text-fg">{email()}</span>, we've
              sent a password reset link to it. Click the link to choose a new password.
            </p>
            <p class="text-sm leading-relaxed text-fg-soft">
              <a href="/login" class="text-amber hover:underline">
                Back to sign in
              </a>
            </p>
          </div>
        </Card>
      </Show>
    </div>
  );
}
