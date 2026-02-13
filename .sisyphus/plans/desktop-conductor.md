# OpenFarm Desktop - Conductor Clone MVP

## TL;DR

> **Objetivo**: Crear app de escritorio multiplataforma (Tauri v2) con todas las funcionalidades de Conductor.build para vibe coding con múltiples agentes AI.

> **Entregables**: 
> - App de escritorio (~5MB)
> - Multi-agent parallel execution
> - Dashboard visual
> - Workspace isolation (git worktrees)
> - Review & Merge workflow
> - System tray integration

> **Esfuerzo**: XL (MVP en ~1 semana)
> **Ejecución**: Parallel waves

---

## Contexto

### Request Original
"copiar todas las funcionalidades de CONDUCTOR.build como mvp"

### Referencias
- **Conductor.build**: Multi-agent AI coding platform
- **Tauri v2**: Desktop framework (Rust + WebView)
- **Stack actual**: React TUI en SDK

### Investigación Previa
- Tauri 2.0 soporta Windows, macOS, Linux
- Tamaño mínimo ~600KB
- Comunicación via IPC Rust ↔ JS
- Soporta cualquier framework frontend

---

## Objetivos de Trabajo

### Objetivo Core
Desktop app que permite:
1. Ejecutar múltiples agentes AI en paralelo
2. Cada agente tiene workspace aislado (git worktree)
3. Dashboard visual con status real-time
4. Review de cambios + approve/merge
5. Integración desktop (tray, shortcuts)

### Features Conductor (Todas)
- [ ] Multiple AI agents (Claude Code, Codex, Aider, OpenCode)
- [ ] Parallel execution
- [ ] Isolated workspaces (git worktree per agent)
- [ ] Dashboard con grid de agentes
- [ ] Real-time output streaming
- [ ] Branch management
- [ ] Diff viewer
- [ ] Review workflow (approve/reject)
- [ ] Git merge
- [ ] Multi-repo support
- [ ] System tray
- [ ] Native file dialogs

### Definición de Done
- [ ] App corre en macOS/Linux/Windows
- [ ] 3+ agentes pueden correr en paralelo
- [ ] Dashboard muestra status real-time
- [ ] Cada agente tiene worktree aislado
- [ ] Diff viewer muestra cambios
- [ ] Approve hace merge a main
- [ ] System tray funciona

### Must Have
- Multi-agent parallel execution
- Git worktree isolation
- Dashboard UI
- Diff viewer
- Approve/Merge workflow
- System tray

### Must NOT Have (Guardrails)
- Cloud/hosted version
- Multi-user/team collaboration
- Plugin marketplace
- Mobile app
- VS Code extension

---

## Estrategia de Verificación

### Test Decision
- **Infraestructura existe**: NO (nuevo proyecto)
- **Tests**: Unit tests en Rust + Integration tests
- **Framework**: Rust built-in testing + Vitest frontend

### QA Scenarios (Agent-Executed)

**Scenario 1: Spawn 3 agents parallel**
```
Tool: Bash
Steps:
  1. Run desktop app
  2. Click "New Agent" x3
  3. Enter task for each
  4. Verify all 3 start running
Expected Result: 3 agents show "running" status
```

**Scenario 2: Workspace isolation**
```
Tool: Bash
Steps:
  1. ls /tmp/openfarm-worktrees/
  2. Verify 3 separate directories
Expected Result: Each agent has own worktree
```

**Scenario 3: Approve & Merge**
```
Tool: Bash + Git
Steps:
  1. Click "Review" on completed agent
  2. Click "Approve"
  3. Verify merge to main branch
Expected Result: Changes merged, commit created
```

---

## Estrategia de Ejecución

### Parallel Execution Waves

```
Wave 1 (Setup):
├── 1. Initialize Tauri v2 project
├── 2. Setup frontend (migrate TUI)
└── 3. Configure build

Wave 2 (Core Backend):
├── 4. Agent spawn command (Rust)
├── 5. Agent pool management
└── 6. Workspace isolation (git worktree)

Wave 3 (Frontend):
├── 7. Dashboard UI
├── 8. Agent cards & status
└── 9. Spawn screen

Wave 4 (Review Flow):
├── 10. Diff viewer component
├── 11. Approve workflow
└── 12. Merge logic

Wave 5 (Desktop Integration):
├── 13. System tray
├── 14. Window controls
└── 15. Final testing
```

---

## TODOs

### Wave 1: Setup

- [ ] 1. Initialize Tauri v2 project

  **What to do**:
  - Create new Tauri v2 project
  - Install dependencies
  - Configure tauri.conf.json
  - Add logging setup

  **References**:
  - https://v2.tauri.app/start/create-project/
  - https://v2.tauri.app/reference/config/

  **Acceptance Criteria**:
  - [ ] `cargo tauri dev` runs without error
  - [ ] Window opens showing blank app
  - [ ] Build produces executable

- [ ] 2. Migrate/Setup frontend

  **What to do**:
  - Copy React components from SDK TUI
  - Install frontend dependencies
  - Configure Vite/React
  - Verify components render

  **References**:
  - packages/sdk/src/tui/ (existing components)

  **Acceptance Criteria**:
  - [ ] Frontend builds
  - [ ] Components display in desktop window

