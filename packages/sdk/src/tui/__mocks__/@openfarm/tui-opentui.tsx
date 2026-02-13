/**
 * Mock for @openfarm/tui-opentui
 *
 * Provides simple passthrough mocks for OpenTUI components and hooks.
 * These mocks allow components to render without the full TUI runtime.
 */

import type { ReactNode } from "react";

interface BoxProps {
  children?: ReactNode;
  [key: string]: unknown;
}

interface TextProps {
  children?: ReactNode;
  [key: string]: unknown;
}

interface InputKey {
  upArrow: boolean;
  downArrow: boolean;
  leftArrow: boolean;
  rightArrow: boolean;
  return: boolean;
  escape: boolean;
  tab: boolean;
  backspace: boolean;
  delete: boolean;
  pageUp: boolean;
  pageDown: boolean;
  home: boolean;
  end: boolean;
  ctrl: boolean;
  shift: boolean;
  meta: boolean;
}

type InputHandler = (input: string, key: InputKey) => void;

/**
 * Box component mock - simply renders children
 */
export const Box = ({ children, ..._props }: BoxProps): ReactNode => children;

/**
 * Text component mock - simply renders children
 */
export const Text = ({ children, ..._props }: TextProps): ReactNode => children;

/**
 * useInput hook mock - no-op in test environment
 */
export const useInput = (
  _handler: InputHandler,
  _options?: { isActive?: boolean }
): void => {
  // No-op in test environment
};

/**
 * useStdout hook mock - returns process.stdout
 */
export const useStdout = (): { stdout: NodeJS.WriteStream } => ({
  stdout: process.stdout,
});

/**
 * useStdoutDimensions hook mock - returns default terminal dimensions
 */
export const useStdoutDimensions = (): { rows: number; columns: number } => ({
  rows: 24,
  columns: 80,
});

/**
 * useApp hook mock - provides exit function
 */
export const useApp = (): { exit: (error?: Error) => void } => ({
  exit: () => {},
});

interface RenderResult {
  waitUntilExit: () => Promise<void>;
  clear: () => void;
  unmount: () => void;
}

/**
 * render function mock - returns stubbed render result
 */
export const render = (_node: ReactNode): RenderResult => ({
  waitUntilExit: () => Promise.resolve(),
  clear: () => {},
  unmount: () => {},
});
