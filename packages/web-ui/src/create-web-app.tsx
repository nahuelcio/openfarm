import type { ReactElement } from "react";
import { render } from "./runtime";

interface WebAppConfig {
  title?: string;
  theme?: "dark" | "light" | "auto";
  containerId?: string;
}

const THEMES = {
  dark: {
    "--bg-color": "#1a1a1a",
    "--text-color": "#e0e0e0",
    "--border-color": "#333",
    "--accent-color": "#60a5fa",
    "--success-color": "#4ade80",
    "--error-color": "#f87171",
    "--warning-color": "#fbbf24",
  },
  light: {
    "--bg-color": "#ffffff",
    "--text-color": "#1a1a1a",
    "--border-color": "#e5e5e5",
    "--accent-color": "#2563eb",
    "--success-color": "#16a34a",
    "--error-color": "#dc2626",
    "--warning-color": "#d97706",
  },
};

export function createWebApp(
  AppComponent: () => ReactElement,
  config: WebAppConfig = {}
): { start: () => Promise<void>; stop: () => void } {
  const { title = "OpenFarm Web", theme = "dark", containerId = "root" } = config;

  let renderResult: ReturnType<typeof render> | null = null;

  const applyTheme = () => {
    const root = document.documentElement;
    const themeVars = theme === "auto"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
        ? THEMES.dark
        : THEMES.light
      : THEMES[theme];

    for (const [key, value] of Object.entries(themeVars)) {
      root.style.setProperty(key, value);
    }
  };

  const start = async (): Promise<void> => {
    // Set page title
    document.title = title;

    // Apply theme
    applyTheme();

    // Ensure container exists
    let container = document.getElementById(containerId);
    if (!container) {
      container = document.createElement("div");
      container.id = containerId;
      document.body.appendChild(container);
    }

    // Reset body styles
    document.body.style.margin = "0";
    document.body.style.padding = "0";
    document.body.style.overflow = "hidden";

    // Render app
    renderResult = render(<AppComponent />);

    await renderResult.waitUntilExit();
  };

  const stop = (): void => {
    renderResult?.unmount();
    renderResult = null;
  };

  return { start, stop };
}
