import type { ParentProps } from 'solid-js';
import { cn } from '../../lib/cn';

export type CardProps = ParentProps<{
  class?: string;
  padded?: boolean;
}>;

export function Card(props: CardProps) {
  return (
    <div
      class={cn(
        'rounded-[var(--radius)] border border-border bg-bg-raised shadow-[0_1px_0_rgba(22,35,63,0.04)]',
        props.padded !== false && 'p-5',
        props.class,
      )}
    >
      {props.children}
    </div>
  );
}

export type CardHeaderProps = ParentProps<{
  eyebrow?: string;
  title: string;
  description?: string;
  class?: string;
}>;

export function CardHeader(props: CardHeaderProps) {
  return (
    <div class={cn('mb-4 flex flex-col gap-1.5', props.class)}>
      {props.eyebrow && <span class="eyebrow eyebrow-cyan">{props.eyebrow}</span>}
      <h3 class="font-display text-[17px] font-semibold tracking-[-0.01em] text-fg">{props.title}</h3>
      {props.description && (
        <p class="max-w-prose text-sm leading-relaxed text-fg-soft">{props.description}</p>
      )}
    </div>
  );
}

export type CardContentProps = ParentProps<{
  class?: string;
}>;

export function CardContent(props: CardContentProps) {
  return <div class={cn('', props.class)}>{props.children}</div>;
}

export type CardFooterProps = ParentProps<{
  class?: string;
}>;

export function CardFooter(props: CardFooterProps) {
  return (
    <div class={cn('mt-4 flex items-center gap-3 border-t border-border pt-4', props.class)}>
      {props.children}
    </div>
  );
}
