# OpenFarm Theme System

Theme system for customizing the TUI appearance with built-in and custom themes.

## Features

- 5 built-in themes (Default, Dracula, Solarized Dark, Solarized Light, High Contrast)
- Custom theme loading from JSON files
- Live theme switching via UI
- CLI flag support for theme selection
- Accessibility-focused High Contrast theme

## Built-in Themes

### 1. Default
Classic dark theme with cyan accents.
```bash
bun run tui --theme default
```

### 2. Dracula
Popular dark theme with purple/pink accents.
```bash
bun run tui --theme dracula
```

### 3. Solarized Dark
Precision colors for machines and people (dark variant).
```bash
bun run tui --theme solarized-dark
```

### 4. Solarized Light
Precision colors for machines and people (light variant).
```bash
bun run tui --theme solarized-light
```

### 5. High Contrast
High contrast theme for accessibility.
```bash
bun run tui --theme high-contrast
```

## Usage

### Via CLI Flag

```bash
# Use built-in theme
bun run tui --theme dracula

# Use custom theme file (not implemented yet)
bun run tui --theme ./path/to/custom-theme.json
```

### Via TUI

1. Launch the TUI: `bun run tui`
2. Press `t` on the dashboard (or navigate to Settings)
3. Select your theme from the list
4. Press Enter to apply

### Programmatic Usage

```typescript
import { useTheme, useThemeActions } from "./theme";

function MyComponent() {
  const theme = useTheme();
  const { setTheme } = useThemeActions();

  return (
    <Text color={theme.styles.header.color} bold={theme.styles.header.bold}>
      Themed Header
    </Text>
  );
}
```

### Using ThemedText Component

```typescript
import { ThemedText } from "../components/themed-text";

function MyComponent() {
  return (
    <>
      <ThemedText styleType="header">Header Text</ThemedText>
      <ThemedText styleType="taskRunning">Running task</ThemedText>
      <ThemedText styleType="taskCompleted">Completed task</ThemedText>
      <ThemedText styleType="logError">Error message</ThemedText>
    </>
  );
}
```

## Theme Structure

### Interface

```typescript
interface Theme {
  id: string;
  name: string;
  colors: ThemeColors;
  styles: ThemeStyles;
}

interface ThemeColors {
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
}

interface ThemeStyles {
  header: TextStyle;
  headerStatus: TextStyle;
  taskRunning: TextStyle;
  taskCompleted: TextStyle;
  taskFailed: TextStyle;
  taskPending: TextStyle;
  logDebug: TextStyle;
  logInfo: TextStyle;
  logWarn: TextStyle;
  logError: TextStyle;
  spinner: TextStyle;
  tabActive: TextStyle;
  tabInactive: TextStyle;
  border: TextStyle;
  label: TextStyle;
  value: TextStyle;
  treeIcon: TextStyle;
  treeExpanded: TextStyle;
  treeCollapsed: TextStyle;
  buttonPrimary: TextStyle;
  buttonSecondary: TextStyle;
}

interface TextStyle {
  color?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  dimColor?: boolean;
  inverse?: boolean;
}
```

## Creating Custom Themes

### 1. Create Theme JSON (Future feature)

```json
{
  "id": "my-theme",
  "name": "My Custom Theme",
  "colors": {
    "background": "#1a1a1a",
    "foreground": "#f0f0f0",
    "primary": "#ff6b6b",
    "secondary": "#4ecdc4",
    "success": "#95e1d3",
    "error": "#ff6b6b",
    "warning": "#ffe66d",
    "info": "#4ecdc4",
    "muted": "#888888",
    "border": "#333333"
  },
  "styles": {
    "header": { "color": "primary", "bold": true },
    "taskRunning": { "color": "warning", "bold": true },
    "taskCompleted": { "color": "success" },
    "taskFailed": { "color": "error" },
    "logError": { "color": "error", "bold": true }
  }
}
```

### 2. Load Custom Theme (Future feature)

```bash
bun run tui --theme ./my-theme.json
```

## API

### Hooks

- `useTheme()` - Get current theme
- `useThemeColors()` - Get theme colors only
- `useThemeStyle(styleName)` - Get specific style
- `useCurrentThemeId()` - Get current theme ID
- `useAvailableThemes()` - Get all available themes
- `useThemeActions()` - Get theme switching actions

### Store Actions

- `setTheme(themeId)` - Switch to a different theme
- `loadCustomTheme(theme)` - Load a custom theme
- `resetTheme()` - Reset to default theme

## Examples

### Example 1: Themed Component

```typescript
import { ThemedText } from "../components/themed-text";
import { useTheme } from "../theme";

export function StatusIndicator({ status }: { status: string }) {
  const theme = useTheme();

  return (
    <Box>
      <ThemedText styleType="label">Status:</ThemedText>
      <ThemedText styleType={`task${status}`}>{status}</ThemedText>
    </Box>
  );
}
```

### Example 2: Dynamic Styling

```typescript
import { useThemeStyle } from "../theme";

export function CustomButton({ label }: { label: string }) {
  const buttonStyle = useThemeStyle("buttonPrimary");

  return (
    <Text {...buttonStyle}>
      {label}
    </Text>
  );
}
```

## Future Enhancements

- [ ] Custom theme file loading
- [ ] Theme hot-reloading
- [ ] Theme persistence (save selected theme)
- [ ] Theme validation
- [ ] More built-in themes (Monokai, Nord, etc.)
- [ ] Color palette generator
- [ ] Visual theme editor in TUI
