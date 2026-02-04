/**
 * Theme Store
 *
 * Sistema de temas para la TUI con 5 temas built-in:
 * - default
 * - dracula
 * - solarized-dark
 * - solarized-light
 * - high-contrast
 */

import { create } from "zustand";

export interface ThemeColors {
  // Base
  background: string;
  foreground: string;
  muted: string;
  border: string;

  // Accent
  primary: string;
  secondary: string;
  success: string;
  error: string;
  warning: string;
  info: string;

  // Status
  statusIdle: string;
  statusRunning: string;
  statusPaused: string;
  statusError: string;
  statusCompleted: string;

  // Logs
  logDebug: string;
  logInfo: string;
  logWarn: string;
  logError: string;

  // Components
  headerBg: string;
  headerFg: string;
  footerBg: string;
  footerFg: string;
  selectedBg: string;
  selectedFg: string;
}

export interface Theme {
  name: string;
  description: string;
  colors: ThemeColors;
}

// === DEFAULT THEME ===
const defaultTheme: Theme = {
  name: "default",
  description: "OpenFarm default theme",
  colors: {
    background: "black",
    foreground: "white",
    muted: "gray",
    border: "gray",

    primary: "cyan",
    secondary: "magenta",
    success: "green",
    error: "red",
    warning: "yellow",
    info: "blue",

    statusIdle: "gray",
    statusRunning: "green",
    statusPaused: "yellow",
    statusError: "red",
    statusCompleted: "cyan",

    logDebug: "gray",
    logInfo: "blue",
    logWarn: "yellow",
    logError: "red",

    headerBg: "black",
    headerFg: "cyan",
    footerBg: "black",
    footerFg: "gray",
    selectedBg: "yellow",
    selectedFg: "black",
  },
};

// === DRACULA THEME ===
const draculaTheme: Theme = {
  name: "dracula",
  description: "Dracula dark theme",
  colors: {
    background: "#282a36",
    foreground: "#f8f8f2",
    muted: "#6272a4",
    border: "#44475a",

    primary: "#8be9fd",
    secondary: "#bd93f9",
    success: "#50fa7b",
    error: "#ff5555",
    warning: "#f1fa8c",
    info: "#8be9fd",

    statusIdle: "#6272a4",
    statusRunning: "#50fa7b",
    statusPaused: "#ffb86c",
    statusError: "#ff5555",
    statusCompleted: "#8be9fd",

    logDebug: "#6272a4",
    logInfo: "#8be9fd",
    logWarn: "#f1fa8c",
    logError: "#ff5555",

    headerBg: "#44475a",
    headerFg: "#f8f8f2",
    footerBg: "#44475a",
    footerFg: "#6272a4",
    selectedBg: "#bd93f9",
    selectedFg: "#282a36",
  },
};

// === SOLARIZED DARK THEME ===
const solarizedDarkTheme: Theme = {
  name: "solarized-dark",
  description: "Solarized dark theme",
  colors: {
    background: "#002b36",
    foreground: "#839496",
    muted: "#586e75",
    border: "#073642",

    primary: "#2aa198",
    secondary: "#b58900",
    success: "#859900",
    error: "#dc322f",
    warning: "#cb4b16",
    info: "#268bd2",

    statusIdle: "#586e75",
    statusRunning: "#859900",
    statusPaused: "#b58900",
    statusError: "#dc322f",
    statusCompleted: "#2aa198",

    logDebug: "#586e75",
    logInfo: "#268bd2",
    logWarn: "#b58900",
    logError: "#dc322f",

    headerBg: "#073642",
    headerFg: "#93a1a1",
    footerBg: "#073642",
    footerFg: "#586e75",
    selectedBg: "#b58900",
    selectedFg: "#002b36",
  },
};

// === SOLARIZED LIGHT THEME ===
const solarizedLightTheme: Theme = {
  name: "solarized-light",
  description: "Solarized light theme",
  colors: {
    background: "#fdf6e3",
    foreground: "#657b83",
    muted: "#93a1a1",
    border: "#eee8d5",

    primary: "#2aa198",
    secondary: "#b58900",
    success: "#859900",
    error: "#dc322f",
    warning: "#cb4b16",
    info: "#268bd2",

    statusIdle: "#93a1a1",
    statusRunning: "#859900",
    statusPaused: "#b58900",
    statusError: "#dc322f",
    statusCompleted: "#2aa198",

    logDebug: "#93a1a1",
    logInfo: "#268bd2",
    logWarn: "#b58900",
    logError: "#dc322f",

    headerBg: "#eee8d5",
    headerFg: "#586e75",
    footerBg: "#eee8d5",
    footerFg: "#93a1a1",
    selectedBg: "#b58900",
    selectedFg: "#fdf6e3",
  },
};

// === HIGH CONTRAST THEME ===
const highContrastTheme: Theme = {
  name: "high-contrast",
  description: "High contrast accessibility theme",
  colors: {
    background: "black",
    foreground: "white",
    muted: "white",
    border: "white",

    primary: "cyan",
    secondary: "magenta",
    success: "green",
    error: "red",
    warning: "yellow",
    info: "cyan",

    statusIdle: "white",
    statusRunning: "green",
    statusPaused: "yellow",
    statusError: "red",
    statusCompleted: "cyan",

    logDebug: "white",
    logInfo: "cyan",
    logWarn: "yellow",
    logError: "red",

    headerBg: "black",
    headerFg: "white",
    footerBg: "black",
    footerFg: "white",
    selectedBg: "white",
    selectedFg: "black",
  },
};

// === EXPORT THEMES ===
export const BUILT_IN_THEMES: Record<string, Theme> = {
  default: defaultTheme,
  dracula: draculaTheme,
  "solarized-dark": solarizedDarkTheme,
  "solarized-light": solarizedLightTheme,
  "high-contrast": highContrastTheme,
};

export const THEME_NAMES = Object.keys(BUILT_IN_THEMES);

// === STORE ===
interface ThemeState {
  currentTheme: Theme;
  themeName: string;
  setTheme: (name: string) => void;
  cycleTheme: () => void;
  getColor: (key: keyof ThemeColors) => string;
}

const getInitialTheme = (): Theme => {
  const envTheme = process.env.OPENFARM_THEME;
  if (envTheme && BUILT_IN_THEMES[envTheme]) {
    return BUILT_IN_THEMES[envTheme];
  }
  return defaultTheme;
};

const getInitialThemeName = (): string => {
  const envTheme = process.env.OPENFARM_THEME;
  return envTheme && BUILT_IN_THEMES[envTheme] ? envTheme : "default";
};

export const useThemeStore = create<ThemeState>((set, get) => ({
  currentTheme: getInitialTheme(),
  themeName: getInitialThemeName(),

  setTheme: (name) => {
    const theme = BUILT_IN_THEMES[name];
    if (theme) {
      set({ currentTheme: theme, themeName: name });
    }
  },

  cycleTheme: () => {
    const { themeName } = get();
    const currentIndex = THEME_NAMES.indexOf(themeName);
    const nextIndex = (currentIndex + 1) % THEME_NAMES.length;
    const nextName = THEME_NAMES[nextIndex];
    get().setTheme(nextName);
  },

  getColor: (key) => {
    return get().currentTheme.colors[key];
  },
}));

// === HELPER HOOK ===
export const useTheme = () => {
  const { currentTheme, themeName, setTheme, cycleTheme, getColor } =
    useThemeStore();
  return {
    theme: currentTheme,
    themeName,
    colors: currentTheme.colors,
    setTheme,
    cycleTheme,
    getColor,
  };
};
