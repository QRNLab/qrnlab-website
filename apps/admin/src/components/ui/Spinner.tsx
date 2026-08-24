import { cn } from '../../lib/cn';

export type SpinnerProps = {
  class?: string;
  size?: number;
  strokeWidth?: number;
};

export function Spinner(props: SpinnerProps) {
  const size = () => props.size ?? 16;
  return (
    <svg
      class={cn('animate-spin shrink-0', props.class)}
      width={size()}
      height={size()}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        stroke-opacity="0.25"
        stroke-width={props.strokeWidth ?? 2}
      />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        stroke-width={props.strokeWidth ?? 2}
        stroke-linecap="round"
      />
    </svg>
  );
}
