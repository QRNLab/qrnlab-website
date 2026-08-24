import { For } from 'solid-js';
import { Portal } from '@solidjs/web';
import { cn } from '../../lib/cn';
import { toast, useToasts } from '../../lib/toast';
import type { ToastT } from '../../lib/toast';
import { Spinner } from './Spinner';

export type ToasterPosition =
  | 'bottom-right'
  | 'top-right'
  | 'bottom-left'
  | 'top-left'
  | 'bottom-center'
  | 'top-center';

export type ToasterProps = {
  position?: ToasterPosition;
  closeButton?: boolean;
  richColors?: boolean;
};

const positionClasses: Record<ToasterPosition, string> = {
  'bottom-right': 'bottom-4 right-4 items-end',
  'top-right': 'top-4 right-4 items-start',
  'bottom-left': 'bottom-4 left-4 items-start',
  'top-left': 'top-4 left-4 items-start',
  'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2 items-center',
  'top-center': 'top-4 left-1/2 -translate-x-1/2 items-center',
};

const cardToneClasses: Record<ToastT['type'], string> = {
  success: 'border-green/40',
  error: 'border-red/40',
  warning: 'border-amber/40',
  info: 'border-cyan/40',
  loading: 'border-amber/40',
  default: 'border-border',
};

const inkToneClasses: Record<ToastT['type'], string> = {
  success: 'text-green',
  error: 'text-red',
  warning: 'text-amber',
  info: 'text-cyan',
  loading: 'text-amber',
  default: 'text-fg-soft',
};

const labels: Record<ToastT['type'], string> = {
  success: 'Success',
  error: 'Error',
  warning: 'Warning',
  info: 'Info',
  loading: 'Working',
  default: 'Notice',
};

function ToastCard(props: { toast: ToastT; closeButton?: boolean }) {
  const item = props.toast;
  return (
    <div
      role={item.type === 'error' ? 'alert' : 'status'}
      class={cn(
        'toast-in pointer-events-auto flex w-[20rem] max-w-[calc(100vw-2rem)] flex-col gap-1.5 rounded-[var(--radius)] border bg-bg-raised p-3.5 shadow-xl',
        cardToneClasses[item.type],
      )}
    >
      <div class="flex items-center gap-2">
        {item.type === 'loading' ? (
          <Spinner size={13} class={inkToneClasses[item.type]} />
        ) : (
          <span class={cn('h-1.5 w-1.5 rounded-full bg-current', inkToneClasses[item.type])} aria-hidden="true" />
        )}
        <span class={cn('font-mono text-[10px] uppercase tracking-[0.14em]', inkToneClasses[item.type])}>
          {labels[item.type]}
        </span>
        {props.closeButton && item.dismissible && (
          <button
            type="button"
            class="ml-auto text-fg-faint transition-colors hover:text-fg"
            aria-label="Dismiss notification"
            onClick={() => toast.dismiss(item.id)}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" class="h-3.5 w-3.5" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        )}
      </div>
      <div class="pr-1 font-display text-[13px] font-semibold leading-snug text-fg">{item.title}</div>
      {item.description && <p class="text-xs leading-relaxed text-fg-soft">{item.description}</p>}
    </div>
  );
}

export function Toaster(props: ToasterProps) {
  const toasts = useToasts();
  return (
    <Portal>
      <div
        class={cn(
          'pointer-events-none fixed z-[70] flex flex-col gap-2',
          positionClasses[props.position ?? 'bottom-right'],
        )}
        role="region"
        aria-label="Notifications"
        aria-live="polite"
      >
        <For each={toasts()}>{(item) => <ToastCard toast={item} closeButton={props.closeButton} />}</For>
      </div>
    </Portal>
  );
}
