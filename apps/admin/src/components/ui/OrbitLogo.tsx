import { cn } from '../../lib/cn';

export type OrbitLogoProps = {
  class?: string;
  size?: number;
  animated?: boolean;
};

export function OrbitLogo(props: OrbitLogoProps) {
  const size = () => props.size ?? 28;
  const animated = () => props.animated !== false;
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      width={size()}
      height={size()}
      class={cn('shrink-0', props.class)}
      aria-hidden="true"
    >
      <ellipse cx="50" cy="50" rx="40" ry="17" stroke="currentColor" stroke-width="2.2" opacity="0.7" />
      <g class={animated() ? 'orbit-anim' : undefined} style="transform-origin:50px 50px">
        <ellipse
          cx="50"
          cy="50"
          rx="40"
          ry="17"
          stroke="var(--color-amber)"
          stroke-width="2.2"
          transform="rotate(60 50 50)"
        />
      </g>
      <g class={animated() ? 'orbit-anim rev' : undefined} style="transform-origin:50px 50px">
        <ellipse
          cx="50"
          cy="50"
          rx="40"
          ry="17"
          stroke="var(--color-cyan)"
          stroke-width="2.2"
          transform="rotate(120 50 50)"
        />
      </g>
      <circle cx="50" cy="50" r="4" fill="currentColor" />
    </svg>
  );
}
