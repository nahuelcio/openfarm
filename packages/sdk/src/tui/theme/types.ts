/**
 * Theme System Types
 *
 * Defines the theme interface and related types for the TUI.
 */

export interface ThemeColors {
  // Base colors
  background: string;
  foreground: string;
  primary: string;
  secondary: string;
  success: string;
  error: string;
  warning: string;
  info: string;
  muted: string;
  border: string;

  // Status colors
  statusIdle: string;
  statusRunning: string;
  statusPaused: string;
  statusError: string;
  statusCompleted: string;

  // Log level colors
  logDebug: string;
  logInfo: string;
  logWarn: string;
  logError: string;

  // UI component colors
  headerBg: string;
  headerFg: string;
  footerBg: string;
  footerFg: string;
  selectedBg: string;
  selectedFg: string;
}

export interface TextStyle {
  color?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  dimColor?: boolean;
  inverse?: boolean;
}

export interface ThemeStyles {
  // Header
  header: TextStyle;
  headerStatus: TextStyle;

  // Task statuses
  taskRunning: TextStyle;
  taskCompleted: TextStyle;
  taskFailed: TextStyle;
  taskPending: TextStyle;

  // Logs
  logDebug: TextStyle;
  logInfo: TextStyle;
  logWarn: TextStyle;
  logError: TextStyle;

  // UI elements
  spinner: TextStyle;
  tabActive: TextStyle;
  tabInactive: TextStyle;
  border: TextStyle;
  label: TextStyle;
  value: TextStyle;

  // Tree view
  treeIcon: TextStyle;
  treeExpanded: TextStyle;
  treeCollapsed: TextStyle;

  // Buttons/Actions
  buttonPrimary: TextStyle;
  buttonSecondary: TextStyle;
}

export interface Theme {
  id: string;
  name: string;
  colors: ThemeColors;
  styles: ThemeStyles;
}

export type ThemeId =
  | "default"
  | "dracula"
  | "solarized-dark"
  | "solarized-light"
  | "high-contrast";
