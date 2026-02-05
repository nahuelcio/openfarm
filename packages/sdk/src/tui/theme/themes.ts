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
  name: "Graphite",
  colors: {
    background: "#0b141a",
    foreground: "#e9edef",
    primary: "#00a884",
    secondary: "#53bdeb",
    success: "#25d366",
    error: "#ea0038",
    warning: "#ffb938",
    info: "#53bdeb",
    muted: "#8696a0",
    border: "#2a3942",

    // Status colors
    statusIdle: "#8696a0",
    statusRunning: "#25d366",
    statusPaused: "#ffb938",
    statusError: "#ea0038",
    statusCompleted: "#53bdeb",

    // Log level colors
    logDebug: "#667781",
    logInfo: "#53bdeb",
    logWarn: "#ffb938",
    logError: "#ea0038",

    // UI component colors
    headerBg: "#111b21",
    headerFg: "#e9edef",
    footerBg: "#111b21",
    footerFg: "#8696a0",
    selectedBg: "#00a884",
    selectedFg: "#0b141a",
  },
  styles: {
    header: { color: "#e9edef", bold: true },
    headerStatus: { color: "#ffb938" },

    taskRunning: { color: "#ffb938", bold: true },
    taskCompleted: { color: "#25d366" },
    taskFailed: { color: "#ea0038" },
    taskPending: { color: "#8696a0" },

    logDebug: { color: "#667781", dimColor: true },
    logInfo: { color: "#e9edef" },
    logWarn: { color: "#ffb938" },
    logError: { color: "#ea0038", bold: true },

    spinner: { color: "#00a884" },
    tabActive: { color: "#00a884", bold: true },
    tabInactive: { color: "#8696a0" },
    border: { color: "#2a3942" },
    label: { color: "#53bdeb" },
    value: { color: "#e9edef" },

    treeIcon: { color: "#ffb938" },
    treeExpanded: { color: "#00a884" },
    treeCollapsed: { color: "#8696a0" },

    buttonPrimary: { color: "#00a884", bold: true },
    buttonSecondary: { color: "#8696a0" },
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
