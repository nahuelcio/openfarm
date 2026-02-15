# MCP Marketplace para OpenFarm

## TL;DR

> **Objetivo**: Reemplazar el sistema actual de MCPs con un marketplace/catalogo donde los usuarios pueden descubrir, instalar y configurar MCPs (como Context7, Figma, GitHub) de forma sencilla.
>
> **Deliverables**:
> - Package `@openfarm/mcp-marketplace` con lógica core
> - Catálogo JSON estático con MCPs predefinidos
> - API para instalar/agregar MCPs (npm install + registro)
> - UI TUI en OpenFarm Desktop para navegar el marketplace
>
> **Estimated Effort**: Large (3-4 días)
> **Parallel Execution**: YES - Lógica core y UI pueden ir en paralelo
> **Critical Path**: Core types → Catalog structure → Install API → UI integration

---

## Context

### Original Request
Crear un marketplace de MCPs similar a la funcionalidad de Warp, donde:
- Hay un listado de MCPs disponibles (Context7, Figma, GitHub, Linear, Notion, Playwright, etc.)
- Cada MCP tiene nombre, descripción, ícono
- Botón "+" para instalar/agregar
- Search bar para filtrar
- Botón "Add" para agregar MCPs personalizados
- MCPs universales (funcionan con cualquier provider: opencode, claude, codex)

### Decisiones Clave
1. **Reemplaza sistema actual**: El nuevo marketplace reemplaza completamente la tabla `mcp_servers` existente y el sistema de configuración actual
2. **Instalación completa**: "Instalar" = ejecutar `npm install -g` + registrar en la base de datos
3. **Configuración con defaults**: El catálogo JSON incluye valores por defecto para args y env
4. **MCPs universales**: Todos los MCPs funcionan con cualquier provider

### Sistema Actual (a reemplazar)
- Tabla `mcp_servers` en SQLite
- Interface `McpServerConfig`: `{ name, command, args, env }`
- Endpoints CRUD en Tauri
- Config manual en archivos

---

## Work Objectives

### Core Objective
Crear un sistema de marketplace de MCPs que permita a los usuarios descubrir, instalar automáticamente y configurar MCPs para sus providers.

### Concrete Deliverables
- Package `packages/mcp-marketplace/` con:
  - Tipos TypeScript (`McpCatalogEntry`, `InstalledMcp`)
  - Catálogo JSON (`catalog.json`)
  - Servicio de instalación (`McpInstaller`)
  - Servicio de gestión (`McpManager`)
- Actualización de providers para usar el nuevo sistema
- UI TUI en OpenFarm Desktop (listado, búsqueda, instalación)

### Definition of Done
- [ ] Usuario puede ver listado de MCPs disponibles en TUI
- [ ] Usuario puede buscar/filtrar MCPs
- [ ] Usuario puede instalar un MCP con un clic (npm install + registro)
- [ ] MCP instalado aparece en la configuración del provider
- [ ] Usuario puede remover MCPs instalados

### Must Have
- Catálogo JSON con al menos 6 MCPs: Context7, Figma, GitHub, Linear, Notion, Playwright
- Instalación automática vía npm
- Persistencia en SQLite (nueva tabla o migración)
- UI TUI funcional en OpenFarm Desktop

### Must NOT Have (Guardrails)
- NO remote catalog fetching (solo JSON local)
- NO validación de salud automática (usar existente)
- NO soporte multi-version (un entry por MCP)
- NO modificación de código de providers existentes (solo integración)

---

## Verification Strategy (MANDATORY)

> **UNIVERSAL RULE: ZERO HUMAN INTERVENTION**
>
> ALL tasks in this plan MUST be verifiable WITHOUT any human action.

### Test Decision
- **Infrastructure exists**: YES (bun test ya configurado en el monorepo)
- **Automated tests**: Tests after (no TDD estricto por ser feature nueva)
- **Framework**: bun test

### Agent-Executed QA Scenarios (MANDATORY)

**Verification Tool by Deliverable Type:**

