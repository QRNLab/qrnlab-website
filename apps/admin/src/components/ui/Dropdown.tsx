import { createContext, createEffect, createSignal, Show, useContext } from 'solid-js';
import type { Accessor, ParentProps } from 'solid-js';
import { cn } from '../../lib/cn';

type DropdownContextValue = {
  open: Accessor<boolean>;
  setOpen: (open: boolean) => void;
  registerContainer: (el: HTMLDivElement) => void;
  close: () => void;
};

const DropdownContext = createContext<DropdownContextValue | undefined>(undefined);

function useDropdownContext(): DropdownContextValue {
  const ctx = useContext(DropdownContext);
  if (!ctx) throw new Error('<DropdownTrigger>/<DropdownContent> must be used within <Dropdown>');
  return ctx;
}

export type DropdownProps = ParentProps<{
  class?: string;
}>;

export function Dropdown(props: DropdownProps) {
  const [open, setOpen] = createSignal(false);
  let containerRef: HTMLDivElement | undefined;

  const registerContainer = (el: HTMLDivElement) => {
    containerRef = el;
  };
  const close = () => setOpen(false);

  createEffect(() => open(), (o) => {
    if (!o) return;
    const onPointerDown = (event: PointerEvent) => {
      if (containerRef && !containerRef.contains(event.target as Node)) close();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
      }
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('keydown', onKeyDown, true);
    };
  });

  return (
    <DropdownContext value={{ open, setOpen, registerContainer, close }}>
      <div ref={registerContainer} class={cn('relative inline-block', props.class)}>
        {props.children}
      </div>
    </DropdownContext>
  );
}

export type DropdownTriggerProps = ParentProps<{
  class?: string;
  onClick?: (event: MouseEvent) => void;
}>;

export function DropdownTrigger(props: DropdownTriggerProps) {
  const ctx = useDropdownContext();
  return (
    <button
      type="button"
      aria-haspopup="menu"
      aria-expanded={ctx.open() ? 'true' : 'false'}
      class={props.class}
      onClick={(event) => {
        props.onClick?.(event);
        ctx.setOpen(!ctx.open());
      }}
    >
      {props.children}
    </button>
  );
}

export type DropdownContentProps = ParentProps<{
  align?: 'start' | 'end';
  class?: string;
}>;

function handleMenuKey(event: KeyboardEvent) {
  if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
  event.preventDefault();
  const menu = event.currentTarget as HTMLElement;
  const items = Array.from(menu.querySelectorAll<HTMLElement>('[role="menuitem"]:not([disabled])'));
  if (!items.length) return;
  const current =
    menu.querySelector<HTMLElement>('[role="menuitem"]:focus') ?? (document.activeElement as HTMLElement | null);
  const index = Math.max(0, items.indexOf(current as HTMLElement));
  let next: number;
  if (event.key === 'Home') next = 0;
  else if (event.key === 'End') next = items.length - 1;
  else if (event.key === 'ArrowDown') next = (index + 1) % items.length;
  else next = (index - 1 + items.length) % items.length;
  items[next].focus();
}

export function DropdownContent(props: DropdownContentProps) {
  const ctx = useDropdownContext();
  return (
    <Show when={ctx.open()}>
      <div
        role="menu"
        class={cn(
          'absolute z-40 mt-1 min-w-[12rem] rounded-[var(--radius)] border border-border bg-bg-raised p-1 shadow-xl',
          props.align === 'end' ? 'right-0' : 'left-0',
          props.class,
        )}
        onKeyDown={handleMenuKey}
      >
        {props.children}
      </div>
    </Show>
  );
}

export type DropdownItemProps = ParentProps<{
  onSelect?: () => void;
  disabled?: boolean;
  danger?: boolean;
  class?: string;
}>;

export function DropdownItem(props: DropdownItemProps) {
  const ctx = useDropdownContext();
  return (
    <button
      type="button"
      role="menuitem"
      disabled={props.disabled}
      class={cn(
        'flex w-full items-center gap-2 rounded-[var(--radius)] px-2.5 py-1.5 text-left font-mono text-[11.5px] uppercase tracking-[0.06em] transition-colors',
        props.danger ? 'text-red hover:bg-red/10' : 'text-fg-soft hover:bg-fg/5 hover:text-fg',
        props.disabled && 'pointer-events-none opacity-40',
        props.class,
      )}
      onClick={() => {
        props.onSelect?.();
        ctx.close();
      }}
    >
      {props.children}
    </button>
  );
}

export type DropdownLabelProps = ParentProps<{
  class?: string;
}>;

export function DropdownLabel(props: DropdownLabelProps) {
  return (
    <div
      class={cn('px-2.5 pb-1 pt-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-fg-faint', props.class)}
    >
      {props.children}
    </div>
  );
}

export function DropdownSeparator() {
  return <div role="separator" class="mx-1 my-1 h-px bg-border" />;
}
