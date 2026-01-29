export interface ColorTheme {
  background: string;
  surface: string;
  border: string;
  text: {
    primary: string;
    secondary: string;
    muted: string;
  };
  accent: string;
  success: string;
  warning: string;
  error: string;
  info: string;
}

export const colors: Record<string, ColorTheme> = {
  // Dark theme (default) - GitHub Dark
  dark: {
    background: "#0d1117",
    surface: "#161b22",
    border: "#30363d",
    text: {
      primary: "#c9d1d9",
      secondary: "#8b949e",
      muted: "#6e7681",
    },
    accent: "#58a6ff",
    success: "#238636",
    warning: "#d29922",
    error: "#da3633",
    info: "#2f81f7",
  },
  
  // Light theme - GitHub Light
  light: {
    background: "#ffffff",
    surface: "#f6f8fa",
    border: "#d0d7de",
    text: {
      primary: "#24292f",
      secondary: "#57606a",
      muted: "#6e7781",
    },
    accent: "#0969da",
    success: "#1a7f37",
    warning: "#9a6700",
    error: "#cf222e",
    info: "#0969da",
  },
  
  // Dracula theme
  dracula: {
    background: "#282a36",
    surface: "#44475a",
    border: "#6272a4",
    text: {
      primary: "#f8f8f2",
      secondary: "#bfbfb6",
      muted: "#6272a4",
    },
    accent: "#bd93f9",
    success: "#50fa7b",
    warning: "#f1fa8c",
    error: "#ff5555",
    info: "#8be9fd",
  },
  
  // Monokai theme
  monokai: {
    background: "#272822",
    surface: "#3e3d32",
    border: "#75715e",
    text: {
      primary: "#f8f8f2",
      secondary: "#a59f85",
      muted: "#75715e",
    },
    accent: "#66d9ef",
    success: "#a6e22e",
    warning: "#e6db74",
    error: "#f92672",
    info: "#fd971f",
  },
  
  // Nord theme
  nord: {
    background: "#2e3440",
    surface: "#3b4252",
    border: "#434c5e",
    text: {
      primary: "#eceff4",
      secondary: "#d8dee9",
      muted: "#4c566a",
    },
    accent: "#88c0d0",
    success: "#a3be8c",
    warning: "#ebcb8b",
    error: "#bf616a",
    info: "#81a1c1",
  },
  
  // One Dark theme
  oneDark: {
    background: "#282c34",
    surface: "#3e4451",
    border: "#545862",
    text: {
      primary: "#abb2bf",
      secondary: "#828997",
      muted: "#5c6370",
    },
    accent: "#61afef",
    success: "#98c379",
    warning: "#e5c07b",
    error: "#e06c75",
    info: "#56b6c2",
  },
};

export type Theme = keyof typeof colors;

// Get list of available themes
export const availableThemes: { id: Theme; name: string; icon: string }[] = [
  { id: "dark", name: "Dark", icon: "🌙" },
  { id: "light", name: "Light", icon: "☀️" },
  { id: "dracula", name: "Dracula", icon: "🧛" },
  { id: "monokai", name: "Monokai", icon: "🎯" },
  { id: "nord", name: "Nord", icon: "❄️" },
  { id: "oneDark", name: "One Dark", icon: "🌑" },
];
