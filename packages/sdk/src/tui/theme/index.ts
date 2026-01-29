import { colors, type ColorTheme, type Theme, availableThemes } from "./colors";

export interface ThemeConfig {
  colors: ColorTheme;
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  borderRadius: {
    sm: number;
    md: number;
    lg: number;
  };
}

export const themeConfig: Record<Theme, ThemeConfig> = {
  dark: {
    colors: colors.dark,
    spacing: { xs: 1, sm: 2, md: 4, lg: 6, xl: 8 },
    borderRadius: { sm: 1, md: 2, lg: 4 },
  },
  light: {
    colors: colors.light,
    spacing: { xs: 1, sm: 2, md: 4, lg: 6, xl: 8 },
    borderRadius: { sm: 1, md: 2, lg: 4 },
  },
  dracula: {
    colors: colors.dracula,
    spacing: { xs: 1, sm: 2, md: 4, lg: 6, xl: 8 },
    borderRadius: { sm: 1, md: 2, lg: 4 },
  },
  monokai: {
    colors: colors.monokai,
    spacing: { xs: 1, sm: 2, md: 4, lg: 6, xl: 8 },
    borderRadius: { sm: 1, md: 2, lg: 4 },
  },
  nord: {
    colors: colors.nord,
    spacing: { xs: 1, sm: 2, md: 4, lg: 6, xl: 8 },
    borderRadius: { sm: 1, md: 2, lg: 4 },
  },
  oneDark: {
    colors: colors.oneDark,
    spacing: { xs: 1, sm: 2, md: 4, lg: 6, xl: 8 },
    borderRadius: { sm: 1, md: 2, lg: 4 },
  },
};

export { colors, availableThemes };
export type { ColorTheme, Theme };
