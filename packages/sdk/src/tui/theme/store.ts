/**
 * Theme Store
 *
 * Zustand store for managing theme state across the TUI.
 */

import { create } from "zustand";
import type { Theme, ThemeId } from "./types";
import { BUILT_IN_THEMES, DEFAULT_THEME_ID } from "./themes";

interface ThemeStore {
  // State
  currentThemeId: ThemeId;
  currentTheme: Theme;
  availableThemes: Record<string, Theme>;

  // Actions
  setTheme: (themeId: ThemeId | string) => void;
  loadCustomTheme: (theme: Theme) => void;
  resetTheme: () => void;
}

export const useThemeStore = create<ThemeStore>((set) => ({
  // Initial state
  currentThemeId: DEFAULT_THEME_ID,
  currentTheme: BUILT_IN_THEMES[DEFAULT_THEME_ID],
  availableThemes: BUILT_IN_THEMES,

  // Actions
  setTheme: (themeId: ThemeId | string) => {
    set((state) => {
      const theme = state.availableThemes[themeId];
      if (!theme) {
        console.warn(`Theme "${themeId}" not found, using default theme`);
        return {
          currentThemeId: DEFAULT_THEME_ID,
          currentTheme: BUILT_IN_THEMES[DEFAULT_THEME_ID],
        };
      }
      return {
        currentThemeId: themeId as ThemeId,
        currentTheme: theme,
      };
    });
  },

  loadCustomTheme: (theme: Theme) => {
    set((state) => ({
      availableThemes: {
        ...state.availableThemes,
        [theme.id]: theme,
      },
      currentThemeId: theme.id as ThemeId,
      currentTheme: theme,
    }));
  },

  resetTheme: () => {
    set({
      currentThemeId: DEFAULT_THEME_ID,
      currentTheme: BUILT_IN_THEMES[DEFAULT_THEME_ID],
      availableThemes: BUILT_IN_THEMES,
    });
  },
}));
