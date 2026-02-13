# @openfarm/web-ui

Web runtime for OpenFarm TUI. Renders to DOM using the same API as `@opentui/react`.

## Usage

### As a drop-in replacement

```typescript
// Instead of:
import { Box, Text, render, useInput } from "@openfarm/tui-opentui";

// Use:
import { Box, Text, render, useInput } from "@openfarm/web-ui";
```

### Running the SDK in web mode

```typescript
// packages/sdk/src/web-entry.ts
import { createWebApp } from "@openfarm/web-ui";
import { AppV2 } from "./tui/app-v2";
import { useStore } from "./tui/store";

export async function runWebUI(config?: OpenFarmConfig) {
  // Initialize stores same as TUI
  if (config) {
    useStore.setState({
      config,
      provider: config.defaultProvider || "external-agent",
    });
  }

  const app = createWebApp(AppV2, {
    title: "OpenFarm",
    theme: "dark",
  });

  await app.start();
}
```

### Development

```bash
cd packages/web-ui
bun install
bun run dev  # Starts Vite dev server on :3000
```

## API Compatibility

| OpenTUI | Web UI | Notes |
|---------|--------|-------|
| `Box` | ✅ `Box` | Maps to flexbox div |
| `Text` | ✅ `Text` | Maps to span |
| `useInput` | ✅ `useInput` | Listens to window keydown |
| `useKeyboard` | ✅ `useKeyboard` | Same as useInput but raw |
| `useStdoutDimensions` | ✅ `useStdoutDimensions` | Uses window.innerWidth/Height |
| `render` | ✅ `render` | Renders to #root |

## Differences from Terminal

- **Dimensions**: Web uses pixels, terminal uses cells. The runtime approximates (`1 cell = 4px`).
- **Colors**: Web uses CSS colors, terminal uses ANSI. Pass hex codes.
- **Fonts**: Web renders with system monospace fonts.
- **Mouse**: Web has native mouse support (onClick, etc).
