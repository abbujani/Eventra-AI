import { Trash2 } from 'lucide-react';
import { Button } from './Button.js';
import { Modal } from './Modal.js';

interface ConfirmDeleteDialogProps {
  open: boolean;
  title?: string;
  itemName?: string | null;
  description?: string;
  onCancel: () => void;
  onConfirm: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
}

export function ConfirmDeleteDialog({
  open,
  title = 'Delete item',
  itemName,
  description,
  onCancel,
  onConfirm,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
}: ConfirmDeleteDialogProps) {
  const defaultDescription = itemName ? `Delete “${itemName}”?` : 'Delete this item? This action cannot be undone.';

  return (
    <Modal open={open} onClose={onCancel} title={title} size="sm">
      <p className="text-sm text-midnight-2">{description ?? defaultDescription}</p>
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="secondary" onClick={onCancel}>
          {cancelLabel}
        </Button>
        <Button variant="danger" onClick={onConfirm}>
          <Trash2 className="h-4 w-4" aria-hidden="true" />
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
