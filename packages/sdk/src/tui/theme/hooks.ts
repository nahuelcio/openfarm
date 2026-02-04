/**
 * Theme Hooks
 *
 * React hooks for accessing theme data in components.
 */

import { useThemeStore } from "./store";
import type { Theme, TextStyle } from "./types";

/**
 * Hook to access the current theme.
 */
export function useTheme(): Theme {
  return useThemeStore((state) => state.currentTheme);
}

/**
 * Hook to access theme colors only.
 */
export function useThemeColors() {
  return useThemeStore((state) => state.currentTheme.colors);
}

/**
 * Hook to get a specific style from the current theme.
 */
export function useThemeStyle(styleName: keyof Theme["styles"]): TextStyle {
  return useThemeStore((state) => state.currentTheme.styles[styleName]);
}

/**
 * Hook to get the current theme ID.
 */
export function useCurrentThemeId() {
  return useThemeStore((state) => state.currentThemeId);
}

/**
 * Hook to get all available themes.
 */
export function useAvailableThemes() {
  return useThemeStore((state) => state.availableThemes);
}

/**
 * Hook to get theme switching actions.
 */
export function useThemeActions() {
  return {
    setTheme: useThemeStore((state) => state.setTheme),
    loadCustomTheme: useThemeStore((state) => state.loadCustomTheme),
    resetTheme: useThemeStore((state) => state.resetTheme),
  };
}