| Type | Tool | How Agent Verifies |
|------|------|-------------------|
| **Frontend/UI** | interactive_bash (tmux) | Run TUI, navigate, interact |
| **API/Backend** | Bash (bun test) | Run unit tests |
| **Integration** | Bash (curl/scripts) | Test end-to-end flow |

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately):
├── Task 1: Core Types and Catalog Structure
└── Task 4: UI Component Structure

Wave 2 (After Wave 1):
├── Task 2: MCP Installation Service
└── Task 5: TUI Marketplace View

Wave 3 (After Wave 2):
├── Task 3: MCP Management API
└── Task 6: Integration with Providers

Wave 4 (Final):
└── Task 7: End-to-End Testing & Polish

Critical Path: Task 1 → Task 2 → Task 3 → Task 6
Parallel Speedup: ~30% faster than sequential
```

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|---------------------|
| 1 | None | 2, 3 | 4 |
| 2 | 1 | 3 | - |
| 3 | 2 | 6 | - |
| 4 | None | 5 | 1 |
| 5 | 4 | 6 | - |
| 6 | 3, 5 | 7 | - |
| 7 | 6 | None | - |

---

## TODOs

### Task 1: Core Types and Catalog Structure

**What to do**:
- Crear tipos TypeScript en `packages/mcp-marketplace/src/types.ts`:
  - `McpCatalogEntry`: Datos del catálogo (name, description, icon, npmPackage, configSchema, defaultArgs, defaultEnv)
  - `InstalledMcp`: MCP instalado (id, catalogEntryId, configOverrides, installedAt)
- Crear archivo `packages/mcp-marketplace/catalog.json` con 6 MCPs:
  - Context7: `@upstash/context7-mcp`
  - Figma: `@fern-api/figma-mcp`
  - GitHub: `@modelcontextprotocol/server-github`
  - Linear: `linear-mcp`
  - Notion: `@notionhq/notion-mcp`
  - Playwright: `@modelcontextprotocol/server-playwright`
- Crear validador de schema para el catálogo

**Must NOT do**:
- NO agregar lógica de instalación todavía
- NO modificar providers existentes
- NO crear UI todavía

**Recommended Agent Profile**:
- **Category**: `quick` (tipos y estructura)
- **Skills**: `typescript` (definición de tipos), `json-schema` (validación)
- **Skills Evaluated but Omitted**: `opentui` (todavía no UI)

**Parallelization**:
- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 1 (with Task 4)
- **Blocks**: Task 2, Task 3
- **Blocked By**: None

**References**:
- `packages/core/src/types/opencode-config.ts:45-78` - Interface `McpServerConfig` actual
- `packages/core/src/db/schema.ts:120-150` - Tabla `mcp_servers` existente
- `packages/types/src/index.ts` - Patrón de tipos en OpenFarm
- MCP official docs: https://modelcontextprotocol.io/ - Schema de MCPs

**Acceptance Criteria**:
- [ ] Archivo `types.ts` con interfaces definidas
- [ ] Archivo `catalog.json` con 6 MCPs válidos
- [ ] Validador que chequee schema del catálogo
- [ ] Test: `bun test packages/mcp-marketplace/src/__tests__/catalog.test.ts` → PASS

**Agent-Executed QA Scenarios**:

```
Scenario: Catalog JSON is valid
  Tool: Bash (bun test)
  Preconditions: None
  Steps:
    1. Run: bun test packages/mcp-marketplace/src/__tests__/catalog.test.ts
    2. Assert: Exit code 0
    3. Assert: Output contains "6 MCPs validated"
  Expected Result: All tests pass
  Evidence: Test output captured

Scenario: Types compile correctly
  Tool: Bash
  Preconditions: None
  Steps:
    1. Run: cd packages/mcp-marketplace && bun run typecheck
    2. Assert: Exit code 0
    3. Assert: No TypeScript errors
  Expected Result: Types compile sin errores
  Evidence: Typecheck output captured
