# OpenFarm TUI

Terminal User Interface for OpenFarm SDK using OpenTUI.

## Features

- 🎨 **Interactive Dashboard** - View stats and recent activity
- 🚀 **Task Execution** - Run AI coding tasks with multiple providers
- 📜 **Execution History** - Track and review past executions
- 📊 **Real-time Logs** - Stream output as tasks run
- ⚙️ **Persistent Config** - Settings stored in `~/.openfarm/`
- ⌨️ **Keyboard Shortcuts** - Navigate quickly without mouse

## Quick Start

```bash
# Run the TUI
bun run dev

# Or with explicit path
bun run packages/sdk/src/cli.ts
```

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+N` | New Task |
| `Ctrl+H` | View History |
| `Ctrl+S` | Settings |
| `Ctrl+D` | Dashboard |
| `Ctrl+Q` | Quit |
| `Esc` | Go Back |

## Configuration

Create a config file at `~/.openfarm/.openfarmrc.json`:

```json
{
  "defaultProvider": "opencode",
  "defaultModel": "claude-3.5-sonnet",
  "theme": "dark",
  "shortcuts": {
    "newTask": "Ctrl+N",
    "history": "Ctrl+H"
  }
}
```

Or use environment variables:

```bash
export OPENFARM_PROVIDER=opencode
export OPENFARM_MODEL=claude-3.5-sonnet
export OPENFARM_API_URL=http://localhost:3000
```

## Data Storage

Executions are automatically saved to:
- **macOS/Linux**: `~/.openfarm/executions.json`
- **Windows**: `%USERPROFILE%\.openfarm\executions.json`

## Architecture

```
tui/
├── components/        # Reusable UI components
│   ├── layout/       # Header, Sidebar, Footer, Layout
│   └── ui/           # Button, Input, Spinner
├── screens/          # Main screens
│   ├── Dashboard.tsx
│   ├── Execute.tsx
│   ├── Executing.tsx
│   ├── History.tsx
│   ├── ExecutionDetail.tsx
│   └── Settings.tsx
├── store/            # State management
│   ├── index.ts      # Zustand store
│   └── storage.ts    # Persistence layer
├── hooks/            # Custom React hooks
│   ├── useExecution.ts
│   └── useKeyboard.ts
├── theme/            # Colors and styling
└── config/           # Config loading
```

## Development

```bash
# Run in development mode
bun run dev

# Run legacy CLI mode
bun run dev:cli

# Type check
bun run type-check

# Build
bun run build
```

## Legacy CLI Mode

To use the old non-TUI mode:

```bash
bun run dev -- --cli "your task here"
```
