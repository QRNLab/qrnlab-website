import type { ParentProps } from 'solid-js';
import { cn } from '../../lib/cn';

export type BadgeTone = 'neutral' | 'amber' | 'cyan' | 'green' | 'red';

export type BadgeProps = ParentProps<{
  tone?: BadgeTone;
  dot?: boolean;
  class?: string;
}>;

const toneClasses: Record<BadgeTone, string> = {
  neutral: 'border-border bg-fg/8 text-fg-soft',
  amber: 'border-amber/40 bg-amber/12 text-amber-ink',
  cyan: 'border-cyan/40 bg-cyan/12 text-cyan-ink',
  green: 'border-green/40 bg-green/12 text-green-ink',
  red: 'border-red/40 bg-red/12 text-red-ink',
};

export function Badge(props: BadgeProps) {
  return (
    <span
      class={cn(
        'inline-flex items-center gap-1.5 rounded-[var(--radius)] border px-2 py-0.5 font-mono text-[10.5px] font-medium uppercase tracking-[0.08em]',
        toneClasses[props.tone ?? 'neutral'],
        props.class,
      )}
    >
      {props.dot && <span class="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />}
      {props.children}
    </span>
  );
}
