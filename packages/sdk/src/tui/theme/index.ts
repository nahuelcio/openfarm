import { colors, type Colors, type Theme } from "./colors";

export interface ThemeConfig {
  colors: Colors;
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
    spacing: {
      xs: 1,
      sm: 2,
      md: 4,
      lg: 6,
      xl: 8,
    },
    borderRadius: {
      sm: 1,
      md: 2,
      lg: 4,
    },
  },
  light: {
    colors: colors.light,
    spacing: {
      xs: 1,
      sm: 2,
      md: 4,
      lg: 6,
      xl: 8,
    },
    borderRadius: {
      sm: 1,
      md: 2,
      lg: 4,
    },
  },
};

export { colors };
export type { Colors, Theme };
