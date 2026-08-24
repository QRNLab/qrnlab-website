import { omit } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { cn } from '../../lib/cn';
import { useFieldContext } from './Field';

export type TextareaProps = JSX.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  invalid?: boolean;
};

export function Textarea(props: TextareaProps) {
  const field = useFieldContext();
  const rest = omit(props, 'invalid', 'class', 'id', 'aria-invalid', 'aria-describedby', 'children');

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
  const rows = () => (typeof props.rows === 'number' ? props.rows : 4);

  const classes = () =>
    cn(
      'w-full rounded-[var(--radius)] border bg-bg-raised px-3 py-2 text-sm leading-relaxed text-fg placeholder:text-fg-faint transition-colors',
      invalid() ? 'border-red hover:border-red' : 'border-border hover:border-fg-faint',
      'focus:outline-none focus-visible:border-amber focus-visible:ring-2 focus-visible:ring-amber/50',
      'disabled:cursor-not-allowed disabled:opacity-50',
      props.class,
    );

  return (
    <textarea
      {...rest}
      id={id()}
      rows={rows()}
      aria-invalid={invalid() ? 'true' : undefined}
      aria-describedby={describedBy()}
      class={classes()}
    />
  );
}
