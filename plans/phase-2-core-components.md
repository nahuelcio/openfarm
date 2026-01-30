# Fase 2: Componentes Core

> **Duración estimada**: 2-3 horas  
> **Dependencias**: Fase 1 completada  
> **Objetivo**: Tener el sistema de theming, layout base y componentes UI reutilizables

---

## 📋 Checklist

- [ ] 2.1 Sistema de theming
- [ ] 2.2 Layout base (App, Layout, Header, Sidebar, Footer)
- [ ] 2.3 Componentes UI básicos (Box, Text, Button, Input)
- [ ] 2.4 Sistema de navegación (router simple)
- [ ] 2.5 Estado global con Zustand

---

## 2.1 Sistema de Theming

### Archivo: `packages/sdk/src/tui/theme/colors.ts`

```typescript
export const colors = {
  // Dark theme (default)
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
  // Light theme (para el futuro)
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
} as const;

export type Theme = keyof typeof colors;
export type Colors = typeof colors.dark;
```

### Archivo: `packages/sdk/src/tui/theme/index.ts`

```typescript
import { colors, type Colors, type Theme } from "./colors";

export interface ThemeConfig {
  colors: Colors;
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  borderRadius: {
    sm: number;
    md: number;
    lg: number;
  };
}

export const themeConfig: Record<Theme, ThemeConfig> = {
  dark: {
    colors: colors.dark,
    spacing: {
      xs: 1,
      sm: 2,
      md: 4,
      lg: 6,
      xl: 8,
    },
    borderRadius: {
      sm: 1,
      md: 2,
      lg: 4,
    },
  },
  light: {
    colors: colors.light,
    spacing: {
      xs: 1,
      sm: 2,
      md: 4,
      lg: 6,
      xl: 8,
    },
    borderRadius: {
      sm: 1,
      md: 2,
      lg: 4,
    },
  },
};

export { colors };
export type { Colors, Theme };
```

### Archivo: `packages/sdk/src/tui/theme/styles.ts`

```typescript
import { themeConfig } from "./index";
import type { Theme } from "./colors";

export function useTheme(theme: Theme = "dark") {
  return themeConfig[theme];
}
```

---

## 2.2 Layout Base

### Archivo: `packages/sdk/src/tui/components/layout/Layout.tsx`

```tsx
import React from "react";
import { Box } from "opentui";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { Footer } from "./Footer";
import { useTheme } from "../../theme/styles";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const theme = useTheme("dark");

  return (
    <Box
      width="100%"
      height="100%"
      flexDirection="column"
      backgroundColor={theme.colors.background}
    >
      {/* Header */}
      <Header />

      {/* Main Content Area */}
      <Box flexDirection="row" flexGrow={1}>
        {/* Sidebar */}
        <Sidebar />

        {/* Main Content */}
        <Box
          flexGrow={1}
          padding={theme.spacing.md}
          flexDirection="column"
        >
          {children}
        </Box>
      </Box>

      {/* Footer */}
      <Footer />
    </Box>
  );
}
```

### Archivo: `packages/sdk/src/tui/components/layout/Header.tsx`

```tsx
import React from "react";
import { Box, Text } from "opentui";
import { useTheme } from "../../theme/styles";
import { useAppStore } from "../../store";

export function Header() {
  const theme = useTheme("dark");
  const { config } = useAppStore();

  return (
    <Box
      height={3}
      flexDirection="row"
      alignItems="center"
      paddingX={2}
      backgroundColor={theme.colors.surface}
      borderStyle="single"
      borderColor={theme.colors.border}
    >
      {/* Logo */}
      <Box width={20}>
        <Text color={theme.colors.accent} bold>
          🌾 OpenFarm
        </Text>
      </Box>

      {/* Spacer */}
      <Box flexGrow={1} />

      {/* Status */}
      <Box flexDirection="row" gap={4}>
        <Text color={theme.colors.text.secondary}>
          Provider: <Text color={theme.colors.text.primary}>{config.defaultProvider}</Text>
        </Text>
        <Text color={theme.colors.text.secondary}>
          Model: <Text color={theme.colors.text.primary}>{config.defaultModel || "default"}</Text>
        </Text>
      </Box>
    </Box>
  );
}
```

### Archivo: `packages/sdk/src/tui/components/layout/Sidebar.tsx`

