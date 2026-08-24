import { omit } from 'solid-js';
import type { ParentProps } from 'solid-js';
import type { IntrinsicElement, JSX } from '@solidjs/web';
import { cn } from '../../lib/cn';
import { Spinner } from './Spinner';

export type ButtonVariant = 'solid' | 'outline' | 'ghost' | 'destructive';
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'icon';

export type ButtonProps = ParentProps<{
  variant?: ButtonVariant;
  size?: ButtonSize;
  as?: IntrinsicElement;
  isLoading?: boolean;
  fullWidth?: boolean;
}> &
  JSX.ButtonHTMLAttributes<HTMLButtonElement> &
  JSX.AnchorHTMLAttributes<HTMLAnchorElement>;

const variantClasses: Record<ButtonVariant, string> = {
  solid: 'bg-amber border-amber text-[#211404] hover:bg-[#c97e21]',
  outline: 'bg-transparent border-border text-fg hover:border-fg hover:bg-fg/5',
  ghost: 'bg-transparent border-transparent text-fg-soft hover:text-fg hover:bg-fg/5',
  destructive: 'bg-red border-red text-white hover:bg-[#ad3f35]',
};

const sizeClasses: Record<ButtonSize, string> = {
  xs: 'h-7 gap-1.5 px-2.5 text-[11px]',
  sm: 'h-8 gap-1.5 px-3 text-xs',
  md: 'h-9 gap-2 px-4 text-xs',
  lg: 'h-10 gap-2 px-5 text-[13px]',
  icon: 'h-8 w-8 justify-center',
};

export function Button(props: ButtonProps) {
  const rest = omit(props, 'variant', 'size', 'as', 'isLoading', 'fullWidth', 'class', 'children');
  const variant = () => props.variant ?? 'solid';
  const size = () => props.size ?? 'md';

  const classes = () =>
    cn(
      'inline-flex select-none items-center justify-center whitespace-nowrap rounded-[var(--radius)] border font-mono uppercase tracking-[0.06em] transition-colors duration-150',
      'disabled:pointer-events-none disabled:opacity-50',
      variantClasses[variant()],
      sizeClasses[size()],
      props.fullWidth && 'w-full',
      props.isLoading && 'cursor-wait',
      props.class,
    );

  const content = () =>
    props.isLoading ? <Spinner size={14} class="text-current" /> : props.children;

  const isAnchor = () => props.as === 'a';

  if (isAnchor()) {
    return (
      <a
        {...(rest as JSX.AnchorHTMLAttributes<HTMLAnchorElement>)}
        href={props.href}
        class={classes()}
        aria-busy={props.isLoading ? 'true' : undefined}
      >
        {content()}
      </a>
    );
  }

  return (
    <button
      {...(rest as JSX.ButtonHTMLAttributes<HTMLButtonElement>)}
      type={props.type ?? 'button'}
      disabled={props.disabled || props.isLoading}
      class={classes()}
      aria-busy={props.isLoading ? 'true' : undefined}
    >
      {content()}
    </button>
  );
}
