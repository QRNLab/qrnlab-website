import { createRoot, createSignal } from 'solid-js';

export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'loading' | 'default';

export type ToastT = {
  id: number;
  type: ToastType;
  title: string;
  description?: string;
  duration: number;
  dismissible: boolean;
};

export type ToastOptions = {
  description?: string;
  duration?: number;
  dismissible?: boolean;
};

export type ToastFn = ((title: string, data?: ToastOptions) => number) & {
  default: (title: string, data?: ToastOptions) => number;
  success: (title: string, data?: ToastOptions) => number;
  error: (title: string, data?: ToastOptions) => number;
  warning: (title: string, data?: ToastOptions) => number;
  info: (title: string, data?: ToastOptions) => number;
  loading: (title: string, data?: ToastOptions) => number;
  dismiss: (id?: number) => void;
};

const DEFAULT_DURATION = 4000;

/* ============ TOAST STORE ============ */
const store = createRoot(() => {
  const [toasts, setToasts] = createSignal<ToastT[]>([]);
  let nextId = 1;

  const dismiss = (id?: number) => {
    setToasts((list) => (id === undefined ? [] : list.filter((item) => item.id !== id)));
  };

  const push = (type: ToastType, title: string, data?: ToastOptions): number => {
    const id = nextId++;
    const duration = data?.duration ?? (type === 'loading' ? 0 : DEFAULT_DURATION);
    setToasts((list) => [
      ...list,
      { id, type, title, description: data?.description, duration, dismissible: data?.dismissible ?? true },
    ]);
    if (duration > 0) window.setTimeout(() => dismiss(id), duration);
    return id;
  };

  return { toasts, dismiss, push };
});

export function useToasts() {
  return store.toasts;
}

function toastFn(title: string, data?: ToastOptions): number {
  return store.push('default', title, data);
}
toastFn.default = (title: string, data?: ToastOptions) => store.push('default', title, data);
toastFn.success = (title: string, data?: ToastOptions) => store.push('success', title, data);
toastFn.error = (title: string, data?: ToastOptions) => store.push('error', title, data);
toastFn.warning = (title: string, data?: ToastOptions) => store.push('warning', title, data);
toastFn.info = (title: string, data?: ToastOptions) => store.push('info', title, data);
toastFn.loading = (title: string, data?: ToastOptions) => store.push('loading', title, data);
toastFn.dismiss = (id?: number) => store.dismiss(id);

export const toast: ToastFn = toastFn;
