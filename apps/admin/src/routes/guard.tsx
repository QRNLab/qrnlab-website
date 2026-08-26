import { Show } from 'solid-js';
import { createEffect } from 'solid-js';
import type { ParentProps } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import type { Permission } from '@qrnlab/shared';
import { ErrorState } from '../components/ui/ErrorState';
import { Skeleton } from '../components/ui/Skeleton';
import { useSession } from '../lib/session';

function GuardSkeleton() {
  return (
    <div class="flex flex-col gap-4">
      <div class="flex flex-col gap-2">
        <Skeleton class="h-3 w-40" />
        <Skeleton class="h-7 w-64" />
      </div>
      <Skeleton class="h-64" />
    </div>
  );
}

/**
 * Blocks a route until a session is loaded, then redirects to `/login` if the
 * user is not signed in. Renders a skeleton while loading (or redirecting).
 */
export function RequireAuth(props: ParentProps) {
  const { session, loading } = useSession();
  const navigate = useNavigate();

  createEffect(
    () => ({ loading: loading(), session: session() }),
    ({ loading, session }) => {
      if (!loading && !session) {
        navigate('/login', { replace: true });
      }
    },
  );

  return (
    <Show when={loading() || !session()} fallback={props.children}>
      <GuardSkeleton />
    </Show>
  );
}

/**
 * Renders `children` only when the signed-in user holds `permission`;
 * otherwise an "access denied" ErrorState (client-side presentational guard —
 * the API enforces permissions server-side too).
 */
export function RequirePermission(props: ParentProps<{ permission: Permission }>) {
  const { session, loading } = useSession();

  return (
    <Show when={!loading()} fallback={<GuardSkeleton />}>
      <Show
        when={session()?.permissions.includes(props.permission) ?? false}
        fallback={
          <ErrorState
            title="Access denied"
            message={`You need the "${props.permission}" permission to view this page.`}
          />
        }
      >
        {props.children}
      </Show>
    </Show>
  );
}
