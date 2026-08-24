import { Show } from 'solid-js';
import { createSignal } from 'solid-js';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Field } from '../components/ui/Field';
import { Input } from '../components/ui/Input';
import { register, requestVerification } from '../lib/session';
import { toast } from '../lib/toast';

export default function Join() {
  const [name, setName] = createSignal('');
  const [email, setEmail] = createSignal('');
  const [password, setPassword] = createSignal('');
  const [confirm, setConfirm] = createSignal('');
  const [error, setError] = createSignal<string | null>(null);
  const [submitting, setSubmitting] = createSignal(false);
  const [done, setDone] = createSignal(false);
  const [resending, setResending] = createSignal(false);
  const [resent, setResent] = createSignal(false);

  const onSubmit = async (event: SubmitEvent) => {
    event.preventDefault();
    setError(null);

    if (password().length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password() !== confirm()) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      await register(name().trim(), email().trim(), password());
      setDone(true);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Could not create the account.';
      setError(message);
      toast.error('Registration failed', { description: message });
    } finally {
      setSubmitting(false);
    }
  };

  const onResend = async () => {
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
      <Show
        when={done()}
        fallback={
          <>
            <header>
              <span class="eyebrow eyebrow-amber">Account</span>
              <h1 class="font-display text-2xl font-bold tracking-[-0.02em] text-fg sm:text-3xl">
                Register
              </h1>
              <p class="mt-2 max-w-prose text-sm leading-relaxed text-fg-soft">
                Create an account to manage content and your QRNLab profile.
              </p>
            </header>

            <Card>
              <form class="flex flex-col gap-4" onSubmit={onSubmit} novalidate>
                <Field label="Full name" required>
                  <Input
                    type="text"
                    name="name"
                    value={name()}
                    onInput={(event) => setName(event.currentTarget.value)}
                    autocomplete="name"
                    placeholder="Ada Lovelace"
                    required
                  />
                </Field>

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

                <Field
                  label="Password"
                  hint="At least 8 characters."
                  required
                >
                  <Input
                    type="password"
                    name="password"
                    value={password()}
                    onInput={(event) => setPassword(event.currentTarget.value)}
                    autocomplete="new-password"
                    minlength={8}
                    required
                  />
                </Field>

                <Field label="Confirm password" required>
                  <Input
                    type="password"
                    name="confirmPassword"
                    value={confirm()}
                    onInput={(event) => setConfirm(event.currentTarget.value)}
                    autocomplete="new-password"
                    required
                  />
                </Field>

                <Show when={error()}>
                  <p role="alert" class="font-mono text-[11px] uppercase tracking-[0.06em] text-red">
                    {error()}
                  </p>
                </Show>

                <Button type="submit" fullWidth isLoading={submitting()}>
                  Create account
                </Button>
              </form>
            </Card>

            <p class="text-center text-sm leading-relaxed text-fg-soft">
              Already have an account?{' '}
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
              Verify your address
            </h1>
            <p class="text-sm leading-relaxed text-fg-soft">
              We sent a verification email to <span class="font-medium text-fg">{email()}</span>.
              Click the link to verify your account, then sign in.
            </p>
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
            >
              Resend verification email
            </Button>
            <p class="text-sm leading-relaxed text-fg-soft">
              Already verified?{' '}
              <a href="/login" class="text-amber hover:underline">
                Sign in
              </a>
            </p>
          </div>
        </Card>
      </Show>
    </div>
  );
}
