# Comparación: Ralph TUI vs OpenFarm

## Visión General

| Aspecto | Ralph TUI | OpenFarm |
|----------|-------------|-----------|
| **Enfoque** | Orquestador autónomo de loop de tareas | Plataforma SDK + TUI multi-provider |
| **Estrellas** | 1.7k ⭐ | - (reciente) |
| **Arquitectura** | Monolítica (1 paquete) | Monorepo modular (31 paquetes) |
| **Filosofía** | "Set and forget" - bucle autónomo | SDK programático + TUI interactivo |
| **Maturidad** | ~1100 commits, muy estable | En desarrollo activo |

---

## Arquitectura

### Ralph TUI - Monolítica Focalizada
```
ralph-tui/
├── src/
│   ├── engine/        # Core execution loop
│   ├── plugins/
│   │   ├── agents/    # Claude, OpenCode, Droid
│   │   └── trackers/  # Beads, JSON
│   ├── remote/        # Remote instances (WebSocket)
│   ├── tui/           # OpenTUI components
│   └── templates/      # Handlebars templates
└── skills/             # Bundled skills
```

**Características:**
- Single binary - instalable globalmente
- Todo en un paquete: TUI + engine + plugins
- OpenTUI (no React) para UI de terminal
- ~4500 líneas solo en `engine/index.ts` - muy completo

### OpenFarm - Modular y Separada
```
packages/
├── task-loop          # Loop orchestrator (Ralph-like)
├── workflow-engine    # Orquestación de workflows
├── agent-runner       # Ejecución de agentes
├── execution-logger  # Logs a SQLite
├── provider-claude    # Provider Anthropic
├── provider-opencode  # Provider OpenCode
├── provider-aider     # Provider Aider
├── git-diff          # Diff viewer
├── context           # Generador de contexto
├── workflow-executor # Ejecutor de workflows
└── ... (25+ packages más)
```

**Características:**
- Monorepo con Turbo
- Cada paquete tiene responsabilidad única
- SDK programático (`@openfarm/sdk`) + TUI
- Ink (React) para UI de terminal
- Publica todos los paquetes a npm

---

## Loop de Ejecución

