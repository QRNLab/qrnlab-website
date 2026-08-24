import { cn } from '../../lib/cn';
import { Button } from './Button';

export type ErrorStateProps = {
  title?: string;
  message?: string;
  retry?: () => void;
  retryLabel?: string;
  class?: string;
};

export function ErrorState(props: ErrorStateProps) {
  return (
    <div class={cn('rounded-[var(--radius)] border border-red/40 bg-red/5 p-5', props.class)}>
      <div class="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-red">
        <span class="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
        {props.title ?? 'Error'}
      </div>
      <p class="mt-2 text-sm leading-relaxed text-fg-soft">
        {props.message ?? 'Something went wrong.'}
      </p>
      {props.retry && (
        <Button variant="outline" size="sm" class="mt-3" onClick={props.retry}>
          {props.retryLabel ?? 'Retry'}
        </Button>
      )}
    </div>
  );
}
