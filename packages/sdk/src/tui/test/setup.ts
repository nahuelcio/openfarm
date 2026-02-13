/**
 * TUI Test Setup
 *
 * Configures the test environment for TUI component and store testing.
 * Run this setup before all TUI tests.
 */

import { vi } from "vitest";

// Mock process.stdout for TUI testing
Object.defineProperty(process, "stdout", {
  value: {
    rows: 24,
    columns: 80,
    write: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    once: vi.fn(),
    emit: vi.fn(),
  },
  writable: true,
});

// Mock process.stdin for input handling
Object.defineProperty(process, "stdin", {
  value: {
    isTTY: true,
    setRawMode: vi.fn(),
    resume: vi.fn(),
    pause: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    once: vi.fn(),
    emit: vi.fn(),
  },
  writable: true,
});

// Set up module mocks for @openfarm/tui-opentui
vi.mock("@openfarm/tui-opentui", async () => {
  const actual = await vi.importActual("../__mocks__/@openfarm/tui-opentui");
  return actual;
});

// Global test timeout for TUI tests
export const TUI_TEST_TIMEOUT = 5000;

// Helper to wait for next tick (useful for async state updates)
export const flushPromises = (): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, 0));

// Helper to wait for a specified duration
export const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));
