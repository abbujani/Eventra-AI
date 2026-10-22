import { useEffect, useRef, useState } from 'react';

/**
 * Copy-to-clipboard with a transient "Copied" acknowledgement, announced via
 * `copied` (render it in a live region). The timeout is cleaned up on unmount
 * so no state update fires after the component is gone.
 */
export function useClipboard(resetMs = 2000) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    },
    [],
  );

  const copy = async (text: string): Promise<void> => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setCopyError(false);
    } catch {
      setCopied(false);
      setCopyError(true);
    }
    timeoutRef.current = setTimeout(() => {
      setCopied(false);
      setCopyError(false);
    }, resetMs);
  };

  return { copied, copyError, copy };
}