```

**Commit**: YES
- Message: `feat(mcp-marketplace): add core types and catalog structure`
- Files: `packages/mcp-marketplace/src/types.ts`, `packages/mcp-marketplace/catalog.json`
- Pre-commit: `bun test packages/mcp-marketplace`

---

### Task 2: MCP Installation Service

**What to do**:
- Crear `packages/mcp-marketplace/src/services/installer.ts`:
  - Clase `McpInstaller`
  - Método `install(mcpId: string): Promise<InstalledMcp>`:
    1. Buscar MCP en catálogo
    2. Ejecutar `npm install -g ${npmPackage}`
    3. Detectar comando ejecutable (heurística o config)
    4. Crear entrada en DB
    5. Retornar `InstalledMcp`
  - Método `uninstall(mcpId: string): Promise<void>`
  - Manejo de errores (package no existe, permisos, etc.)
- Crear tests unitarios

**Must NOT do**:
- NO modificar providers todavía
- NO crear API HTTP todavía (eso es Task 3)

**Recommended Agent Profile**:
- **Category**: `quick` (lógica de negocio)
- **Skills**: `typescript` (implementación)
- **Skills Evaluated but Omitted**: `git-master` (no git operations needed)

**Parallelization**:
- **Can Run In Parallel**: NO
- **Parallel Group**: Wave 2
- **Blocks**: Task 3
- **Blocked By**: Task 1

**References**:
- `packages/core/src/db/schema.ts` - Patrón de tablas SQLite
- `packages/git-adapter/src/index.ts:45-90` - Ejemplo de exec de comandos
- npm docs: https://docs.npmjs.com/cli/v10/commands/npm-install - Instalación global

**Acceptance Criteria**:
- [ ] Servicio `McpInstaller` implementado
- [ ] Tests: instalación exitosa, errores manejados
- [ ] `bun test packages/mcp-marketplace/src/__tests__/installer.test.ts` → PASS

**Agent-Executed QA Scenarios**:

```
Scenario: Install MCP successfully
  Tool: Bash (bun test con mocks)
  Preconditions: Catálogo creado (Task 1)
  Steps:
    1. Mock exec de npm install
    2. Call: installer.install('github')
    3. Assert: exec llamado con 'npm install -g @modelcontextprotocol/server-github'
    4. Assert: DB entry creada
    5. Assert: Returns InstalledMcp
  Expected Result: MCP instalado y registrado
  Evidence: Test output

Scenario: Handle install error
  Tool: Bash (bun test)
  Preconditions: None
  Steps:
    1. Mock exec para que falle con "EACCES"
    2. Call: installer.install('github')
    3. Assert: Throws McpInstallError
    4. Assert: Error message contains "Permission denied"
  Expected Result: Error manejado correctamente
  Evidence: Test output
```

**Commit**: YES
- Message: `feat(mcp-marketplace): add MCP installation service`
- Files: `packages/mcp-marketplace/src/services/installer.ts`

---

### Task 3: MCP Management API

**What to do**:
- Crear `packages/mcp-marketplace/src/services/manager.ts`:
  - Clase `McpManager`
  - Métodos:
    - `listAvailable(): McpCatalogEntry[]` - Listado del catálogo
    - `listInstalled(): InstalledMcp[]` - Listado de DB
    - `getInstalled(mcpId): InstalledMcp | null`
    - `updateConfig(mcpId, config)` - Actualizar config de un MCP instalado
    - `isInstalled(mcpId): boolean`
- Integrar con `McpInstaller` del Task 2
- Crear API para ser usada por Tauri/commands

**Must NOT do**:
- NO crear endpoints HTTP todavía (Tauri lo hace)
- NO modificar UI

**Recommended Agent Profile**:
- **Category**: `quick`
- **Skills**: `typescript`

**Parallelization**:
- **Can Run In Parallel**: NO
- **Parallel Group**: Wave 3
- **Blocks**: Task 6
- **Blocked By**: Task 2

**References**:
- `packages/core/src/db/` - Patrón de acceso a DB
- `packages/config/src/index.ts` - Config management

**Acceptance Criteria**:
- [ ] `McpManager` implementado con todos los métodos
- [ ] Tests: list, get, update, isInstalled
- [ ] `bun test packages/mcp-marketplace/src/__tests__/manager.test.ts` → PASS

**Agent-Executed QA Scenarios**:

```
Scenario: List available MCPs
  Tool: Bash (bun test)
  Steps:
    1. Call: manager.listAvailable()
    2. Assert: Returns array of 6 McpCatalogEntry
    3. Assert: Each has name, description, icon
  Expected Result: Lista de MCPs disponibles
  Evidence: Test output