- [ ] 3. Configure build & icons

  **What to do**:
  - Set app name, version
  - Add app icons
  - Configure build targets (macOS, Linux, Windows)
  - Test production build

  **Acceptance Criteria**:
  - [ ] `cargo tauri build` produces .exe/.app
  - [ ] Icon displays correctly

### Wave 2: Core Backend (Rust)

- [ ] 4. Agent spawn command

  **What to do**:
  - Create Tauri command `spawn_agent`
  - Accept: task, provider, workspace
  - Return: agent_id
  - Spawn child process for CLI agent
  - Stream output back to frontend

  **Recommended Agent Profile**:
  - Category: `ultrabrain`
  - Skills: ["rust", "system-programming"]

  **References**:
  - packages/sdk/src/tui/utils/execution-runner.ts (existing logic)
  - https://v2.tauri.app/featuresIPC/

  **Acceptance Criteria**:
  - [ ] Command spawns agent process
  - [ ] Returns valid agent_id
  - [ ] Process runs in background

- [ ] 5. Agent pool management

  **What to do**:
  - Track all running agents in Rust
  - Implement: list_agents, kill_agent, get_status
  - Enforce max 8 concurrent agents
  - Handle process lifecycle

  **Acceptance Criteria**:
  - [ ] Can list all agents
  - [ ] Can kill running agent
  - [ ] Max 8 limit enforced

- [ ] 6. Workspace isolation (git worktree)

  **What to do**:
  - Create Tauri command `create_workspace`
  - Accept: agent_id, main_repo_path
  - Create git branch: `openfarm-{agent_id}`
  - Create git worktree in temp directory
  - Command `cleanup_workspace` to remove

  **References**:
  - packages/sdk/src/tui/utils/workspace-manager.ts (existing logic)

  **Acceptance Criteria**:
  - [ ] Worktree created for each agent
  - [ ] Branch created automatically
  - [ ] Cleanup removes worktree

### Wave 3: Frontend UI

- [ ] 7. Dashboard UI

  **What to do**:
  - Grid layout showing all agents
  - Header with stats (running/completed/failed)
  - Real-time updates via events
  - Responsive design

  **Acceptance Criteria**:
  - [ ] Shows all agents in grid
  - [ ] Stats update in real-time

- [ ] 8. Agent cards & status

  **What to do**:
  - Card component per agent
  - Status indicators (pending/running/completed/failed)
  - Progress display
  - Click to select

  **Acceptance Criteria**:
  - [ ] Each agent shows as card
  - [ ] Status icons work
  - [ ] Selection highlights card

- [ ] 9. Spawn screen

  **What to do**:
  - Form to create new agent
  - Task description input
  - Provider selector
  - Number of agents (1-8)
  - Launch button

  **Acceptance Criteria**:
  - [ ] Can enter task
  - [ ] Can select provider
  - [ ] Can spawn agent(s)

### Wave 4: Review Flow

- [ ] 10. Diff viewer component

  **What to do**:
  - Fetch diff from worktree vs main
  - Display with syntax highlighting
  - Unified/split view toggle
  - File navigation

  **Acceptance Criteria**:
  - [ ] Shows changed files
  - [ ] Displays diff correctly

- [ ] 11. Approve workflow

  **What to do**:
  - Button to approve agent changes
  - Show diff summary before confirm
  - Update agent status to "approved"

  **Acceptance Criteria**:
  - [ ] Approve button works
  - [ ] Shows confirmation dialog

- [ ] 12. Merge logic

  **What to do**:
  - Git add + commit in worktree
  - Git checkout main
  - Git merge branch (no-ff)
  - Handle conflicts gracefully
  - Cleanup worktree after merge

  **Acceptance Criteria**:
  - [ ] Merge creates commit
  - [ ] Changes appear in main branch
  - [ ] Worktree cleaned up

### Wave 5: Desktop Integration

- [ ] 13. System tray

  **What to do**:
  - Add system tray icon
  - Context menu: Show/Hide, Quit
  - Badge for running agents count
  - Click to show/hide window

  **References**:
  - https://v2.tauri.app/features/tray/

  **Acceptance Criteria**:
  - [ ] Tray icon visible
  - [ ] Menu works
  - [ ] Click toggles window

- [ ] 14. Window controls

  **What to do**:
  - Native title bar with controls
  - Minimize to tray option
  - Remember window position/size

  **Acceptance Criteria**:
  - [ ] Window controls work
  - [ ] Close/minimize/maximize

- [ ] 15. Final testing

  **What to do**:
  - Test all flows end-to-end
  - Verify on macOS
  - Verify on Linux
  - Performance testing

  **Acceptance Criteria**:
  - [ ] All features work
  - [ ] Builds for all platforms
  - [ ] No crashes

---

## Success Criteria

### Verification Commands
```bash
# Development
cargo tauri dev

# Production build
cargo tauri build

# Run tests
cargo test
```

### Final Checklist
- [ ] Multi-agent execution works
- [ ] Dashboard shows all agents
- [ ] Workspace isolation per agent
- [ ] Diff viewer functional
- [ ] Approve & Merge workflow complete
- [ ] System tray works
- [ ] Builds for macOS/Linux/Windows
- [ ] All "Must Have" present
- [ ] All "Must NOT Have" absent

---

## Out of Scope

NOT IN SCOPE:
- Cloud/hosted version
- Multi-user/team collaboration
- Plugin marketplace
- Mobile app
- VS Code extension
- Scheduled/recurring tasks
- Auto-merge without approval
