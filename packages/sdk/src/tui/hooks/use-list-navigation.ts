/**
 * useListNavigation Hook
 *
 * Reusable hook for list navigation with arrow keys.
 * Handles up/down navigation, wrap-around, and edge cases.
 */

import { useInput } from "ink";
import { useCallback, useState } from "react";

export interface UseListNavigationOptions {
  /** Total number of items in the list */
  itemCount: number;
  /** Whether this list is currently active (receives input) */
  isActive?: boolean;
  /** Whether to wrap around when reaching list boundaries (default: true) */
  wrap?: boolean;
  /** Callback when an item is selected (via Enter key) */
  onSelect?: (index: number) => void;
}

export interface UseListNavigationReturn {
  /** Currently selected index */
  selectedIndex: number;
  /** Manually set the selected index */
  setSelectedIndex: (index: number) => void;
  /** Move to next item */
  goToNext: () => void;
  /** Move to previous item */
  goToPrevious: () => void;
}

/**
 * Hook for navigating lists with arrow keys
 *
 * @example
 * const { selectedIndex, setSelectedIndex } = useListNavigation({
 *   itemCount: items.length,
 *   isActive: true,
 *   onSelect: (idx) => handleSelect(items[idx])
 * });
 */
export function useListNavigation(
  options: UseListNavigationOptions
): UseListNavigationReturn {
  const { itemCount, isActive = true, wrap = true, onSelect } = options;

  const [selectedIndex, setSelectedIndexState] = useState(0);

  const setSelectedIndex = useCallback(
    (index: number) => {
      if (itemCount === 0) {
        return;
      }
      const clampedIndex = Math.max(0, Math.min(itemCount - 1, index));
      setSelectedIndexState(clampedIndex);
    },
    [itemCount]
  );

  const goToNext = useCallback(() => {
    if (itemCount === 0) {
      return;
    }

    setSelectedIndexState((prev) => {
      if (prev >= itemCount - 1) {
        return wrap ? 0 : prev;
      }
      return prev + 1;
    });
  }, [itemCount, wrap]);

  const goToPrevious = useCallback(() => {
    if (itemCount === 0) {
      return;
    }

    setSelectedIndexState((prev) => {
      if (prev <= 0) {
        return wrap ? itemCount - 1 : prev;
      }
      return prev - 1;
    });
  }, [itemCount, wrap]);

  useInput((input, key) => {
    if (!isActive || itemCount === 0) {
      return;
    }

    if (key.upArrow) {
      goToPrevious();
    } else if (key.downArrow) {
      goToNext();
    } else if (key.return && onSelect) {
      onSelect(selectedIndex);
    }
  });

  return {
    selectedIndex,
    setSelectedIndex,
    goToNext,
    goToPrevious,
  };
}
