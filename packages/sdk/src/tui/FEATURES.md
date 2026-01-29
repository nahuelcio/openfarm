# OpenFarm TUI - Feature Summary

## 🎨 Themes (6 total)

| Theme | Colors | Style |
|-------|--------|-------|
| 🌙 Dark | Blue/Purple | GitHub Dark |
| ☀️ Light | Blue/Gray | GitHub Light |
| 🧛 Dracula | Purple/Green | Classic Dracula |
| 🎯 Monokai | Yellow/Red | Classic Monokai |
| ❄️ Nord | Blue/Gray | Arctic Theme |
| 🌑 One Dark | Blue/Green | Atom One Dark |

## 📱 Screens (6 total)

1. **Dashboard** - Stats cards, recent activity, quick actions
2. **Execute** - Provider selection, task input, run execution
3. **Executing** - Live progress, logs, cancel button
4. **History** - Table view of all executions
5. **ExecutionDetail** - Tabs: Output, Stats, Log
6. **Settings** - Theme picker, export/clear history, config

## 🎛️ Components

### Layout
- `Layout` - Main app layout with header, sidebar, footer
- `Header` - Logo, provider, model info
- `Sidebar` - Navigation with mouse support
- `Footer` - Keyboard shortcuts

### UI
- `Button` - Primary, secondary, danger variants
- `Input` - Single/multi-line with focus state
- `Spinner` - Animated loading indicator
- `ProgressBar` - Visual progress with percentage
- `Badge` - Status indicators (success, warning, error)
- `Divider` - Section separators with labels
- `Card` - Contained content with borders

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+N` | New Task |
| `Ctrl+H` | View History |
| `Ctrl+S` | Settings |
| `Ctrl+D` | Dashboard |
| `Ctrl+Q` | Quit |
| `Esc` | Go Back |

## 💾 Persistence

- Executions saved to `~/.openfarm/executions.json`
- Config loaded from `~/.openfarm/.openfarmrc.json`
- Auto-save on every change
- Export to JSON file

## ⚙️ Configuration

### Config File (`.openfarmrc.json`)
```json
{
  "defaultProvider": "opencode",
  "defaultModel": "claude-3.5-sonnet",
  "theme": "dark",
  "apiUrl": "http://localhost:3000",
  "timeout": 600000
}
```

### Environment Variables
- `OPENFARM_PROVIDER`
- `OPENFARM_MODEL`
- `OPENFARM_API_URL`
- `OPENFARM_API_KEY`
- `OPENFARM_THEME`

## 🔧 Architecture

```
tui/
├── components/
│   ├── layout/          # Header, Sidebar, Footer, Layout
│   └── ui/              # Button, Input, Spinner, etc.
├── screens/             # 6 main screens
├── store/               # Zustand + persistence
├── hooks/               # useExecution, useKeyboard
├── theme/               # 6 color themes
├── config/              # Config loader
└── __tests__/           # Tests
```

## 🚀 Usage

```bash
# Run TUI
bun run dev

# Run legacy CLI
bun run dev -- --cli "task"

# With config
OPENFARM_THEME=dracula bun run dev
```

## ✨ Key Features

- ✅ Real-time streaming of execution output
- ✅ Cancel running executions
- ✅ Progress bar with step tracking
- ✅ Retry failed executions
- ✅ Export/import execution history
- ✅ Error codes and messages
- ✅ 6 different color themes
- ✅ Keyboard navigation
- ✅ Mouse support
- ✅ Persistent storage
