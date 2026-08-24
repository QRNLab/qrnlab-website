import type { ParentProps } from 'solid-js';
import { cn } from '../../lib/cn';

export type LabelProps = ParentProps<{
  for?: string;
  required?: boolean;
  class?: string;
}>;

export function Label(props: LabelProps) {
  return (
    <label
      for={props.for}
      class={cn(
        'font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-fg-soft',
        props.class,
      )}
    >
      {props.children}
      {props.required && (
        <span class="text-amber" aria-hidden="true">
          {' '}
          *
        </span>
      )}
    </label>
  );
}
