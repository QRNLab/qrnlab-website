import { createContext, createEffect, createRoot, createSignal, useContext } from 'solid-js';
import type { Accessor, ParentProps } from 'solid-js';
import { api, ApiError } from './api';
import type {
  Me,
  Permission,
  Profile,
  SignInResponse,
  SignUpResponse,
} from './types';

/**
 * SESSION INTEGRATION
 * -------------------
 * Mount `<SessionProvider>` around the whole app so every route can read the
 * current session. The integrator should wrap `<App>` in `src/App.tsx`:
 *
 *   import { SessionProvider } from './lib/session';
 *
 *   export default function App() {
 *     return (
 *       <SessionProvider>
 *         <Router>...</Router>
 *       </SessionProvider>
 *     );
 *   }
 *
 * On mount the provider fetches `GET /api/me` and populates the store:
 *
 *   - `useSession()` → `{ session, loading, error, refresh, setProfile }`
 *   - `session` is `{ user, permissions, profile } | null`
 *   - `loading` is true until the first `/api/me` resolves
 *   - `refresh()` re-fetches `/api/me` (call after login/register/logout)
 *   - `setProfile()` optimistically updates `session.profile` after edits
 *
 * Auth forms call the exported plain actions (`login`, `register`, ...) and
 * then `refresh()` before navigating. `logoutAction()` is safe to pass to
 * `<AppShell onLogout={logoutAction} />` — it signs out and re-fetches
 * `/api/me` (now 401) to clear the session. Route guards (`RequireAuth`,
 * `RequirePermission`) live in `src/routes/guard.tsx`.
 */
export type SessionValue = {
  session: Accessor<Me | null>;
  loading: Accessor<boolean>;
  error: Accessor<string | null>;
  refresh: () => Promise<void>;
  setProfile: (profile: Profile | null) => void;
};

const SessionContext = createContext<SessionValue | undefined>(undefined);

/*
 * Module-level store (like `src/lib/toast.ts`). Kept outside the provider so
 * `logoutAction` can reach `refresh()` from an event handler, where Solid
 * context lookups are unavailable. The provider just owns the lifecycle.
 */
const store = createRoot(() => {
  const [session, setSession] = createSignal<Me | null>(null);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);

  const refresh = async (): Promise<void> => {
    setLoading(true);
    try {
      const me = await api<Me>('/me');
      setSession(me);
      setError(null);
    } catch (err) {
      setSession(null);
      if (err instanceof ApiError && err.status === 401) {
        // Not signed in — a normal state, not an error.
        setError(null);
      } else {
        setError(err instanceof Error ? err.message : 'Failed to load session.');
      }
    } finally {
      setLoading(false);
    }
  };

  const setProfile = (profile: Profile | null): void => {
    setSession((current) => (current ? { ...current, profile } : current));
  };

  return { session, loading, error, refresh, setProfile };
});

/** Context provider that fetches `/api/me` on mount. */
export function SessionProvider(props: ParentProps) {
  // Run in the effect phase (not during render) so the store's signal writes
  // are legal — a direct call would write reactive state in an owned scope.
  createEffect(() => undefined, () => {
    void store.refresh();
  });
  return <SessionContext value={store}>{props.children}</SessionContext>;
}

/** Read the current session. Throws outside of a `<SessionProvider>`. */
export function useSession(): SessionValue {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error('useSession must be used within a <SessionProvider>.');
  }
  return ctx;
}

/** True when the signed-in user holds the given permission. */
export function hasPermission(permission: Permission): boolean {
  const { session } = useSession();
  return session()?.permissions.includes(permission) ?? false;
}

/* --- Auth actions (plain async functions, not bound to the store) -------- */

export async function login(email: string, password: string): Promise<SignInResponse> {
  return api<SignInResponse>('/auth/sign-in/email', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function register(name: string, email: string, password: string): Promise<SignUpResponse> {
  return api<SignUpResponse>('/auth/sign-up/email', {
    method: 'POST',
    body: JSON.stringify({ name, email, password }),
  });
}

export async function logout(): Promise<void> {
  await api('/auth/sign-out', { method: 'POST', body: JSON.stringify({}) });
}

export async function requestVerification(email: string): Promise<void> {
  await api('/auth/send-verification-email', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export async function requestPasswordReset(email: string, redirectTo: string): Promise<void> {
  await api('/auth/request-password-reset', {
    method: 'POST',
    body: JSON.stringify({ email, redirectTo }),
  });
}

export async function resetPassword(newPassword: string, token: string): Promise<void> {
  await api('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ newPassword, token }),
  });
}

/**
 * Sign out and clear the session. Safe to pass to the AppShell `UserMenu`:
 * `<AppShell onLogout={logoutAction} />`.
 */
export async function logoutAction(): Promise<void> {
  try {
    await logout();
  } finally {
    await store.refresh();
  }
}
