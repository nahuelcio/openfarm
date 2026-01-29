export const colors = {
  // Dark theme (default)
  dark: {
    background: "#0d1117" as string,
    surface: "#161b22" as string,
    border: "#30363d" as string,
    text: {
      primary: "#c9d1d9" as string,
      secondary: "#8b949e" as string,
      muted: "#6e7681" as string,
    },
    accent: "#58a6ff" as string,
    success: "#238636" as string,
    warning: "#d29922" as string,
    error: "#da3633" as string,
    info: "#2f81f7" as string,
  },
  // Light theme (para el futuro)
  light: {
    background: "#ffffff" as string,
    surface: "#f6f8fa" as string,
    border: "#d0d7de" as string,
    text: {
      primary: "#24292f" as string,
      secondary: "#57606a" as string,
      muted: "#6e7781" as string,
    },
    accent: "#0969da" as string,
    success: "#1a7f37" as string,
    warning: "#9a6700" as string,
    error: "#cf222e" as string,
    info: "#0969da" as string,
  },
} as const;

export type Theme = keyof typeof colors;
export type Colors = typeof colors.dark;
