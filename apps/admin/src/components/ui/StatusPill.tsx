import { cn } from '../../lib/cn';

export type StatusTone = 'amber' | 'cyan' | 'green' | 'red' | 'neutral';

export type StatusPillProps = {
  label: string;
  tone?: StatusTone;
  pulse?: boolean;
  class?: string;
};

const toneClasses: Record<StatusTone, string> = {
  amber: 'text-amber',
  cyan: 'text-cyan',
  green: 'text-green',
  red: 'text-red',
  neutral: 'text-fg-soft',
};

export function StatusPill(props: StatusPillProps) {
  const tone = () => props.tone ?? 'neutral';
  return (
    <span
      class={cn(
        'inline-flex items-center gap-2 rounded-full border border-border bg-bg-raised px-2.5 py-1 font-mono text-[10.5px] uppercase tracking-[0.08em] text-fg-soft',
        props.class,
      )}
    >
      <span
        class={cn(
          props.pulse === false ? 'status-dot-static' : 'status-dot',
          'h-1.5 w-1.5',
          toneClasses[tone()],
        )}
        aria-hidden="true"
      />
      {props.label}
    </span>
  );
}
