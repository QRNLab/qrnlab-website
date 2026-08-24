import { createSignal } from 'solid-js';
import { Button } from './Button';
import { Dialog } from './Dialog';

export type ConfirmDialogProps = {
  open: boolean | (() => boolean);
  onClose: () => void;
  onConfirm: () => void | Promise<unknown>;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  isLoading?: boolean;
};

export function ConfirmDialog(props: ConfirmDialogProps) {
  const [internalLoading, setInternalLoading] = createSignal(false);
  const loading = () => props.isLoading ?? internalLoading();

  const handleConfirm = async () => {
    setInternalLoading(true);
    try {
      await props.onConfirm();
    } finally {
      setInternalLoading(false);
    }
  };

  return (
    <Dialog open={props.open} onClose={props.onClose} title={props.title} description={props.description} size="sm">
      <div class="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={props.onClose} disabled={loading()}>
          {props.cancelLabel ?? 'Cancel'}
        </Button>
        <Button variant={props.destructive ? 'destructive' : 'solid'} onClick={handleConfirm} isLoading={loading()}>
          {props.confirmLabel ?? 'Confirm'}
        </Button>
      </div>
    </Dialog>
  );
}
