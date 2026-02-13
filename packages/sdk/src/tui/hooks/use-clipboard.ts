/**
 * useClipboard Hook
 *
 * Provides clipboard functionality with visual feedback.
 */

import { useState, useCallback } from "react";
import { copyToClipboard } from "../utils/clipboard";

export interface UseClipboardReturn {
  /** Copy text to clipboard */
  copy: (text: string) => boolean;
  /** Whether copy was successful */
  copied: boolean;
  /** Error message if copy failed */
  error: string | null;
  /** Clear copied state */
  clear: () => void;
}

/**
 * Hook for clipboard operations with feedback
 */
export function useClipboard(timeout: number = 2000): UseClipboardReturn {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const copy = useCallback(
    (text: string): boolean => {
      const success = copyToClipboard(text);

      if (success) {
        setCopied(true);
        setError(null);

        // Auto-clear after timeout
        setTimeout(() => {
          setCopied(false);
        }, timeout);
      } else {
        setCopied(false);
        setError("Failed to copy to clipboard");
      }

      return success;
    },
    [timeout]
  );

  const clear = useCallback(() => {
    setCopied(false);
    setError(null);
  }, []);

  return { copy, copied, error, clear };
}
