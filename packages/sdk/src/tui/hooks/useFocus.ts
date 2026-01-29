// Focus management system for keyboard navigation - Simplified
import { useState, useCallback } from "react";

export interface FocusableItem {
  id: string;
  type: "button" | "input" | "select" | "link";
}

export function useFocusManager(items: FocusableItem[]) {
  const [focusedIndex, setFocusedIndex] = useState(0);

  const focusNext = useCallback(() => {
    setFocusedIndex((prev) => Math.min(prev + 1, items.length - 1));
  }, [items.length]);

  const focusPrevious = useCallback(() => {
    setFocusedIndex((prev) => Math.max(prev - 1, 0));
  }, []);

  return {
    focusedIndex,
    focusNext,
    focusPrevious,
    setFocusedIndex,
    currentItem: items[focusedIndex],
  };
}

// Hook for individual focusable items
export function useFocusable(
  index: number,
  currentFocusIndex: number
) {
  const isFocused = index === currentFocusIndex;
  return { isFocused };
}
