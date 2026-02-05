/**
 * Legacy theme-store bridge.
 *
 * Keeps the existing imports working while delegating to the
 * unified theme store under `src/tui/theme/`.
 */

import { useThemeStore as useThemeStoreInternal } from "../theme/store";

export { useThemeStore } from "../theme/store";
export type { Theme, ThemeColors } from "../theme/types";

export function useTheme() {
  const currentTheme = useThemeStoreInternal((state) => state.currentTheme);
  const currentThemeId = useThemeStoreInternal((state) => state.currentThemeId);
  const setTheme = useThemeStoreInternal((state) => state.setTheme);
  const cycleTheme = useThemeStoreInternal((state) => state.cycleTheme);
  const getColor = useThemeStoreInternal((state) => state.getColor);

  return {
    theme: currentTheme,
    themeName: currentThemeId,
    colors: currentTheme.colors,
    setTheme,
    cycleTheme,
    getColor,
  };
}
