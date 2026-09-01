import { createEffect, createSignal, For, Show } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { TEAM_ROLES } from '@qrnlab/shared';
import { cn } from '../../lib/cn';
import { useFieldContext } from './Field';

export type RoleSelectProps = {
  value?: string;
  onSelect?: (value: string) => void;
  invalid?: boolean;
  id?: string;
  disabled?: boolean;
  'aria-describedby'?: string;
  class?: string;
};

const NONE_OPTION = { value: '', hint: 'No role' };

export function RoleSelect(props: RoleSelectProps) {
  const field = useFieldContext();
  const [open, setOpen] = createSignal(false);
  const [highlighted, setHighlighted] = createSignal(0);
  let rootRef: HTMLDivElement | undefined;
  let panelRef: HTMLDivElement | undefined;

  const options = () => [NONE_OPTION, ...TEAM_ROLES];

  const selectedIndex = () =>
    Math.max(0, options().findIndex((option) => option.value === props.value));

  const id = () => props.id ?? field?.fieldId;

  const describedBy = () => {
    const ids: string[] = [];
    const own = props['aria-describedby'];
    if (own) ids.push(own);
    if (field?.hasHint() && !own?.includes(field.hintId)) ids.push(field.hintId);
    if (field?.hasError() && !own?.includes(field.errorId)) ids.push(field.errorId);
    return ids.length ? ids.join(' ') : undefined;
  };

  const invalid = () => Boolean(props.invalid || field?.hasError());

  const openListbox = () => {
    setHighlighted(selectedIndex());
    setOpen(true);
  };

  createEffect(() => open(), (isOpen) => {
    if (!isOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (rootRef && !rootRef.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('keydown', onKeyDown, true);
    };
  });

  createEffect(() => open(), (isOpen) => {
    if (!isOpen) return;
    queueMicrotask(() => {
      const items = panelRef?.querySelectorAll<HTMLElement>('[role="option"]');
      const target = items?.[highlighted()];
      target?.focus();
    });
  });

  const onTriggerKeyDown = (event: KeyboardEvent) => {
    if (props.disabled) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'Enter' || event.key === ' ') {
      if (!open()) {
        event.preventDefault();
        openListbox();
      }
    }
  };

  const handleListboxKey = (event: KeyboardEvent) => {
    if (event.key === 'Tab') {
      setOpen(false);
      return;
    }
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const items = Array.from(
      panelRef?.querySelectorAll<HTMLElement>('[role="option"]:not([disabled])') ?? [],
    );
    if (!items.length) return;
    const current = document.activeElement as HTMLElement | null;
    let index = Math.max(0, items.indexOf(current as HTMLElement));
    if (event.key === 'Home') index = 0;
    else if (event.key === 'End') index = items.length - 1;
    else if (event.key === 'ArrowDown') index = (index + 1) % items.length;
    else if (event.key === 'ArrowUp') index = (index - 1 + items.length) % items.length;
    setHighlighted(index);
    items[index].focus();
  };

  return (
    <div ref={rootRef} class={cn('relative', props.class)}>
      <button
        type="button"
        id={id()}
        aria-haspopup="listbox"
        aria-expanded={open() ? 'true' : 'false'}
        aria-invalid={invalid() ? 'true' : undefined}
        aria-describedby={describedBy()}
        disabled={props.disabled}
        class={cn(
          'relative flex h-9 w-full items-center rounded-[var(--radius)] border bg-bg-raised pl-3 pr-9 text-sm transition-colors',
          invalid() ? 'border-red hover:border-red' : 'border-border hover:border-fg-faint',
          'focus:outline-none focus-visible:border-amber focus-visible:ring-2 focus-visible:ring-amber/50',
          'disabled:cursor-not-allowed disabled:opacity-50',
          props.value ? 'text-fg' : 'text-fg-faint',
        )}
        onClick={() => (open() ? setOpen(false) : openListbox())}
        onKeyDown={onTriggerKeyDown}
      >
        <span class="truncate">{props.value || 'Select a role'}</span>
        <svg
          class="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-fg-faint"
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden="true"
        >
          <path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" />
        </svg>
      </button>

      <Show when={open()}>
        <div
          ref={panelRef}
          role="listbox"
          aria-label="Role"
          class="absolute z-40 mt-1 w-full min-w-[16rem] rounded-[var(--radius)] border border-border bg-bg-raised p-1 shadow-xl"
          onKeyDown={handleListboxKey}
        >
          <button
            type="button"
            role="option"
            aria-selected={props.value === NONE_OPTION.value ? 'true' : 'false'}
            class={cn(
              'flex w-full items-center rounded-[var(--radius)] px-3 py-1.5 text-left font-mono text-[11px] uppercase tracking-[0.06em] transition-colors focus:outline-none',
              props.value === NONE_OPTION.value
                ? 'bg-amber/10 text-amber'
                : 'text-fg-faint hover:bg-fg/5 hover:text-fg',
            )}
            onClick={() => {
              props.onSelect?.(NONE_OPTION.value);
              setOpen(false);
            }}
            onFocus={() => setHighlighted(0)}
          >
            {NONE_OPTION.hint}
          </button>
          <div role="separator" class="mx-1 my-1 h-px bg-border" />
          <For each={TEAM_ROLES}>
            {(option, i) => {
              const isSelected = () => option.value === props.value;
              return (
                <button
                  type="button"
                  role="option"
                  aria-selected={isSelected() ? 'true' : 'false'}
                  class={cn(
                    'flex w-full flex-col gap-0.5 rounded-[var(--radius)] px-3 py-2 text-left transition-colors focus:outline-none',
                    isSelected() ? 'bg-amber/10' : 'hover:bg-fg/5',
                  )}
                  onClick={() => {
                    props.onSelect?.(option.value);
                    setOpen(false);
                  }}
                  onFocus={() => setHighlighted(i() + 1)}
                >
                  <span
                    class={cn(
                      'text-sm font-medium text-fg',
                      isSelected() && 'text-amber',
                    )}
                  >
                    {option.value}
                  </span>
                  <span class="text-xs leading-snug text-fg-faint">{option.hint}</span>
                </button>
              );
            }}
          </For>
        </div>
      </Show>
    </div>
  );
}
