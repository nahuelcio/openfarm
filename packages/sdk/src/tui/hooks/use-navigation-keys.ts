/**
 * useNavigationKeys Hook
 *
 * Standardized keyboard navigation across all TUI screens.
 * Provides consistent key mappings for navigation, help, and quitting.
 */

import { useInput } from "@openfarm/tui-opentui";
import type { ReactNode } from "react";
import { useCallback, useState } from "react";
import type { Screen } from "../store";

interface InputKey {
  upArrow: boolean;
  downArrow: boolean;
  return: boolean;
  escape: boolean;
}

export interface NavigationOptions {
  /** Current screen id */
  screen: Screen;
  /** Parent screen to navigate to on Escape */
  parentScreen?: Screen;
  /** Whether to show help overlay on '?' */
  enableHelp?: boolean;
  /** Custom help content */
  helpContent?: ReactNode;
  /** Callback when help is toggled */
  onToggleHelp?: (showing: boolean) => void;
  /** Whether quitting is allowed */
  enableQuit?: boolean;
  /** Callback when quit is requested */
  onQuit?: () => void;
  /** Whether to block navigation during certain states */
  blockNavigation?: boolean;
  /** Callback to navigate to a specific screen */
  onNavigate: (screen: Screen) => void;
  /** Callback to go to dashboard (optional, defaults to 'dashboard') */
  onDashboard?: () => void;
}

export interface NavigationResult {
  /** Whether help overlay is currently showing */
  showingHelp: boolean;
  /** Function to manually set help visibility */
  setShowingHelp: (showing: boolean) => void;
}

/**
 * Standardized keyboard navigation hook for TUI screens.
 *
 * Standard key mappings:
 * - Esc - Go back to parent screen (if defined)
 * - ? - Toggle help overlay (if enabled)
 * - q - Quit (if enabled and not blocked)
 * - d - Go to dashboard (if not on dashboard)
 *
 * @example
 * const { showingHelp, setShowingHelp } = useNavigationKeys({
 *   screen: 'history',
 *   parentScreen: 'dashboard',
 *   enableHelp: true,
 *   onNavigate: setScreen,
 * });
 */
export function useNavigationKeys(
  options: NavigationOptions
): NavigationResult {
  const {
    screen,
    parentScreen,
    enableHelp = false,
    onToggleHelp,
    enableQuit = false,
    onQuit,
    blockNavigation = false,
    onNavigate,
    onDashboard,
  } = options;

  const [showingHelp, setShowingHelpState] = useState(false);

  const setShowingHelp = useCallback(
    (showing: boolean) => {
      setShowingHelpState(showing);
      onToggleHelp?.(showing);
    },
    [onToggleHelp]
  );

  useInput(
    useCallback(
      (input: string, key: InputKey) => {
        // Block all navigation if explicitly blocked
        if (blockNavigation) {
          // Only allow closing help if showing
          if (showingHelp && (key.escape || input === "q")) {
            setShowingHelp(false);
          }
          return;
        }

        // Help overlay toggle - must check before other keys
        if (input === "?" && enableHelp) {
          setShowingHelp(!showingHelp);
          return;
        }

        // If help is showing, only allow closing it
        if (showingHelp) {
          if (key.escape || input === "q") {
            setShowingHelp(false);
          }
          return;
        }

        // Escape - go back to parent screen
        if (key.escape && parentScreen) {
          onNavigate(parentScreen);
          return;
        }

        // q - quit (only if enabled and no parent screen or explicit quit)
        if (input === "q" && enableQuit && onQuit) {
          onQuit();
          return;
        }

        // d - go to dashboard (if not already there)
        if (input === "d" && screen !== "dashboard") {
          if (onDashboard) {
            onDashboard();
          } else {
            onNavigate("dashboard");
          }
          return;
        }
      },
      [
        blockNavigation,
        enableHelp,
        enableQuit,
        onNavigate,
        onQuit,
        onDashboard,
        parentScreen,
        screen,
        showingHelp,
        setShowingHelp,
      ]
    )
  );

  return {
    showingHelp,
    setShowingHelp,
  };
}

export default useNavigationKeys;
