import { createEffect, createRoot, createSignal } from 'solid-js';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'qrnlab-theme';

function readStoredTheme(): Theme | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored === 'light' || stored === 'dark' ? stored : null;
  } catch {
    return null;
  }
}

function systemTheme(): Theme {
  if (typeof window === 'undefined' || !window.matchMedia) return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  root.classList.toggle('dark', theme === 'dark');
  root.style.colorScheme = theme;
}

/* ============ THEME STORE ============ */
const store = createRoot(() => {
  const [theme, setTheme] = createSignal<Theme>(readStoredTheme() ?? systemTheme());

  createEffect(() => applyTheme(theme()));

  const media = window.matchMedia?.('(prefers-color-scheme: dark)');
  const onSystemChange = (event: MediaQueryListEvent) => {
    if (!readStoredTheme()) setTheme(event.matches ? 'dark' : 'light');
  };
  media?.addEventListener('change', onSystemChange);

  const toggle = () => {
    const next = theme() === 'dark' ? 'light' : 'dark';
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* storage unavailable */
    }
    setTheme(next);
  };

  return { theme, setTheme, toggle };
});

export function useTheme() {
  return store;
}