```tsx
import React from "react";
import { Box, Text } from "opentui";
import { useTheme } from "../../theme/styles";
import { useAppStore, type Screen } from "../../store";

const menuItems: { id: Screen; label: string; shortcut: string }[] = [
  { id: "dashboard", label: "🏠 Dashboard", shortcut: "D" },
  { id: "execute", label: "🚀 New Task", shortcut: "N" },
  { id: "history", label: "📜 History", shortcut: "H" },
  { id: "settings", label: "⚙️  Settings", shortcut: "S" },
];

export function Sidebar() {
  const theme = useTheme("dark");
  const { currentScreen, setScreen } = useAppStore();

  return (
    <Box
      width={20}
      flexDirection="column"
      backgroundColor={theme.colors.surface}
      borderStyle="single"
      borderColor={theme.colors.border}
      padding={1}
    >
      {menuItems.map((item) => {
        const isActive = currentScreen === item.id;
        return (
          <Box
            key={item.id}
            height={1}
            flexDirection="row"
            alignItems="center"
            backgroundColor={isActive ? theme.colors.accent : undefined}
            onPress={() => setScreen(item.id)}
          >
            <Text
              color={isActive ? "#ffffff" : theme.colors.text.primary}
              bold={isActive}
            >
              {item.label}
            </Text>
          </Box>
        );
      })}
    </Box>
  );
}
```

### Archivo: `packages/sdk/src/tui/components/layout/Footer.tsx`

```tsx
import React from "react";
import { Box, Text } from "opentui";
import { useTheme } from "../../theme/styles";

const shortcuts = [
  { key: "Ctrl+N", action: "New" },
  { key: "Ctrl+H", action: "History" },
  { key: "Ctrl+Q", action: "Quit" },
];

export function Footer() {
  const theme = useTheme("dark");

  return (
    <Box
      height={1}
      flexDirection="row"
      alignItems="center"
      paddingX={2}
      backgroundColor={theme.colors.surface}
      borderStyle="single"
      borderColor={theme.colors.border}
    >
      {shortcuts.map(({ key, action }, index) => (
        <React.Fragment key={key}>
          <Text color={theme.colors.text.muted}>{key}</Text>
          <Text color={theme.colors.text.secondary}> {action} </Text>
          {index < shortcuts.length - 1 && (
            <Text color={theme.colors.border}>│</Text>
          )}
        </React.Fragment>
      ))}
    </Box>
  );
}
```

---

## 2.3 Componentes UI Básicos

### Archivo: `packages/sdk/src/tui/components/ui/index.ts`

```typescript
export { Box } from "opentui";
export { Text } from "opentui";
export { Button } from "./Button";
export { Input } from "./Input";
export { Select } from "./Select";
export { Badge } from "./Badge";
export { Spinner } from "./Spinner";
export { ProgressBar } from "./ProgressBar";
```

### Archivo: `packages/sdk/src/tui/components/ui/Button.tsx`

```tsx
import React from "react";
import { Box, Text } from "opentui";
import { useTheme } from "../../theme/styles";

interface ButtonProps {
  children: React.ReactNode;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger";
  disabled?: boolean;
}

export function Button({
  children,
  onPress,
  variant = "primary",
  disabled = false,
}: ButtonProps) {
  const theme = useTheme("dark");

  const colors = {
    primary: theme.colors.accent,
    secondary: theme.colors.surface,
    danger: theme.colors.error,
  };

  const bgColor = disabled ? theme.colors.border : colors[variant];
  const textColor = disabled ? theme.colors.text.muted : "#ffffff";

  return (
    <Box
      paddingX={2}
      paddingY={1}
      backgroundColor={bgColor}
      onPress={disabled ? undefined : onPress}
    >
      <Text color={textColor} bold>
        {children}
      </Text>
    </Box>
  );
}
```

### Archivo: `packages/sdk/src/tui/components/ui/Input.tsx`

```tsx
import React, { useState } from "react";
import { Box, Text } from "opentui";
import { useTheme } from "../../theme/styles";

interface InputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  password?: boolean;
  multiline?: boolean;
  height?: number;
}

export function Input({
  value,
  onChange,
  placeholder,
  password = false,
  multiline = false,
  height = multiline ? 5 : 1,
}: InputProps) {
  const theme = useTheme("dark");
  const [isFocused, setIsFocused] = useState(false);

  const displayValue = password ? "*".repeat(value.length) : value;
  const showPlaceholder = !value && placeholder;

  return (
    <Box
      height={height}
      paddingX={1}
      borderStyle={isFocused ? "double" : "single"}
      borderColor={isFocused ? theme.colors.accent : theme.colors.border}
      backgroundColor={theme.colors.surface}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
    >
      <Text color={showPlaceholder ? theme.colors.text.muted : theme.colors.text.primary}>
        {showPlaceholder ? placeholder : displayValue}
        {isFocused && <Text color={theme.colors.accent}>▌</Text>}
      </Text>
    </Box>
  );
}
```

### Archivo: `packages/sdk/src/tui/components/ui/Spinner.tsx`

```tsx
import React, { useState, useEffect } from "react";
import { Text } from "opentui";

const frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

interface SpinnerProps {
  color?: string;
}

export function Spinner({ color = "#58a6ff" }: SpinnerProps) {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setFrame((f) => (f + 1) % frames.length);
    }, 80);
    return () => clearInterval(timer);
  }, []);

  return <Text color={color}>{frames[frame]}</Text>;
}
```

---

## 2.4 Sistema de Navegación

### Archivo: `packages/sdk/src/tui/router/index.ts`

