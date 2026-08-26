import { createEffect, createSignal, For, Show } from 'solid-js';
import type { ParentProps } from 'solid-js';
import { Loading } from 'solid-js';
import { useLinkState, useLocation } from '@solidjs/router';
import type { Permission } from '@qrnlab/shared';
import { cn } from '../../lib/cn';
import { useSession } from '../../lib/session';
import { useTheme } from '../../lib/theme';
import { OrbitLogo } from '../ui/OrbitLogo';
import { Skeleton } from '../ui/Skeleton';
import { UserMenu } from './UserMenu';

export type AppShellProps = ParentProps<{
  onLogout?: () => void;
}>;

const AUTH_ROUTES = ['/login', '/join', '/forgot-password', '/reset-password'];

type NavItem = {
  href: string;
  label: string;
  permission?: Permission;
};

const NAV_ITEMS: NavItem[] = [
  { href: '/', label: 'Dashboard' },
  { href: '/account', label: 'Profile' },
  { href: '/blog', label: 'Blog', permission: 'content.moderate' },
  { href: '/publications', label: 'Publications', permission: 'content.moderate' },
  { href: '/education', label: 'Education', permission: 'content.moderate' },
  { href: '/updates', label: 'Updates', permission: 'content.moderate' },
  { href: '/media', label: 'Media', permission: 'media.manage' },
  { href: '/team', label: 'Team', permission: 'team.review' },
  { href: '/users', label: 'Users', permission: 'users.manage' },
];

const FALLBACK_USER = { name: 'Guest', email: '', role: 'user' };

function SidebarLink(props: NavItem & { onNavigate?: () => void }) {
  const link = useLinkState(() => props.href);
  const isActive = () => link.current() || (props.href !== '/' && link.active());
  return (
    <a
      href={props.href}
      onClick={() => props.onNavigate?.()}
      aria-current={link.current() ? 'page' : undefined}
      class={cn(
        'flex items-center gap-2 border-l-2 py-2 pl-4 pr-2 font-mono text-[11.5px] uppercase tracking-[0.1em] transition-colors',
        isActive()
          ? 'border-amber text-fg'
          : 'border-transparent text-fg-faint hover:text-fg-soft',
      )}
    >
      {props.label}
    </a>
  );
}

function PageSkeleton() {
  return (
    <div class="flex flex-col gap-4">
      <div class="flex flex-col gap-2">
        <Skeleton class="h-3 w-40" />
        <Skeleton class="h-7 w-64" />
      </div>
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Skeleton class="h-24" />
        <Skeleton class="h-24" />
        <Skeleton class="h-24" />
        <Skeleton class="h-24" />
      </div>
      <Skeleton class="h-64" />
    </div>
  );
}

