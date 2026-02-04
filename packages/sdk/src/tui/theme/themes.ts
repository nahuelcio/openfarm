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
    background: "black",
    foreground: "white",
    primary: "cyan",
    secondary: "magenta",
    success: "green",
    error: "red",
    warning: "yellow",
    info: "blue",
    muted: "gray",
    border: "gray",

    // Status colors
    statusIdle: "gray",
    statusRunning: "green",
    statusPaused: "yellow",
    statusError: "red",
    statusCompleted: "cyan",

    // Log level colors
    logDebug: "gray",
    logInfo: "blue",
    logWarn: "yellow",
    logError: "red",

    // UI component colors
    headerBg: "black",
    headerFg: "cyan",
    footerBg: "black",
    footerFg: "gray",
    selectedBg: "yellow",
    selectedFg: "black",
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
    primary: "#8be9fd",
    secondary: "#bd93f9",
    success: "#50fa7b",
    error: "#ff5555",
    warning: "#f1fa8c",
    info: "#8be9fd",
    muted: "#6272a4",
    border: "#44475a",

    // Status colors
    statusIdle: "#6272a4",
    statusRunning: "#50fa7b",
    statusPaused: "#ffb86c",
    statusError: "#ff5555",
    statusCompleted: "#8be9fd",

    // Log level colors
    logDebug: "#6272a4",
    logInfo: "#8be9fd",
    logWarn: "#f1fa8c",
    logError: "#ff5555",

    // UI component colors
    headerBg: "#44475a",
    headerFg: "#f8f8f2",
    footerBg: "#44475a",
    footerFg: "#6272a4",
    selectedBg: "#bd93f9",
    selectedFg: "#282a36",
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
    primary: "#2aa198",
    secondary: "#b58900",
    success: "#859900",
    error: "#dc322f",
    warning: "#cb4b16",
    info: "#268bd2",
    muted: "#586e75",
    border: "#073642",

    // Status colors
    statusIdle: "#586e75",
    statusRunning: "#859900",
    statusPaused: "#b58900",
    statusError: "#dc322f",
    statusCompleted: "#2aa198",

    // Log level colors
    logDebug: "#586e75",
    logInfo: "#268bd2",
    logWarn: "#b58900",
    logError: "#dc322f",

    // UI component colors
    headerBg: "#073642",
    headerFg: "#93a1a1",
    footerBg: "#073642",
    footerFg: "#586e75",
    selectedBg: "#b58900",
    selectedFg: "#002b36",
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
    primary: "#2aa198",
    secondary: "#b58900",
    success: "#859900",
    error: "#dc322f",
    warning: "#cb4b16",
    info: "#268bd2",
    muted: "#93a1a1",
    border: "#eee8d5",

    // Status colors
    statusIdle: "#93a1a1",
    statusRunning: "#859900",
    statusPaused: "#b58900",
    statusError: "#dc322f",
    statusCompleted: "#2aa198",

    // Log level colors
    logDebug: "#93a1a1",
    logInfo: "#268bd2",
    logWarn: "#b58900",
    logError: "#dc322f",

    // UI component colors
    headerBg: "#eee8d5",
    headerFg: "#586e75",
    footerBg: "#eee8d5",
    footerFg: "#93a1a1",
    selectedBg: "#b58900",
    selectedFg: "#fdf6e3",
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
    background: "black",
    foreground: "white",
    primary: "cyan",
    secondary: "magenta",
    success: "green",
    error: "red",
    warning: "yellow",
    info: "cyan",
    muted: "white",
    border: "white",

    // Status colors
    statusIdle: "white",
    statusRunning: "green",
    statusPaused: "yellow",
    statusError: "red",
    statusCompleted: "cyan",

    // Log level colors
    logDebug: "white",
    logInfo: "cyan",
    logWarn: "yellow",
    logError: "red",

    // UI component colors
    headerBg: "black",
    headerFg: "white",
    footerBg: "black",
    footerFg: "white",
    selectedBg: "white",
    selectedFg: "black",
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
