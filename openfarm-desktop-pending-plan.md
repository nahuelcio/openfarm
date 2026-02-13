# OpenFarm Desktop - Plan Detallado de Pendientes

Fecha de actualización: 2026-02-13  
Scope: cerrar paridad funcional/UX con Conductor en `openfarm-desktop/` y deprecar TUI sin romper uso actual.

## 1. Estado Actual (baseline real)

### Implementado
- Spawn de agentes con worktree por agente.
- Streaming de output (`agent:output`) y cierre de lifecycle (`agent:completed` / `agent:failed`).
- Kill con PID tracking.
- Retry funcional.
- Review con diff resumen + diff por archivo (`get_diff_files`).
- Manejo explícito de conflictos de merge (`agent:merge-conflict`).
- Persistencia de `projects` y `sessions` en SQLite.
- System tray básico (show/quit).

### Aún faltante (resumen ejecutivo)
- Flujo completo Conductor de **workspace lifecycle** (crear desde branch/PR/issue, archive/restore).
- **PR workflow** (crear PR, checks, merge desde GitHub), hoy sólo merge local.
- **Scripts** (`setup`, `run`, `archive`) y modo `nonconcurrent`.
- **Testing UX** tipo Run Panel + Spotlight testing.
- **Checkpoints** y revert por turno.
- **Todos/notes bloqueantes para merge**.
- **Slash commands** y gestión de **MCP**.
- Hardening de ejecución (seguridad de comandos, cross-platform, tests, confiabilidad).

## 2. Referencias de Paridad (Conductor docs, validadas hoy)

- Welcome: https://docs.conductor.build/
- Workflow: https://docs.conductor.build/workflow
- Diff Viewer: https://docs.conductor.build/core/diff-viewer
- Parallel agents: https://docs.conductor.build/core/parallel-agents
- Scripts: https://docs.conductor.build/core/scripts
- Run scripts: https://docs.conductor.build/guides/how-to-run
- Setup scripts: https://docs.conductor.build/guides/how-to-setup
- Sharing `conductor.json`: https://docs.conductor.build/core/conductor-json
- Testing + Spotlight: https://docs.conductor.build/core/testing
- Spotlight guide: https://docs.conductor.build/guides/spotlight-testing
- Checkpoints: https://docs.conductor.build/core/checkpoints
- Todos: https://docs.conductor.build/core/todos
- Slash commands: https://docs.conductor.build/core/slash-commands
- MCP: https://docs.conductor.build/core/mcp
- Workspaces/branches tips: https://docs.conductor.build/tips/workspaces-and-branches
- Open in IDE: https://docs.conductor.build/guides/use-with-cursor

## 3. Backlog Detallado (priorizado)

## P0 - Bloqueantes de producto

- [x] `P0-01` Endurecer ejecución de procesos por provider.
  - Problema: hoy `run_agent` pasa `task` como argumento directo al binario sin contrato claro por provider.
  - Entregable: adapter por provider (`claude`, `opencode`, `aider`, `codex`) con args/flags explícitos.
  - Verificación: smoke test por provider con comando mínimo + salida no vacía.

- [x] `P0-02` Seguridad de comandos shell.
  - Problema: uso extensivo de `sh -c` con interpolación de paths/branches.
  - Entregable: reemplazar por `Command::new(...).args(...)` y sanitización de inputs.
  - Verificación: tests de path con espacios/caracteres especiales; sin ejecución de payload arbitrario.

- [x] `P0-03` Robustez de worktrees y ramas.
  - Problema: casos de branch existente, cleanup parcial, estados inconsistentes.
  - Entregable: operaciones idempotentes `create/remove`, detección de colisión y recuperación.
  - Verificación: crear/eliminar/recrear mismo workspace 5 veces sin residuos.

- [x] `P0-04` Persistencia real de agentes.
  - Problema: reiniciar app pierde estado/outputs de agentes.
  - Entregable: tabla `agents` + `agent_events` persistidas en SQLite.
  - Verificación: cerrar/reabrir app y recuperar historial completo.