### Ralph TUI - Autónomo Completo
```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   ┌──────────────┐     ┌──────────────┐     ┌──────────────┐   │
│   │  1. SELECT   │────▶│  2. BUILD    │────▶│  3. EXECUTE  │   │
│   │    TASK      │     │    PROMPT    │     │    AGENT     │   │
│   └──────────────┘     └──────────────┘     └──────────────┘   │
│          ▲                                         │            │
│          │                                         ▼            │
│   ┌──────────────┐                         ┌──────────────┐    │
│   │  5. NEXT     │◀────────────────────────│  4. DETECT   │    │
│   │    TASK      │                         │  COMPLETION  │    │
│   └──────────────┘                         └──────────────┘    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Detección de completion:**
- Señal explícita: `<promise>COMPLETE</promise>`
- Pattern matching en output del agente
- Confiable pero requiere que el agente use el patrón

**Features de robustez:**
- Rate limit detection + exponential backoff
- Error handling configurable (retry/skip/abort)
- Agent switching automático cuando falla uno
- Task filtering por IDs

### OpenFarm - Loop Modular (Similar enfoque)
```typescript
// task-loop/src/orchestrator.ts
SELECT task by priority
↓
BUILD prompt from task data
↓
EXECUTE via workflow engine
↓
DETECT completion
↓
REPEAT until done
```

**Detección de completion:**
- Estrategia configurable (Git changes, output patterns, etc.)
- Más flexible pero más complejo
- `CompletionDetectorConfig` personalizable

---

## Tracking de Tareas

### Ralph TUI
**Trackers:**
- **prd.json** - Simple JSON con lista de tareas
- **Beads** - Git-backed con dependencias (uso de `br` CLI)
- **Beads-BV** - Variante de Beads
- **JSON** - Tracker genérico

**Features de Beads:**
- Dependencias entre tareas
- Tipos: epic, task, bug, feature
- Prioridades P0-P4
- Sync con Git

### OpenFarm
**Tracking:**
- SQL database (better-sqlite3)
- Task data guardado en `execution-logger`
- Workflow management
- No integración con Beads aún

**Enfoque:**
- Más programático (API)
- Menos orientado a "tracker externo"
- Integrado al flujo de trabajo

---

## Integración con Agentes

### Ralph TUI - Plugin System
```typescript
// plugins/agents/
├── builtin/
│   ├── claude.ts      # Claude Code CLI
│   ├── opencode.ts    # OpenCode CLI
│   └── droid.ts       # Factory Droid
└── tracing/            # Subagent tracing parser
```

**Features:**
- `AgentPlugin` interface estandarizada
- `detect()` - Verifica disponibilidad
- `validateModel()` - Valida modelo
- `execute()` - Ejecuta con callbacks
- Subagent tracing (parsing de JSONL)

**Output parsing:**
- OpenCode: parser de mensajes JSONL
- Droid: parser específico para su formato
- Claude: JSONL directo

### OpenFarm - Provider System
```typescript
packages/
├── provider-opencode/  # OpenCode integration
├── provider-claude/    # Anthropic/Claude
├── provider-aider/     # Aider CLI
└── agent-wrapper/      # Wrapper genérico
```

**Enfoque:**
- Separación de provider por paquete
- Más extensión posible
- SDK como capa de abstracción

---

## TUI (Terminal UI)

### Ralph TUI - OpenTUI
```typescript
// src/tui/
├── components/    # React components
├── index.ts      # Main entry
└── theme.ts      # Custom themes
```

**Features:**
- Teclado completo: `s` start, `p` pause, `d` dashboard, `T` subagent tree
- Tab multi-instance (local + remotes)
- Subagent tracing visual (árbol jerárquico)
- Custom themes (dracula, catppuccin, etc.)
- Dashboard con status detallado

**Atajos de teclado:**
```
s - Start execution
p - Pause/Resume
d - Toggle dashboard
T - Toggle subagent tree
o - Cycle right panel
1-9 - Switch tab 1-9
[ / ] - Prev/Next tab
q - Quit
```

### OpenFarm - Ink (React)
```typescript
// packages/sdk/src/tui/
├── app.tsx          # Main app
├── components/      # React components
└── cli.ts           # Entry point
```

**Features:**
- React para terminal (Ink)
- Diff viewer con syntax highlighting
- Execution history (SQLite)
- Real-time streaming
- Context generator

**Enfoque:**
- Más tradicional en componentes de React
- Menos atajos de teclado
- Más enfocado en historia y diff viewing

---

## Remote Instance Management

### Ralph TUI - WebSocket + Two-tier Token
**Arquitectura:**
```
Server (remote)          Client (local TUI)
├── WebSocket server  ───▶ WebSocket client
├── Token: 90d (server)
└── Token: 24h (session)     ───▶ Full control
```

**Features:**
- `ralph-tui run --listen` - Modo servidor
- `ralph-tui remote add/list/test` - Gestión de remotes
- Tab-based interface (LOCAL [1] │ prod [2] │ staging [3])
- Push config a remotes
- Audit logging (`~/.config/ralph-tui/audit.log`)
- Auto-reconnect con exponential backoff

**Security:**
- Server token: 90 días, almacenado en disco
- Connection token: 24 horas, auto-refresh
- Solo bind a 127.0.0.1 sin token
- Bind a 0.0.0.0 con token

### OpenFarm - Remote Server Package
```typescript
packages/
└── remote-server/      # Remote control server
```

**Features:**
- `bun run tui:server` - Inicia servidor
- Similar concepto pero arquitectura diferente

---

## Sandbox Support

### Ralph TUI
```typescript
sandbox: {
  enabled: boolean;
  network?: boolean;  // false = block network
  mode?: 'bwrap' | 'sandbox-exec';
}
```

**Implementación:**
- Linux: `bwrap` (bubblewrap)
- macOS: `sandbox-exec` (built-in)
- Network blocking configurable
- Detect requirements por agente

### OpenFarm
- No se encontró sandbox explícito en el código explorado
- Podría estar en `agent-runner` o similar

---

## Templates y Prompts

### Ralph TUI - Handlebars
```handlebars
{{#if task.description}}
## Description
{{task.description}}
{{/if}}

## Instructions
Complete task {{task.id}}: {{task.title}}
{{#if recentProgress}}
## Recent Progress
{{recentProgress}}
{{/if}}

{{#if codebasePatterns}}
## Codebase Patterns
{{codebasePatterns}}
{{/if}}
```

**Features:**
- Tracker-owned templates
- Custom user templates
- Recent progress context
- Codebase patterns extraction

### OpenFarm - No se encontró evidencia de templates
- Podría usar generación dinámica
- Menos estructurado que Ralph

---

## Testing y Calidad

### Ralph TUI
- **>50% coverage requerido** (enforced by Codecov)
- Bun test
- Test naming conventions
- Factories y mocks
- CI con GitHub Actions
- `ubs` (Ultimate Bug Scanner) integrado para pre-commit

### OpenFarm
- **80% coverage target** (AGENTS.md)
- TDD estricto: Red → Green → Refactor
- Unit tests dominate, limited integration
- Jest + Vitest
- Turbo para build/test

---

## Diferencias Clave de Diseño

| Aspecto | Ralph TUI | OpenFarm |
|----------|-------------|-----------|
| **Primer uso** | "ralph-tui setup" → "ralph-tui run" | "npm install @openfarm/sdk" → código |
| **Filosofía** | Baterías incluidas, "set and forget" | SDK programático + TUI |
| **Extensibilidad** | Plugin system (agents + trackers) | Paquetes npm separados |
| **Compleción** | Señal explícita `<promise>COMPLETE` | Estrategias múltiples |
| **UI** | OpenTUI, más "native" | Ink/React, más "web-like" |
| **Tracking** | Beads (git-backed) | SQLite (programático) |
| **Remote** | Integrado, tab-based | Paquete separado |

---

## Ventajas de Ralph TUI

1. **Compleción autónoma** - Configurar PRD y olvidar
2. **Beads integration** - Dependencias de tareas, sync con Git
3. **Subagent tracing** - Árbol visual de llamadas anidadas
4. **Remote control** - Gestión multi-instancia desde una TUI
5. **UBS pre-commit** - Bug catching antes de commits
6. **Single binary** - Instalación global simple
7. **Rate limit handling** - Backoff automático, switch de agente

---

## Ventajas de OpenFarm

1. **SDK programático** - Integrable en cualquier app TypeScript
2. **Arquitectura modular** - Paquetes reutilizables individualmente
3. **Multiple providers** - OpenCode, Claude, Aider
4. **Diff viewer** - Syntax highlighting en terminal
5. **Execution history** - SQLite persistente, búsquedas
6. **Workflow engine** - Orquestación de workflows complejos
7. **Context generator** - Mejor understanding del codebase

---

## Conclusión

**Ralph TUI** es una herramienta **end-to-end** perfecta para:
- Autonomía completa en desarrollo
- Proyectos que usan Beads para issue tracking
- Equipos que quieren "set and forget"
- Developers que prefieren TUI vs IDE

**OpenFarm** es una **plataforma SDK** ideal para:
- Integración programática en otras herramientas
- Arquitecturas modulares con paquetes separados
- Proyectos que necesitan control granular de ejecución
- Equipos que prefieren API + TUI combinado

**OpenFarm está inspirado en Ralph** (`task-loop` lo cita explícitamente en el JSDoc) pero:
- Arquitectura mucho más modular (31 paquetes vs 1)
- Enfoque SDK vs CLI autónomo
- Más extensibilidad vía paquetes npm separados

Ambos son proyectos de alta calidad con enfoques diferentes. Ralph es "baterías incluidas", OpenFarm es "bloques de construcción".
