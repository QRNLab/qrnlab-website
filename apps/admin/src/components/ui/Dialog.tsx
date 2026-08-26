import { createEffect, createUniqueId, Show } from 'solid-js';
import type { ParentProps } from 'solid-js';
import { Portal } from '@solidjs/web';
import { cn } from '../../lib/cn';

export type DialogSize = 'sm' | 'md' | 'lg';

export type DialogProps = ParentProps<{
  open: boolean | (() => boolean);
  onClose: () => void;
  title?: string;
  description?: string;
  size?: DialogSize;
  blockOverlayClose?: boolean;
  class?: string;
}>;

const sizeClasses: Record<DialogSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-2xl',
};

function getFocusable(root: HTMLElement): HTMLElement[] {
  return Array.from(
    root.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((el) => el.offsetParent !== null || el === document.activeElement);
}

export function Dialog(props: DialogProps) {
  const isOpen = () => (typeof props.open === 'function' ? (props.open as () => boolean)() : props.open);
  const titleId = createUniqueId();
  const descriptionId = createUniqueId();
  let panelRef: HTMLDivElement | undefined;

  const trapFocus = (event: KeyboardEvent) => {
    const root = panelRef;
    if (!root) return;
    const focusable = getFocusable(root);
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;
    if (event.shiftKey) {
      if (active === first || !root.contains(active)) {
        event.preventDefault();
        last.focus();
      }
    } else if (active === last || !root.contains(active)) {
      event.preventDefault();
      first.focus();
    }
  };

  createEffect(() => isOpen(), (open) => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        props.onClose();
      } else if (event.key === 'Tab') {
        trapFocus(event);
      }
    };
    document.addEventListener('keydown', onKeyDown, true);
    panelRef?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown, true);
      previous?.focus?.();
    };
  });

  return (
    <Portal>
      <Show when={isOpen()}>
        <div
          class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
          role="presentation"
          onClick={(event) => {
            if (!props.blockOverlayClose && event.target === event.currentTarget) props.onClose();
          }}
        >
          <div class="absolute inset-0 bg-void/60 backdrop-blur-[2px]" aria-hidden="true" />
          <div
            ref={(el) => {
              panelRef = el;
            }}
            role="dialog"
            aria-modal="true"
            aria-labelledby={props.title ? titleId : undefined}
            aria-describedby={props.description ? descriptionId : undefined}
            tabindex={-1}
            class={cn(
              'relative w-full rounded-[var(--radius)] border border-border bg-bg-raised p-6 shadow-2xl outline-none',
              sizeClasses[props.size ?? 'md'],
              props.class,
            )}
          >
            {props.title && (
              <h2 id={titleId} class="font-display text-lg font-semibold tracking-[-0.01em] text-fg">
                {props.title}
              </h2>
            )}
            {props.description && (
              <p id={descriptionId} class="mt-1 text-sm leading-relaxed text-fg-soft">
                {props.description}
              </p>
            )}
            <div class={cn(props.title && 'mt-4')}>{props.children}</div>
          </div>
        </div>
      </Show>
    </Portal>
  );
}