- [x] `P0-05` Merge flow confiable.
  - Problema: approve local sin pasos guiados ni rechazo explícito.
  - Entregable: estados `reviewing`, `approved`, `rejected`, `merge_conflict`, `merged`.
  - Avance adicional: Review UI envía motivo de rechazo editable al backend (`reject_agent` con `reason` explícito).
  - Verificación: escenarios success/conflict/reject cubiertos en UI y backend.

## P1 - Paridad workflow Conductor

- [~] `P1-01` Modelo de Workspace como entidad principal.
  - Entregable: `workspaces` (id, repo, branch, status, path, archived_at).
  - Incluye: vista Workspaces con filtro por repo/estado.
  - Avance: filtros operativos por `repo_path` y estado (`all/active/archived`) en la vista Workspaces.
  - Verificación: creación, apertura, archivado, restauración.

- [~] `P1-02` Crear workspace desde branch/PR/issue.
  - Entregable: wizard “New workspace” con tabs `Branch`, `PR`, `Issue`.
  - Verificación: workspace creado sobre branch existente y branch nueva.

- [~] `P1-03` PR workflow.
  - Entregable: “Create PR” + “Merge PR” (GitHub CLI/API), feedback de checks.
  - Avance: `refresh_workspace_pr` ahora consume `statusCheckRollup` (GitHub CLI), persiste resumen de checks (passed/failed/pending) y UI lo muestra por workspace.
  - Verificación: PR real creada, checks visibles, merge ejecutado desde UI.

- [~] `P1-04` Archive/restore workspace.
  - Entregable: acción de archive que limpia recursos y mantiene metadata/chat.
  - Verificación: archive elimina worktree; restore recompone workspace.

- [~] `P1-05` Open in IDE (`cmd+O`).
  - Entregable: botón y shortcut para abrir workspace en Cursor/VSCode.
  - Verificación: focus/reopen correcto en macOS.

## P1 - Scripts y testing UX

- [~] `P1-06` Repository settings + scripts.
  - Entregable: CRUD de `setup`, `run`, `archive` y `runScriptMode`.
  - Avance: backend SQLite + comandos Tauri (`get/set/run/stop_workspace_script`) + UI base por workspace (editar scripts, modo y ejecutar setup/run/archive/stop).
  - Verificación: setup corre al crear workspace; run botón funciona; archive cleanup corre.

- [~] `P1-07` Soporte `conductor.json` compatible.
  - Entregable: parser/validator + precedencia (local settings vs archivo compartido).
  - Avance: carga automática de scripts y `runScriptMode` desde `conductor.json` al crear workspace (fallback a defaults locales si no existe config).
  - Verificación: aplicar config versionada al clonar/pullar.

- [~] `P1-08` Run panel.
  - Entregable: panel con logs live, stop/restart, estado concurrent/nonconcurrent.
  - Avance: panel dedicado `Runs` implementado con acciones `run/stop/restart`; backend emite `workspace-script:output` y `workspace-script:status` para logs/estado live; `nonconcurrent` aplica kill al run previo del mismo workspace.
  - Verificación: dos runs simultáneos en concurrent; auto-kill en nonconcurrent.

- [~] `P1-09` Spotlight testing (fase experimental).
  - Entregable: modo spotlight + sync workspace->root reversible.
  - Avance: comandos Tauri `enable_workspace_spotlight` / `disable_workspace_spotlight` con snapshot `refs/openfarm/spotlight/...`, guardas de working tree limpio y UI por workspace para activar/desactivar con estado/sync timestamp.
  - Verificación: on/off restaura estado root sin pérdida.

## P2 - Funciones “power user” de Conductor

- [~] `P2-01` Checkpoints por turno + revert.
  - Entregable: snapshot por turno de chat y botón revert.
  - Avance: checkpoints por workspace persistidos en SQLite (`create/get/revert`) con snapshot Git ref (`stash create`/`HEAD`) y UI base en Run Panel para crear/listar/revertir.
  - Verificación: revert elimina mensajes/cambios posteriores de forma consistente.

