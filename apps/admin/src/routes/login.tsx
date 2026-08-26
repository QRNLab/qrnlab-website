import { Show } from 'solid-js';
import { createSignal } from 'solid-js';
import { useNavigate, useSearchParams } from '@solidjs/router';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Field } from '../components/ui/Field';
import { Input } from '../components/ui/Input';
import { ApiError } from '../lib/api';
import { login, requestVerification, useSession } from '../lib/session';
import { toast } from '../lib/toast';

export default function Login() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { refresh } = useSession();

  const [email, setEmail] = createSignal('');
  const [password, setPassword] = createSignal('');
  const [error, setError] = createSignal<string | null>(null);
  const [unverified, setUnverified] = createSignal(false);
  const [submitting, setSubmitting] = createSignal(false);
  const [resending, setResending] = createSignal(false);
  const [resent, setResent] = createSignal(false);

  const redirectTo = () => {
    const redirect = params.redirect;
    if (typeof redirect === 'string' && redirect.startsWith('/') && !redirect.startsWith('//')) {
      return redirect;
    }
    return '/';
  };

  const onSubmit = async (event: SubmitEvent) => {
    event.preventDefault();
    setError(null);
    setUnverified(false);
    setSubmitting(true);
    try {
      await login(email().trim(), password());
      await refresh();
      navigate(redirectTo(), { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.code === 'EMAIL_NOT_VERIFIED') {
        setUnverified(true);
        toast.info('Email not verified', {
          description: 'Check your inbox, or resend the verification email below.',
        });
      } else {
        const message =
          err instanceof Error ? err.message : 'Sign-in failed. Check your credentials.';
        setError(message);
        toast.error('Sign-in failed', { description: message });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const onResend = async () => {
    if (!email().trim()) return;
    setResending(true);
    try {
      await requestVerification(email().trim());
      setResent(true);
      toast.success('Verification email sent');
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Could not send the email right now. Try again later.';
      toast.error('Could not send email', { description: message });
    } finally {
      setResending(false);
    }
  };

  return (
    <div class="mx-auto flex min-h-full max-w-sm flex-col justify-center gap-6 py-12">
      <header>
        <span class="eyebrow eyebrow-amber">Account</span>
        <h1 class="font-display text-2xl font-bold tracking-[-0.02em] text-fg sm:text-3xl">
          Sign in
        </h1>
        <p class="mt-2 max-w-prose text-sm leading-relaxed text-fg-soft">
          Access the QRNLab member portal.
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

          <Field label="Password" required>
            <Input
              type="password"
              name="password"
              value={password()}
              onInput={(event) => setPassword(event.currentTarget.value)}
              autocomplete="current-password"
              required
            />
          </Field>

          <Show when={error()}>
            <p role="alert" class="font-mono text-[11px] uppercase tracking-[0.06em] text-red">
              {error()}
            </p>
          </Show>

          <Show when={unverified()}>
            <div class="flex flex-col gap-2 rounded-[var(--radius)] border border-amber/40 bg-amber/10 p-3 text-sm leading-relaxed text-fg-soft">
              Your email is not verified yet. Check your inbox for the verification link.
              <Show when={resent()}>
                <span class="font-mono text-[11px] uppercase tracking-[0.06em] text-green">
                  Verification email sent — check your inbox.
                </span>
              </Show>
              <Button
                type="button"
                variant="outline"
                size="sm"
                class="self-start"
                onClick={onResend}
                isLoading={resending()}
                disabled={!email().trim()}
              >
                Resend verification email
              </Button>
            </div>
          </Show>

          <Button type="submit" fullWidth isLoading={submitting()}>
            Sign in
          </Button>
        </form>
      </Card>

      <div class="flex flex-col items-center gap-2 text-center text-sm leading-relaxed text-fg-soft">
        <a href="/forgot-password" class="text-amber hover:underline">
          Forgot your password?
        </a>
        <p>
          Not a member yet?{' '}
          <a href="/join" class="text-amber hover:underline">
            Register
          </a>
        </p>
      </div>
    </div>
  );
}
