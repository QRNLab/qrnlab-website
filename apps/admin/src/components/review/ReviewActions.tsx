import { createSignal, For, Show } from 'solid-js';
import { Button } from '../ui/Button';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { cn } from '../../lib/cn';

export type ReviewAction = {
  key: string;
  label: string;
  variant?: 'solid' | 'outline' | 'ghost' | 'destructive';
  disabled?: boolean;
  confirm?: { title: string; description: string; confirmLabel: string; destructive?: boolean };
  onRun: () => Promise<unknown>;
};

export type ReviewActionsProps = {
  actions: ReviewAction[];
  className?: string;
};

/** Uniform action bar (Publish/Reject/Approve/Delete) with busy + confirm handling. */
export function ReviewActions(props: ReviewActionsProps) {
  const [busy, setBusy] = createSignal<string | null>(null);
  const [confirming, setConfirming] = createSignal<ReviewAction | null>(null);

  const run = async (action: ReviewAction) => {
    if (action.confirm) {
      setConfirming(action);
      return;
    }
    await execute(action);
  };

  const execute = async (action: ReviewAction) => {
    setBusy(action.key);
    try {
      await action.onRun();
    } finally {
      setBusy(null);
      setConfirming(null);
    }
  };

  const anyBusy = () => busy() !== null;

  return (
    <div class={cn('flex flex-wrap items-center gap-2', props.className)}>
      <For each={props.actions}>
        {(action) => (
          <Button
            variant={action.variant ?? 'solid'}
            size="sm"
            isLoading={busy() === action.key}
            disabled={action.disabled || anyBusy()}
            onClick={() => run(action)}
          >
            {action.label}
          </Button>
        )}
      </For>

      <ConfirmDialog
        open={confirming() !== null}
        onClose={() => setConfirming(null)}
        onConfirm={() => {
          const action = confirming();
          if (action) return execute(action);
        }}
        title={confirming()?.confirm?.title ?? ''}
        description={confirming()?.confirm?.description}
        confirmLabel={confirming()?.confirm?.confirmLabel}
        destructive={confirming()?.confirm?.destructive}
      />
    </div>
  );
}
