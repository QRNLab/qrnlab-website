import type { ParentProps } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { cn } from '../../lib/cn';

export type EmptyStateProps = ParentProps<{
  title: string;
  description?: string;
  icon?: JSX.Element;
  action?: JSX.Element;
  lines?: boolean;
  class?: string;
}>;

export function EmptyState(props: EmptyStateProps) {
  return (
    <div
      class={cn(
        'flex min-h-[220px] flex-col items-start justify-center gap-2 rounded-[var(--radius)] border border-dashed border-border bg-transparent p-6',
        props.lines && 'empty-lines',
        props.class,
      )}
    >
      {props.icon && <div class="mb-1 text-fg-faint">{props.icon}</div>}
      <h3 class="font-display text-[15px] font-semibold text-fg-soft">{props.title}</h3>
      {props.description && (
        <p class="max-w-[32ch] text-sm leading-relaxed text-fg-faint">{props.description}</p>
      )}
      {props.action && <div class="mt-2">{props.action}</div>}
      {props.children}
    </div>
  );
}