- [~] `P2-02` Todos bloqueantes para merge.
  - Entregable: notas/todos por workspace; merge bloqueado con pendientes.
  - Avance: tabla `workspace_todos` + comandos CRUD en backend; `merge_workspace_pr` ahora rechaza merge con todos pendientes; UI en Workspaces para crear/tildar/eliminar todos y deshabilitar botón Merge PR cuando hay pendientes.
  - Verificación: no se puede mergear con todos abiertos.

- [~] `P2-03` Slash commands.
  - Entregable: resolución de comandos markdown (`.claude/commands`) en composer.
  - Avance: backend lista y expande slash commands desde `.claude/commands/*.md`; Spawn UI muestra comandos disponibles del workspace e inserta `/comando`; expansión automática al spawn para tasks que empiezan con `/`.
  - Verificación: comando custom ejecuta prompt expandido correctamente.

- [~] `P2-04` Gestión MCP.
  - Entregable: UI para listar/agregar/quitar servidores MCP y healthcheck.
  - Avance: persistencia SQLite de `mcp_servers`, comandos Tauri CRUD + healthcheck básico (`--version`/`--help`) y vista `MCP` para alta/listado/check/enable-disable/delete.
  - Verificación: server agregado usable desde chat y persistido por usuario.

## P2 - UX/UI de paridad

- [~] `P2-05` Rework de layout principal.
  - Entregable: sidebar de repos/workspaces, panel chat, panel diff/run.
  - Avance: dashboard migrado a shell con sidebar persistente + panel principal; navegación clave y métricas movidas al sidebar para evitar saltos de pantalla entre vistas.
  - Verificación: navegación sin saltos de pantalla full replace.

- [~] `P2-06` Diff viewer avanzado.
  - Entregable: file tree, split/unified toggle, syntax highlight, acciones sugeridas.
  - Avance: Review incorpora file list filtrable, selección directa por archivo y toggle `Unified/Split` con render split básico lado a lado.
  - Verificación: review de cambios grandes (>1000 líneas) sin degradación crítica.

- [~] `P2-07` Shortcuts clave.
  - Entregable: `cmd+n`, `cmd+shift+n`, `cmd+d`, `cmd+shift+p`, `cmd+o`.
  - Avance: shortcuts globales implementados en frontend (`spawn`, `workspaces`, `dashboard`, `projects`, `open in IDE` del workspace seleccionado/activo).
  - Verificación: shortcuts activos y documentados en UI.

## P3 - Calidad, observabilidad, seguridad

- [~] `P3-01` Testing mínimo exigible.
  - Backend: unit tests Rust para git/process lifecycle.
  - Frontend: tests Vitest para estados review/run/workspace.
  - E2E: 3 flujos críticos (spawn->review->merge, conflict, archive/restore).
  - Avance: tests unitarios backend añadidos para adapter de provider (`agent_command.rs`) y helpers puros de workspace/PR parsing (`lib.rs`); en frontend se agregó cobertura Vitest en TUI para review (`review-workflow`) y estado run/workspace en store.
  - Validación local: suite completa de `packages/sdk` en verde (17 files, 374 tests).
  - Avance CI: nuevo workflow `CI - OpenFarm Desktop` ejecuta `bun run lint` en `openfarm-desktop/` y `cargo test` + `cargo fmt --check` en `openfarm-desktop/src-tauri`.

- [~] `P3-02` Lint reproducible.
  - Problema actual: `bun run lint` falla por `ultracite` ausente.
  - Entregable: comando lint portable por workspace y CI.
  - Avance: `openfarm-desktop` ahora tiene `lint` propio (`bunx @biomejs/biome check src`) y `biome.json` local aislado de `ultracite/core`; root migrado a `bunx @biomejs/biome lint packages` sin errores ni warnings.
  - Nota: validación local OK en root y en `openfarm-desktop`.
  - Verificación: lint local + CI verde.

- [~] `P3-03` Hardening Tauri.
  - Entregable: CSP no nula, permisos mínimos, revisar `withGlobalTauri`.
  - Avance: `withGlobalTauri` deshabilitado y CSP explícita aplicada en `tauri.conf.json` con fuentes acotadas para app/assets/ipc/dev server.
  - Verificación: auditoría seguridad básica sin findings críticos.

