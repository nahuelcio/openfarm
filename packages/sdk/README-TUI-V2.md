# OpenFarm TUI v2 - USO REAL

## 🚀 Comandos disponibles

### Desde la raíz del proyecto:
```bash
# TUI Principal (Ralph-style Dashboard)
bun run tui

# Task Loop autónomo
bun run tui:loop

# Remote Server
bun run tui:server
```

### Desde el package sdk:
```bash
cd packages/sdk

# TUI Principal
bun run tui

# Task Loop
bun run loop

# Remote Server
bun run server
```

### Directo con bun:
```bash
# Dashboard
bun packages/sdk/src/cli.ts

# Task Loop
bun packages/sdk/src/cli.ts task-loop

# Remote Server
bun packages/sdk/src/cli.ts remote-server --port=8080
```

## ⌨️ Controles en la TUI

### Navegación
| Tecla | Acción |
|-------|--------|
| `1-6` | Tabs (Dashboard, Execute, History, Workflows, Context, Remotes) |
| `[` `]` | Tab anterior/siguiente |
| `?` | Ayuda |
| `q` | Salir |

### Remote Instances
| Tecla | Acción |
|-------|--------|
| `a` | Agregar instancia remota |
| `c` | Conectar/Desconectar |
| `d` | Eliminar instancia |

### Tracing (durante ejecución)
| Tecla | Acción |
|-------|--------|
| `T` | Toggle panel de tracing |
| `↑↓` | Navegar traces |
| `Space` | Expandir/Colapsar |
| `Ctrl+e` | Expandir todo |
| `Ctrl+c` | Colapsar todo |

## 📂 Estructura

```
src/tui/
├── cli/
│   ├── task-loop-cli.tsx      ← CLI de task loop real
│   └── remote-server-cli.tsx  ← CLI de remote server real
├── app-v2.tsx                 ← App principal con tabs
├── components/
│   ├── layout/                ← Header/Footer/Main
│   ├── trace-tree.tsx         ← Árbol de subagentes
│   └── remote-tabs.tsx        ← Tabs de instancias
└── screens/
    ├── new-dashboard.tsx      ← Dashboard Ralph-style
    └── running-with-tracing.tsx ← Ejecución + tracing
```

## 🔧 Variables de entorno

```bash
# Provider default
OPENFARM_PROVIDER=external-agent  # o claude, aider

# API Keys
OPENFARM_API_KEY=sk-...

# Remote Server
OPENFARM_REMOTE_TOKEN=secret
```