```typescript
import type { Screen } from "../store";

type RouteHandler = () => void;

class Router {
  private routes = new Map<Screen, RouteHandler>();
  private currentScreen: Screen = "dashboard";

  register(screen: Screen, handler: RouteHandler) {
    this.routes.set(screen, handler);
  }

  navigate(screen: Screen) {
    this.currentScreen = screen;
    const handler = this.routes.get(screen);
    handler?.();
  }

  getCurrentScreen(): Screen {
    return this.currentScreen;
  }
}

export const router = new Router();
```

---

## 2.5 Estado Global con Zustand

### Archivo: `packages/sdk/src/tui/store/index.ts`

```typescript
import { create } from "zustand";
import type { OpenFarmConfig, ExecutionResult } from "../../types";

export type Screen =
  | "dashboard"
  | "execute"
  | "executing"
  | "history"
  | "execution-detail"
  | "settings";

export interface Execution {
  id: string;
  task: string;
  provider: string;
  status: "pending" | "running" | "completed" | "failed";
  result?: ExecutionResult;
  startedAt: Date;
  completedAt?: Date;
}

interface AppState {
  // Config
  config: OpenFarmConfig;
  setConfig: (config: OpenFarmConfig) => void;

  // Navigation
  currentScreen: Screen;
  setScreen: (screen: Screen) => void;
  screenHistory: Screen[];
  goBack: () => void;

  // Executions
  executions: Execution[];
  currentExecution: Execution | null;
  addExecution: (execution: Execution) => void;
  updateExecution: (id: string, updates: Partial<Execution>) => void;
  setCurrentExecution: (execution: Execution | null) => void;

  // UI State
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  theme: "dark" | "light";
  setTheme: (theme: "dark" | "light") => void;
}

export const useAppStore = create<AppState>((set) => ({
  // Config
  config: {
    defaultProvider: "opencode",
    defaultModel: "claude-3.5-sonnet",
  },
  setConfig: (config) => set({ config }),

  // Navigation
  currentScreen: "dashboard",
  setScreen: (screen) =>
    set((state) => ({
      currentScreen: screen,
      screenHistory: [...state.screenHistory, state.currentScreen],
    })),
  screenHistory: [],
  goBack: () =>
    set((state) => {
      const history = [...state.screenHistory];
      const previous = history.pop();
      return {
        currentScreen: previous || "dashboard",
        screenHistory: history,
      };
    }),

  // Executions
  executions: [],
  currentExecution: null,
  addExecution: (execution) =>
    set((state) => ({
      executions: [execution, ...state.executions],
      currentExecution: execution,
    })),
  updateExecution: (id, updates) =>
    set((state) => ({
      executions: state.executions.map((e) =>
        e.id === id ? { ...e, ...updates } : e
      ),
      currentExecution:
        state.currentExecution?.id === id
          ? { ...state.currentExecution, ...updates }
          : state.currentExecution,
    })),
  setCurrentExecution: (execution) => set({ currentExecution: execution }),

  // UI State
  sidebarOpen: true,
  toggleSidebar: () =>
    set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  theme: "dark",
  setTheme: (theme) => set({ theme }),
}));
```

---

## 2.6 Actualizar App.tsx

### Archivo: `packages/sdk/src/tui/App.tsx`

```tsx
import React from "react";
import { Layout } from "./components/layout";
import { Dashboard } from "./screens/Dashboard";
import { Execute } from "./screens/Execute";
import { History } from "./screens/History";
import { Settings } from "./screens/Settings";
import { useAppStore } from "./store";
import type { OpenFarmConfig } from "../types";

interface AppProps {
  config: OpenFarmConfig;
}

export function App({ config }: AppProps) {
  const { currentScreen, setConfig } = useAppStore();

  // Set config on mount
  React.useEffect(() => {
    setConfig(config);
  }, [config, setConfig]);

  const renderScreen = () => {
    switch (currentScreen) {
      case "dashboard":
        return <Dashboard />;
      case "execute":
        return <Execute />;
      case "history":
        return <History />;
      case "settings":
        return <Settings />;
      default:
        return <Dashboard />;
    }
  };

  return <Layout>{renderScreen()}</Layout>;
}
```

---

## ✅ Criterios de Aceptación

- [ ] El theme system funciona (colores consistentes)
- [ ] El layout se renderiza correctamente (header, sidebar, footer)
- [ ] Se puede navegar entre pantallas con el sidebar
- [ ] Los componentes UI básicos funcionan (Button, Input, Spinner)
- [ ] El store mantiene estado entre navegaciones
- [ ] Los shortcuts del footer están documentados

---

## 📝 Notas

- OpenTUI puede tener diferencias en cómo maneja eventos (onPress vs onClick)
- El input de texto en TUI es complejo, considerar usar un componente de OpenTUI si existe
- Para el router, mantenerlo simple, no necesitamos algo tan complejo como React Router

---

## 🔄 Siguiente Paso

→ [Fase 3: Pantallas Principales](./phase-3-screens.md)
