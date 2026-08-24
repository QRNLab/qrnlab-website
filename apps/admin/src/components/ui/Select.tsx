import { omit } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { cn } from '../../lib/cn';
import { useFieldContext } from './Field';

export type SelectProps = JSX.SelectHTMLAttributes<HTMLSelectElement> & {
  invalid?: boolean;
  placeholderOption?: string;
};

export function Select(props: SelectProps) {
  const field = useFieldContext();
  const rest = omit(props, 'invalid', 'class', 'id', 'aria-invalid', 'aria-describedby', 'placeholderOption', 'children');

  const id = () => props.id ?? field?.fieldId;

  const describedBy = () => {
    const ids: string[] = [];
    const own = typeof props['aria-describedby'] === 'string' ? props['aria-describedby'] : undefined;
    if (own) ids.push(own);
    if (field?.hasHint() && !own?.includes(field.hintId)) ids.push(field.hintId);
    if (field?.hasError() && !own?.includes(field.errorId)) ids.push(field.errorId);
    return ids.length ? ids.join(' ') : undefined;
  };

  const invalid = () => Boolean(props.invalid || field?.hasError());

  const classes = () =>
    cn(
      'h-9 w-full appearance-none rounded-[var(--radius)] border bg-bg-raised pl-3 pr-9 text-sm text-fg transition-colors',
      invalid() ? 'border-red hover:border-red' : 'border-border hover:border-fg-faint',
      'focus:outline-none focus-visible:border-amber focus-visible:ring-2 focus-visible:ring-amber/50',
      'disabled:cursor-not-allowed disabled:opacity-50',
      props.class,
    );

  return (
    <div class="relative">
      <select
        {...rest}
        id={id()}
        aria-invalid={invalid() ? 'true' : undefined}
        aria-describedby={describedBy()}
        class={classes()}
      >
        {props.placeholderOption !== undefined && (
          <option value="" disabled>
            {props.placeholderOption}
          </option>
        )}
        {props.children}
      </select>
      <svg
        class="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-fg-faint"
        viewBox="0 0 16 16"
        fill="none"
        aria-hidden="true"
      >
        <path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" />
      </svg>
    </div>
  );
}