Scenario: Install and verify
  Tool: Bash (bun test)
  Steps:
    1. Call: installer.install('figma')
    2. Assert: manager.isInstalled('figma') === true
    3. Call: manager.getInstalled('figma')
    4. Assert: Returns InstalledMcp con config
  Expected Result: MCP instalado y recuperable
  Evidence: Test output
```

**Commit**: YES
- Message: `feat(mcp-marketplace): add MCP management API`
- Files: `packages/mcp-marketplace/src/services/manager.ts`

---

### Task 4: UI Component Structure

**What to do**:
- En `packages/web-ui` (o nuevo package si aplica):
  - Crear estructura de componentes:
    - `McpMarketplaceView` - Vista principal del marketplace
    - `McpCard` - Card individual de MCP
    - `McpSearch` - Componente de búsqueda
    - `McpInstallButton` - Botón de instalar/desinstalar
- Definir props y interfaces de UI
- Crear estructura de estado (React/Vue según el proyecto)

**Must NOT do**:
- NO implementar lógica real todavía (solo estructura)
- NO conectar con API del Task 3 todavía

**Recommended Agent Profile**:
- **Category**: `visual-engineering`
- **Skills**: `frontend-ui-ux`, `typescript`
- **Skills Evaluated but Omitted**: `opentui` (verificar si se usa TUI específico)

**Parallelization**:
- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 1 (with Task 1)
- **Blocks**: Task 5
- **Blocked By**: None

**References**:
- `packages/web-ui/src/components/` - Estructura de componentes existente
- `packages/web-ui/src/App.tsx` (o similar) - Cómo se estructura la UI

**Acceptance Criteria**:
- [ ] Componentes creados con interfaces definidas
- [ ] Storybook o preview funcional (si aplica)
- [ ] `bun run build` en web-ui → SUCCESS

**Agent-Executed QA Scenarios**:

```
Scenario: Components render correctly
  Tool: Bash (bun test)
  Steps:
    1. Run: bun test packages/web-ui/src/components/mcp/
    2. Assert: All component tests pass
    3. Assert: No console errors
  Expected Result: Componentes renderizan sin errores
  Evidence: Test output
```

**Commit**: YES
- Message: `feat(web-ui): add MCP marketplace component structure`
- Files: `packages/web-ui/src/components/mcp/`

---

### Task 5: TUI Marketplace View

**What to do**:
- Implementar `McpMarketplaceView`:
  - Listado scrollable de MCPs
  - Search bar en header
  - Filtros por categoría (si aplica)
  - Cada card muestra: icono, nombre, descripción, botón +/✓
- Implementar interacciones:
  - Search: filtra lista en tiempo real
  - Click en card: ver detalle (configuración)
  - Click en +: instalar MCP
  - Click en ✓: desinstalar MCP
- Integrar con `McpManager` (del Task 3)

**Must NOT do**:
- NO implementar pantalla de detalle compleja (v1: solo install/uninstall)
- NO persistencia de filtros (opcional)

**Recommended Agent Profile**:
- **Category**: `visual-engineering`
- **Skills**: `frontend-ui-ux`, `opentui` (si es TUI específico)

**Parallelization**:
- **Can Run In Parallel**: NO
- **Parallel Group**: Wave 2
- **Blocks**: Task 6
- **Blocked By**: Task 4

**References**:
- `packages/web-ui/src/App.tsx` - Entry point de la UI
- `packages/web-ui/src/components/` - Patrones de UI existentes
- Screenshot de Warp (proporcionado por usuario) - Referencia visual

**Acceptance Criteria**:
- [ ] Vista de marketplace funcional
- [ ] Search filtra correctamente
- [ ] Botón de install/uninstall funciona
- [ ] UI actualiza después de install/uninstall

**Agent-Executed QA Scenarios**:

```
Scenario: View marketplace and search
  Tool: interactive_bash (tmux) o Playwright (según stack)
  Preconditions: App corriendo, catálogo con 6 MCPs
  Steps:
    1. Navigate to: /mcp-marketplace (o ruta correspondiente)
    2. Assert: Lista de 6 MCPs visible
    3. Type "git" en search box
    4. Assert: Solo GitHub visible, otros filtrados
    5. Clear search
    6. Assert: Todos los MCPs visibles
  Expected Result: Search funciona correctamente
  Evidence: Screenshot .sisyphus/evidence/task-5-search.png