- [~] `P3-04` Crash/error reporting local.
  - Entregable: logging estructurado por workspace/agent con rotación.
  - Avance: inicialización de logger con archivo local rotado (`flexi_logger`, tamaño y retención configurados) para trazabilidad persistente de backend.
  - Verificación: trazabilidad completa de un fallo en backend/frontend.

## 4. Plan de Deprecación de TUI (sin romper usuarios)

- [~] `D-01` Congelar nuevas features en TUI.
  - Sólo fixes críticos.
  - Avance: policy explícita en docs (`packages/sdk/README.md`) + warning de legacy en entrypoint CLI.

- [~] `D-02` Marcar TUI como `legacy` en CLI y docs.
  - Mensaje explícito: desktop es path recomendado.
  - Avance: warning explícito en `packages/sdk/src/cli.ts` y sección README raíz marcada como `Terminal UI (TUI) - Legacy`.

- [~] `D-03` Paridad mínima antes de corte.
  - Gate: workspace lifecycle + review/merge + scripts + run panel.
  - Avance: spotlight testing inicial implementado + filtros workspace-first + reject con motivo explícito en Review; falta cerrar validación e2e de lifecycle completo y merge conflict path end-to-end en desktop.

- [~] `D-04` Ventana de convivencia.
  - 2 releases con fallback TUI documentado.
  - Avance: fallback TUI documentado como opt-in (`--legacy-tui` / `OPENFARM_ENABLE_LEGACY_TUI=1`) en README raíz y `packages/sdk/README.md`; ventana de releases formalizada en `docs/desktop-migration-window.md`.

- [~] `D-05` Retiro definitivo del entrypoint principal TUI.
  - Mantener comando legacy opt-in por 1 release adicional.
  - Avance: CLI de `@openfarm/sdk` ahora bloquea TUI por defecto y exige opt-in explícito para migración; criterio de retiro definido por release (`N`, `N+1`, `N+2`) en `docs/desktop-migration-window.md`.

## 5. Roadmap por Fases (propuesto)

## Fase 1 (1-2 semanas): confiabilidad core
- `P0-01` a `P0-05`.
- Salida: desktop estable para uso diario interno.

## Fase 2 (2-3 semanas): workflow Conductor base
- `P1-01` a `P1-05`.
- Salida: workspace-first + PR/archive con flujo completo.

## Fase 3 (2 semanas): scripts/testing
- `P1-06` a `P1-09`.
- Salida: setup/run/archive + testing operable desde UI.

## Fase 4 (2-3 semanas): power features
- `P2-01` a `P2-07`.
- Salida: checkpoints, todos, slash, MCP, shortcuts.

## Fase 5 (1-2 semanas): calidad y deprecación TUI
- `P3-01` a `P3-04` + `D-01` a `D-05`.
- Salida: release candidate desktop-first.

## 6. Criterios de “Done” final

- [ ] Workspace lifecycle completo: create/open/review/pr/merge/archive/restore.
- [ ] Scripts (`setup`, `run`, `archive`) + `runScriptMode` funcionando.
- [ ] Review robusto: diff avanzado + manejo conflictos + reject.
- [ ] Feature set clave Conductor: checkpoints, todos, slash commands, MCP.
- [~] QA automática: lint + tests verdes en CI.
- [ ] TUI oficialmente deprecada con plan de salida ejecutado.

## 7. Riesgos y mitigación

- Riesgo: sobrecargar `lib.rs` con lógica de dominio.
  - Mitigación: extraer módulos (`git_service`, `process_service`, `workspace_service`).

- Riesgo: deuda UX por iterar sin design system.
  - Mitigación: definir componentes base (sidebar, panels, status badges, diff primitives).

- Riesgo: regresiones por falta de tests.
  - Mitigación: bloquear merge de features P0/P1 sin tests mínimos.

- Riesgo: lock-in a macOS por comandos Unix.
  - Mitigación: abstraer operaciones OS y evitar `sh -c` donde sea posible.
