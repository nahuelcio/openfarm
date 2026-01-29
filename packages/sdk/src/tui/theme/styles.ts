import { themeConfig, type Theme } from "./index";

export function useTheme(theme: Theme = "dark") {
  return themeConfig[theme];
}

// Helper to check if a theme is dark (for special handling)
export function isDarkTheme(theme: Theme): boolean {
  return theme !== "light";
}

// Get theme CSS variables for inline styles if needed
export function getThemeVariables(theme: Theme): Record<string, string> {
  const t = themeConfig[theme];
  return {
    "--bg": t.colors.background,
    "--surface": t.colors.surface,
    "--border": t.colors.border,
    "--text-primary": t.colors.text.primary,
    "--text-secondary": t.colors.text.secondary,
    "--text-muted": t.colors.text.muted,
    "--accent": t.colors.accent,
    "--success": t.colors.success,
    "--warning": t.colors.warning,
    "--error": t.colors.error,
    "--info": t.colors.info,
  };
}
