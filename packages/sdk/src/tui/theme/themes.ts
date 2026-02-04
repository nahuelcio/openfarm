/**
 * Built-in Themes
 *
 * Defines all built-in themes for the TUI.
 */

import type { Theme } from "./types";

// ==========================================
// DEFAULT THEME
// ==========================================
export const defaultTheme: Theme = {
  id: "default",
  name: "Default",
  colors: {
    background: "#000000",
    foreground: "#ffffff",
    primary: "#61afef",
    secondary: "#abb2bf",
    success: "#98c379",
    error: "#e06c75",
    warning: "#e5c07b",
    info: "#56b6c2",
    muted: "#5c6370",
    border: "#3e4451",
  },
  styles: {
    header: { color: "cyan", bold: true },
    headerStatus: { color: "yellow" },

    taskRunning: { color: "yellow", bold: true },
    taskCompleted: { color: "green" },
    taskFailed: { color: "red" },
    taskPending: { color: "gray" },

    logDebug: { color: "gray", dimColor: true },
    logInfo: { color: "white" },
    logWarn: { color: "yellow" },
    logError: { color: "red", bold: true },

    spinner: { color: "cyan" },
    tabActive: { color: "cyan", bold: true },
    tabInactive: { color: "gray" },
    border: { color: "gray" },
    label: { color: "cyan" },
    value: { color: "white" },

    treeIcon: { color: "yellow" },
    treeExpanded: { color: "cyan" },
    treeCollapsed: { color: "gray" },

    buttonPrimary: { color: "cyan", bold: true },
    buttonSecondary: { color: "gray" },
  },
};

// ==========================================
// DRACULA THEME
// ==========================================
export const draculaTheme: Theme = {
  id: "dracula",
  name: "Dracula",
  colors: {
    background: "#282a36",
    foreground: "#f8f8f2",
    primary: "#bd93f9",
    secondary: "#6272a4",
    success: "#50fa7b",
    error: "#ff5555",
    warning: "#f1fa8c",
    info: "#8be9fd",
    muted: "#6272a4",
    border: "#44475a",
  },
  styles: {
    header: { color: "magenta", bold: true },
    headerStatus: { color: "yellow" },

    taskRunning: { color: "yellow", bold: true },
    taskCompleted: { color: "green" },
    taskFailed: { color: "red" },
    taskPending: { color: "gray", dimColor: true },

    logDebug: { color: "gray", dimColor: true },
    logInfo: { color: "cyan" },
    logWarn: { color: "yellow" },
    logError: { color: "red", bold: true },

    spinner: { color: "magenta" },
    tabActive: { color: "magenta", bold: true },
    tabInactive: { color: "gray" },
    border: { color: "gray" },
    label: { color: "magenta" },
    value: { color: "white" },

    treeIcon: { color: "yellow" },
    treeExpanded: { color: "magenta" },
    treeCollapsed: { color: "gray" },

    buttonPrimary: { color: "magenta", bold: true },
    buttonSecondary: { color: "gray" },
  },
};

// ==========================================
// SOLARIZED DARK THEME
// ==========================================
export const solarizedDarkTheme: Theme = {
  id: "solarized-dark",
  name: "Solarized Dark",
  colors: {
    background: "#002b36",
    foreground: "#839496",
    primary: "#268bd2",
    secondary: "#586e75",
    success: "#859900",
    error: "#dc322f",
    warning: "#b58900",
    info: "#2aa198",
    muted: "#586e75",
    border: "#073642",
  },
  styles: {
    header: { color: "blue", bold: true },
    headerStatus: { color: "yellow" },

    taskRunning: { color: "yellow", bold: true },
    taskCompleted: { color: "green" },
    taskFailed: { color: "red" },
    taskPending: { color: "gray", dimColor: true },

    logDebug: { color: "gray", dimColor: true },
    logInfo: { color: "cyan" },
    logWarn: { color: "yellow" },
    logError: { color: "red", bold: true },

    spinner: { color: "blue" },
    tabActive: { color: "blue", bold: true },
    tabInactive: { color: "gray" },
    border: { color: "gray" },
    label: { color: "blue" },
    value: { color: "white" },

    treeIcon: { color: "yellow" },
    treeExpanded: { color: "blue" },
    treeCollapsed: { color: "gray" },

    buttonPrimary: { color: "blue", bold: true },
    buttonSecondary: { color: "gray" },
  },
};

