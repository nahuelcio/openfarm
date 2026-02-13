# OpenFarm TUI v2

Ralph TUI-style dashboard layout with remote instances and subagent tracing.

## 🚀 Quick Start

```bash
# Run the demo
bun packages/sdk/src/tui/demo.tsx
```

## ✨ Features

### Phase 1: Dashboard Layout ✅
- Header with status indicator
- Tab bar for navigation (`[1-5]` or `[` `]`)
- Footer with keyboard shortcuts
- Stats cards showing execution metrics

### Phase 2: Subagent Tracing ✅
- Collapsible tree view
- Real-time status updates
- Duration tracking
- Keyboard navigation (↑↓, space, Ctrl+e, Ctrl+c)
- Toggle with `[T]`

### Phase 3: Remote Instances ✅
- WebSocket server/client
- Tab per instance (LOCAL, prod, staging, dev)
- Status indicators (● connected, ◐ connecting, ○ disconnected, ✗ error)
- Auto-reconnect

## ⌨️ Keyboard Shortcuts

### Global
| Key | Action |
|-----|--------|
| `1-5` | Switch to tab N |
| `[` `]` | Previous/Next tab |
| `T` | Toggle tracing panel |
| `?` | Help |
| `q` | Quit |

### Tracing Panel
| Key | Action |
|-----|--------|
| `↑↓` | Navigate traces |
| `Space/Enter` | Expand/Collapse |
| `Ctrl+e` | Expand all |
| `Ctrl+c` | Collapse all |

### Remote Instances
| Key | Action |
|-----|--------|
| `a` | Add remote instance |
| `c` | Connect/Disconnect |
| `d` | Delete instance |

## 📁 Structure

```
src/tui/
├── components/
│   ├── layout/
│   │   ├── header.tsx
│   │   ├── footer.tsx
│   │   └── main-layout.tsx
│   ├── tabs/
│   │   └── tab-bar.tsx
│   ├── trace-tree.tsx
│   ├── remote-tabs.tsx
│   └── index.ts
├── screens/
│   ├── new-dashboard.tsx
│   ├── remote-instances.tsx
│   └── running-with-tracing.tsx
├── store/
│   ├── tracing-store.ts
│   └── remote-store.ts
├── hooks/
│   └── use-tracing.ts
├── types/
│   ├── tracing.ts
│   └── remote.ts
├── demo.tsx
└── README-v2.md
```

## 🔌 Remote Server

### Start Server
```typescript
import { RemoteServer } from "@openfarm/remote-server";

const server = new RemoteServer({
  port: 8080,
  authToken: "secret"
});

await server.start();
```

### Connect Client
```typescript
import { RemoteClient } from "@openfarm/remote-server";

const client = new RemoteClient({
  url: "ws://localhost:8080",
  token: "secret"
});

await client.connect();
client.startTaskLoop(config);
```

## 🧪 Testing

```bash
# Type check
bunx tsc --noEmit

# Run demo
bun packages/sdk/src/tui/demo.tsx
```

## 📋 TODO

- [x] Phase 4: Rich Logs (filters, search, export)
- [ ] Phase 5: Custom Themes
- [ ] Integration with real agent execution
- [ ] Configuration persistence
