/**
 * TUI Test Utilities
 *
 * Provides helper functions and mocks for testing TUI components.
 */

import type { ReactNode } from "react";
import { createElement } from "react";

// Mock OpenTUI components for testing
export const MockBox = ({
  children,
  ...props
}: {
  children?: ReactNode;
  [key: string]: unknown;
}) => {
  return createElement("box", props, children);
};

export const MockText = ({
  children,
  ...props
}: {
  children?: ReactNode;
  [key: string]: unknown;
}) => {
  return createElement("text", props, children);
};

// Mock hooks
export const mockUseInput = (
  handler: (input: string, key: Record<string, boolean>) => void
) => {
  // Store handler for later triggering in tests
  (
    globalThis as unknown as { __testInputHandler: typeof handler }
  ).__testInputHandler = handler;
};

export const mockUseApp = () => ({
  exit: () => {},
});

export const mockUseStdout = () => ({
  stdout: process.stdout,
});

export const mockUseStdoutDimensions = () => ({
  rows: 24,
  columns: 80,
});

// Trigger input handler in tests
export const triggerInput = (
  input: string,
  key: Partial<{
    upArrow: boolean;
    downArrow: boolean;
    leftArrow: boolean;
    rightArrow: boolean;
    return: boolean;
    escape: boolean;
    tab: boolean;
    pageUp: boolean;
    pageDown: boolean;
    ctrl: boolean;
  }> = {}
) => {
  const handler = (
    globalThis as unknown as { __testInputHandler?: (input: string, key: Record<string, boolean>) => void }
  ).__testInputHandler;
  if (handler) {
    handler(input, {
      upArrow: false,
      downArrow: false,
      leftArrow: false,
      rightArrow: false,
      return: false,
      escape: false,
      tab: false,
      pageUp: false,
      pageDown: false,
      ctrl: false,
      ...key,
    });
  }
};

// Render helper - returns component tree structure for assertions
export function render(node: ReactNode): {
  container: ReactNode;
  unmount: () => void;
} {
  return {
    container: node,
    unmount: () => {
      // Cleanup if needed
    },
  };
}

// Wait for store updates to propagate
export const waitFor = (ms = 0): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

// Act helper for state updates
export const act = async (
  callback: () => void | Promise<void>
): Promise<void> => {
  await callback();
  await waitFor(0);
};