// ==========================================
// SOLARIZED LIGHT THEME
// ==========================================
export const solarizedLightTheme: Theme = {
  id: "solarized-light",
  name: "Solarized Light",
  colors: {
    background: "#fdf6e3",
    foreground: "#657b83",
    primary: "#268bd2",
    secondary: "#93a1a1",
    success: "#859900",
    error: "#dc322f",
    warning: "#b58900",
    info: "#2aa198",
    muted: "#93a1a1",
    border: "#eee8d5",
  },
  styles: {
    header: { color: "blue", bold: true },
    headerStatus: { color: "yellow" },

    taskRunning: { color: "yellow", bold: true },
    taskCompleted: { color: "green" },
    taskFailed: { color: "red" },
    taskPending: { color: "gray", dimColor: true },

    logDebug: { color: "gray", dimColor: true },
    logInfo: { color: "blue" },
    logWarn: { color: "yellow" },
    logError: { color: "red", bold: true },

    spinner: { color: "blue" },
    tabActive: { color: "blue", bold: true },
    tabInactive: { color: "gray" },
    border: { color: "gray" },
    label: { color: "blue" },
    value: { color: "black" },

    treeIcon: { color: "yellow" },
    treeExpanded: { color: "blue" },
    treeCollapsed: { color: "gray" },

    buttonPrimary: { color: "blue", bold: true },
    buttonSecondary: { color: "gray" },
  },
};

// ==========================================
// HIGH CONTRAST THEME (Accessibility)
// ==========================================
export const highContrastTheme: Theme = {
  id: "high-contrast",
  name: "High Contrast",
  colors: {
    background: "#000000",
    foreground: "#ffffff",
    primary: "#00ffff",
    secondary: "#aaaaaa",
    success: "#00ff00",
    error: "#ff0000",
    warning: "#ffff00",
    info: "#00ffff",
    muted: "#888888",
    border: "#ffffff",
  },
  styles: {
    header: { color: "cyan", bold: true, inverse: true },
    headerStatus: { color: "yellow", bold: true },

    taskRunning: { color: "yellow", bold: true, inverse: true },
    taskCompleted: { color: "green", bold: true },
    taskFailed: { color: "red", bold: true, inverse: true },
    taskPending: { color: "white" },

    logDebug: { color: "gray" },
    logInfo: { color: "white", bold: true },
    logWarn: { color: "yellow", bold: true },
    logError: { color: "red", bold: true, inverse: true },

    spinner: { color: "cyan", bold: true },
    tabActive: { color: "cyan", bold: true, inverse: true },
    tabInactive: { color: "white" },
    border: { color: "white" },
    label: { color: "cyan", bold: true },
    value: { color: "white", bold: true },

    treeIcon: { color: "yellow", bold: true },
    treeExpanded: { color: "cyan", bold: true },
    treeCollapsed: { color: "white" },

    buttonPrimary: { color: "cyan", bold: true, inverse: true },
    buttonSecondary: { color: "white", bold: true },
  },
};

// ==========================================
// THEME REGISTRY
// ==========================================
export const BUILT_IN_THEMES: Record<string, Theme> = {
  default: defaultTheme,
  dracula: draculaTheme,
  "solarized-dark": solarizedDarkTheme,
  "solarized-light": solarizedLightTheme,
  "high-contrast": highContrastTheme,
};

export const DEFAULT_THEME_ID = "default";
