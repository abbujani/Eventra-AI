import { ClipboardCopy } from 'lucide-react';
import { Button } from './Button.js';
import { useClipboard } from '../../hooks/useClipboard.js';

interface CopyButtonProps {
  text: string;
  label?: string;
  copiedLabel?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary' | 'ghost' | 'dark' | 'danger';
  disabled?: boolean;
  showStatus?: boolean;
  statusClassName?: string;
}

export function CopyButton({
  text,
  label = 'Copy',
  copiedLabel = 'Copied',
  size = 'sm',
  variant = 'secondary',
  disabled,
  showStatus = true,
  statusClassName,
}: CopyButtonProps) {
  const { copied, copyError, copy } = useClipboard();

  return (
    <>
      <Button
        variant={variant}
        size={size}
        disabled={disabled || !text}
        onClick={() => {
          if (!text) return;
          void copy(text);
        }}
      >
        <ClipboardCopy className="h-4 w-4" aria-hidden="true" />
        {copied ? copiedLabel : label}
      </Button>
      {showStatus && (
        <span role="status" aria-live="polite" className={statusClassName ?? 'sr-only'}>
          {copied ? 'Copied to clipboard' : copyError ? 'Copy failed' : ''}
        </span>
      )}
      {showStatus && copyError && (
        <p role="alert" className="text-xs text-danger">
          Could not copy to clipboard. Select the text and copy it manually.
        </p>
      )}
    </>
  );
}