export function AppShell(props: AppShellProps) {
  const { theme, toggle } = useTheme();
  const { session } = useSession();
  const location = useLocation();
  const isAuthRoute = () => AUTH_ROUTES.some((p) => location.pathname === p);
  const user = () => session()?.user;
  const permissions = () => session()?.permissions ?? [];
  const navItems = () =>
    NAV_ITEMS.filter((item) => !item.permission || permissions().includes(item.permission));
  const [mobileOpen, setMobileOpen] = createSignal(false);
  const [desktop, setDesktop] = createSignal(true);

  createEffect(() => undefined, () => {
    const media = window.matchMedia('(min-width: 64rem)');
    const update = () => setDesktop(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  });

  createEffect(() => mobileOpen(), (open) => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileOpen(false);
    };
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  });

  const closeMobile = () => setMobileOpen(false);
  const isDark = () => theme() === 'dark';

  return (
    <Show
      when={isAuthRoute()}
      fallback={
        <div class="min-h-screen">
          <a
            href="#app-main"
            class="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:bg-amber focus:px-3 focus:py-2 focus:font-mono focus:text-xs focus:uppercase focus:tracking-[0.08em] focus:text-[#211404]"
          >
            Skip to content
          </a>

          <header class="glass sticky top-0 z-40 border-b border-border">
            <div class="flex h-14 items-center gap-3 px-4 sm:px-6">
              <button
                type="button"
                class="icon-btn lg:hidden"
                aria-label="Open navigation"
                aria-expanded={mobileOpen() ? 'true' : 'false'}
                onClick={() => setMobileOpen(true)}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" class="h-4 w-4" aria-hidden="true">
                  <path d="M3 6h18M3 12h18M3 18h18" />
                </svg>
              </button>

              <a href="/" class="flex items-center gap-2.5 lg:hidden" onClick={closeMobile}>
                <OrbitLogo size={26} />
                <span class="font-display text-[17px] font-semibold tracking-[-0.01em] text-fg">QRNLab</span>
              </a>

              <div class="ml-auto flex items-center gap-2">
                <button
                  type="button"
                  class="hidden h-8 items-center gap-2 rounded-[var(--radius)] border border-border bg-bg-raised px-3 font-mono text-[11px] uppercase tracking-[0.08em] text-fg-faint transition-colors hover:border-amber hover:text-fg sm:flex"
                  aria-label="Search (placeholder)"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" class="h-3.5 w-3.5" aria-hidden="true">
                    <circle cx="11" cy="11" r="7" />
                    <path d="m20 20-3.5-3.5" />
                  </svg>
                  Search
                  <kbd class="ml-1 rounded-[2px] border border-border px-1 text-[10px] text-fg-faint">⌘K</kbd>
                </button>

                <button
                  type="button"
                  class="icon-btn"
                  aria-label={isDark() ? 'Switch to light mode' : 'Switch to dark mode'}
                  onClick={toggle}
                >
                  {isDark() ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" class="h-4 w-4" aria-hidden="true">
                      <circle cx="12" cy="12" r="4.5" />
                      <path d="M12 2v2M12 20v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2 12h2M20 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" class="h-4 w-4" aria-hidden="true">
                      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
                    </svg>
                  )}
                </button>

                <UserMenu user={user() ?? FALLBACK_USER} onLogout={props.onLogout} />
              </div>
            </div>
          </header>

          <Show when={mobileOpen()}>
            <div
              class="fixed inset-0 z-30 bg-void/50 backdrop-blur-[2px] lg:hidden"
              onClick={closeMobile}
              aria-hidden="true"
            />
          </Show>

          <aside
            inert={desktop() || mobileOpen() ? undefined : true}
            class={cn(
              'fixed inset-y-0 left-0 z-40 w-[15rem] border-r border-border bg-bg-raised/70 backdrop-blur-sm transition-transform duration-200 lg:translate-x-0',
              mobileOpen() ? 'translate-x-0' : '-translate-x-full',
            )}
          >
            <nav class="flex h-full flex-col gap-0.5 px-3 py-4" aria-label="Primary">
              <a href="/" class="flex items-center gap-2.5 px-4 pb-4 pt-1" onClick={closeMobile}>
                <OrbitLogo size={26} />
                <span class="font-display text-[17px] font-semibold tracking-[-0.01em] text-fg">QRNLab</span>
              </a>
              <span class="px-4 pb-3 pt-1 font-mono text-[10px] uppercase tracking-[0.16em] text-fg-faint">
                Menu
              </span>
              <For each={navItems()}>
                {(item) => <SidebarLink href={item.href} label={item.label} onNavigate={closeMobile} />}
              </For>
            </nav>
          </aside>

          <div class="lg:pl-[15rem]">
            <main id="app-main" class="mx-auto max-w-[96rem] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
              <Loading fallback={<PageSkeleton />}>{props.children}</Loading>
            </main>
          </div>
        </div>
      }
    >
      <div class="dot-grid min-h-screen">
        <a href="#app-main" class="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:bg-amber focus:px-3 focus:py-2 focus:font-mono focus:text-xs focus:uppercase focus:tracking-[0.08em] focus:text-[#211404]">
          Skip to content
        </a>
        <main id="app-main" class="flex min-h-screen items-center justify-center px-4 py-10">
          {props.children}
        </main>
      </div>
    </Show>
  );
}
