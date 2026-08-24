import { cn } from '../../lib/cn';

export type SkeletonProps = {
  class?: string;
};

export function Skeleton(props: SkeletonProps) {
  return <div class={cn('animate-pulse rounded-[var(--radius)] bg-fg/8', props.class)} />;
}