Scenario: Install MCP from UI
  Tool: interactive_bash (tmux)
  Preconditions: App corriendo, MCP no instalado
  Steps:
    1. Navigate to: /mcp-marketplace
    2. Find: GitHub MCP card
    3. Click: Button "+"
    4. Wait: Installation complete (spinner → checkmark)
    5. Assert: Button ahora muestra "✓" o "Remove"
    6. Assert: En DB, GitHub aparece como instalado
  Expected Result: MCP instalado desde UI
  Evidence: Screenshot .sisyphus/evidence/task-5-install.png

Scenario: Uninstall MCP from UI
  Tool: interactive_bash (tmux)
  Preconditions: GitHub MCP instalado
  Steps:
    1. Navigate to: /mcp-marketplace
    2. Find: GitHub MCP card (debería mostrar "✓")
    3. Click: Button "✓" o "Remove"
    4. Wait: Uninstall confirmation
    5. Assert: Button ahora muestra "+"
    6. Assert: En DB, GitHub ya no aparece
  Expected Result: MCP desinstalado desde UI
  Evidence: Screenshot .sisyphus/evidence/task-5-uninstall.png
```

**Commit**: YES
- Message: `feat(web-ui): implement MCP marketplace view`
- Files: `packages/web-ui/src/components/mcp/McpMarketplaceView.tsx`

---

### Task 6: Integration with Providers

**What to do**:
- Actualizar `packages/provider-opencode`, `provider-claude`, etc.:
  - Cambiar de leer config antigua a usar `McpManager`
  - Integrar `listInstalled()` para obtener MCPs activos
  - Pasar MCPs al agent-runner/workflow
- Crear migración de datos si hay MCPs instalados en formato viejo
- Actualizar tipos de config

**Must NOT do**:
- NO romper compatibilidad (migración suave)
- NO eliminar código antiguo hasta que todo funcione (deprecated primero)

**Recommended Agent Profile**:
- **Category**: `unspecified-high` (integración compleja)
- **Skills**: `typescript`, `git-master`

**Parallelization**:
- **Can Run In Parallel**: NO
- **Parallel Group**: Wave 4 (with Task 7)
- **Blocks**: Task 7
- **Blocked By**: Task 3, Task 5

**References**:
- `packages/provider-opencode/src/` - Cómo se configura actualmente
- `packages/agent-runner/src/` - Cómo se pasan MCPs al workflow
- `packages/core/src/db/migrations/` - Patrón de migraciones

**Acceptance Criteria**:
- [ ] Providers usan nuevo sistema de MCPs
- [ ] MCPs instalados desde marketplace funcionan en providers
- [ ] Migración de datos existentes (si aplica)
- [ ] Tests de integración pasan

**Agent-Executed QA Scenarios**:

```
Scenario: Installed MCPs available in provider
  Tool: Bash (integration test)
  Preconditions: GitHub MCP instalado vía marketplace
  Steps:
    1. Start: provider-opencode
    2. Config: Usar McpManager para obtener MCPs
    3. Assert: GitHub aparece en lista de MCPs del provider
    4. Run: Workflow que usa GitHub MCP
    5. Assert: Workflow ejecuta sin errores
  Expected Result: MCP del marketplace funciona en provider
  Evidence: Test output + logs
