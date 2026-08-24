import { Show } from 'solid-js';
import { createSignal } from 'solid-js';
import { useNavigate, useSearchParams } from '@solidjs/router';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Field } from '../components/ui/Field';
import { Input } from '../components/ui/Input';
import { resetPassword } from '../lib/session';
import { toast } from '../lib/toast';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [password, setPassword] = createSignal('');
  const [confirm, setConfirm] = createSignal('');
  const [error, setError] = createSignal<string | null>(null);
  const [submitting, setSubmitting] = createSignal(false);

  const token = () => (typeof params.token === 'string' ? params.token : '');

  const onSubmit = async (event: SubmitEvent) => {
    event.preventDefault();
    setError(null);

    if (!token()) {
      setError('This reset link is invalid — it is missing a token.');
      return;
    }
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
      await resetPassword(password(), token());
      toast.success('Password updated', {
        description: 'You can now sign in with your new password.',
      });
      navigate('/login', { replace: true });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Could not reset your password.';
      setError(message);
      toast.error('Password reset failed', { description: message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div class="mx-auto flex min-h-full max-w-sm flex-col justify-center gap-6 py-12">
      <header>
        <span class="eyebrow eyebrow-amber">Account</span>
        <h1 class="font-display text-2xl font-bold tracking-[-0.02em] text-fg sm:text-3xl">
          Choose a new password
        </h1>
        <p class="mt-2 max-w-prose text-sm leading-relaxed text-fg-soft">
          Set a new password for your account.
        </p>
      </header>

      <Card>
        <form class="flex flex-col gap-4" onSubmit={onSubmit} novalidate>
          <Field
            label="New password"
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
            Update password
          </Button>
        </form>
      </Card>
    </div>
  );
}
