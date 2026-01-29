import { useMemo } from "react";
import { themeConfig, type Theme } from "./index";

// Cache for theme lookups to avoid recalculation
const themeCache = new Map<Theme, typeof themeConfig.dark>();

export function useTheme(theme: Theme = "dark") {
  return useMemo(() => {
    if (themeCache.has(theme)) {
      return themeCache.get(theme)!;
    }
    
    const config = themeConfig[theme];
    themeCache.set(theme, config);
    return config;
  }, [theme]);
}

// Check if theme is dark
export function isDarkTheme(theme: Theme): boolean {
  return theme !== "light";
}

// Pre-computed CSS variables (if needed for external styling)
export const themeVariables: Record<Theme, Record<string, string>> = {
  dark: {
    bg: "#0d1117",
    surface: "#161b22",
    border: "#30363d",
    text: "#c9d1d9",
    accent: "#58a6ff",
  },
  light: {
    bg: "#ffffff",
    surface: "#f6f8fa",
    border: "#d0d7de",
    text: "#24292f",
    accent: "#0969da",
  },
  dracula: {
    bg: "#282a36",
    surface: "#44475a",
    border: "#6272a4",
    text: "#f8f8f2",
    accent: "#bd93f9",
  },
  monokai: {
    bg: "#272822",
    surface: "#3e3d32",
    border: "#75715e",
    text: "#f8f8f2",
    accent: "#66d9ef",
  },
  nord: {
    bg: "#2e3440",
    surface: "#3b4252",
    border: "#434c5e",
    text: "#eceff4",
    accent: "#88c0d0",
  },
  oneDark: {
    bg: "#282c34",
    surface: "#3e4451",
    border: "#545862",
    text: "#abb2bf",
    accent: "#61afef",
  },
};