```

**Commit**: YES
- Message: `feat(providers): integrate with new MCP marketplace system`
- Files: `packages/provider-opencode/src/config.ts`, etc.

---

### Task 7: End-to-End Testing & Polish

**What to do**:
- Tests E2E:
  - Flujo completo: ver marketplace → search → install → usar en provider
  - Edge cases: install duplicado, uninstall MCP en uso, errores de red (npm)
- Polish:
  - Mensajes de error amigables
  - Loading states
  - Empty states (no MCPs instalados)
  - Documentación básica

**Must NOT do**:
- NO agregar features nuevas (solo polish)
- NO cambiar arquitectura

**Recommended Agent Profile**:
- **Category**: `quick` (tests y polish)
- **Skills**: `playwright` (para E2E), `typescript`

**Parallelization**:
- **Can Run In Parallel**: NO
- **Parallel Group**: Wave 4
- **Blocks**: None (final)
- **Blocked By**: Task 6

**Acceptance Criteria**:
- [ ] Tests E2E pasan
- [ ] UI polish: loading, error, empty states
- [ ] Documentación: README básico del package
- [ ] Linting: `bun run lint` → 0 errores

**Agent-Executed QA Scenarios**:

```
Scenario: End-to-end marketplace flow
  Tool: Playwright (si aplica web) o interactive_bash (TUI)
  Preconditions: App fresh, no MCPs instalados
  Steps:
    1. Open: Marketplace
    2. Search: "github"
    3. Click: Install en GitHub
    4. Wait: Installation complete
    5. Open: Provider opencode
    6. Assert: GitHub aparece como MCP disponible
    7. Run: Task que usa GitHub MCP
    8. Assert: Task completa exitosamente
  Expected Result: Flujo completo funciona
  Evidence: Screenshot + test report

Scenario: Error handling
  Tool: interactive_bash
  Preconditions: Simular error de red/npm
  Steps:
    1. Attempt: Install MCP
    2. Force: Network error
    3. Assert: UI muestra error amigable
    4. Assert: Retry button disponible
  Expected Result: Errores manejados gracefully
  Evidence: Screenshot
```

**Commit**: YES
- Message: `test(mcp-marketplace): add E2E tests and polish`
- Files: `packages/mcp-marketplace/README.md`, tests/

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 1 | `feat(mcp-marketplace): add core types and catalog structure` | types.ts, catalog.json | bun test |
| 2 | `feat(mcp-marketplace): add MCP installation service` | services/installer.ts | bun test |
| 3 | `feat(mcp-marketplace): add MCP management API` | services/manager.ts | bun test |
| 4 | `feat(web-ui): add MCP marketplace component structure` | components/mcp/ | bun build |
| 5 | `feat(web-ui): implement MCP marketplace view` | McpMarketplaceView.tsx | interactive test |
| 6 | `feat(providers): integrate with new MCP marketplace system` | provider-*/ | integration test |
| 7 | `test(mcp-marketplace): add E2E tests and polish` | tests/, README.md | bun test, lint |

---

## Success Criteria

### Verification Commands
```bash
# Core tests
bun test packages/mcp-marketplace

# UI build
bun run build --filter @openfarm/web-ui

# Integration tests
bun test packages/provider-opencode

# Linting
bun run lint
```

### Final Checklist
- [ ] Usuario puede ver listado de 6+ MCPs en UI
- [ ] Search filtra correctamente
- [ ] Install agrega MCP a DB y ejecuta npm install
- [ ] Uninstall remueve de DB
- [ ] Providers usan nuevo sistema
- [ ] MCPs instalados funcionan en workflows
- [ ] Tests: unit + integration + E2E pasan
- [ ] Linting: 0 errores
- [ ] Documentación: README básico

---

## Notas Adicionales

### Migración de Sistema Actual
Si hay MCPs instalados en el formato viejo, crear script de migración:
```typescript
// scripts/migrate-mcp.ts
// Lee tabla mcp_servers antigua
// Crea entradas en nuevo formato
// Mantiene compatibilidad durante transición
```

### Estructura de catalog.json
```json
{
  "version": "1.0.0",
  "mcps": [
    {
      "id": "github",
      "name": "GitHub",
      "description": "Manage issues, projects and code",
      "icon": "github",
      "npmPackage": "@modelcontextprotocol/server-github",
      "category": "dev-tools",
      "defaultArgs": [],
      "defaultEnv": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": ""
      },
      "configSchema": {
        "token": { "type": "string", "required": true }
      }
    }
  ]
}
```

### Próximas Versiones (fuera de scope)
- Remote catalog con actualizaciones automáticas
- Ratings/reviews de MCPs
- MCPs privados/enterprise
- Multi-version support
