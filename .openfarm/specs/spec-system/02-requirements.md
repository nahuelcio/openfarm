# Requirements

## Functional

- [F1] **MUST**: Crear spec con `openfarm spec plan <name> <description>`
  - Comando oficial: `openfarm spec plan <name> <description>`
  - Genera slug automático (kebab-case)
  - Crea carpeta en `.openfarm/specs/<slug>/`
  - AI genera: proposal, requirements, design, tasks
  - Guarda todo en markdown estructurado

- [F2] **MUST**: Refinar spec con `openfarm spec refine <slug> <feedback>`
  - Comando oficial: `openfarm spec refine <slug> <feedback>`
  - Lee spec existente
  - Aplica feedback al artifact indicado (o todos)
  - Actualiza `updatedAt` en metadata
  - Mantiene historia de cambios (sobreescribe archivos, git hace el resto)

- [F3] **MUST**: Implementar spec con `openfarm spec implement <slug>`
  - Comando oficial: `openfarm spec implement <slug>`
  - Lee tasks del spec
  - Convierte cada task en workflow/task-loop
  - Ejecuta secuencialmente (respetando dependencies)
  - Marca tasks como done/completed
  - Actualiza status a "implementing" → "done"

- [F4] **MUST**: Archivar spec con `openfarm spec archive <slug>`
  - Comando oficial: `openfarm spec archive <slug>`
  - Mueve carpeta a `.openfarm/specs/archive/<YYYY-MM-DD-slug>/`
  - Actualiza status a "archived"

- [F5] **MUST**: Listar specs
  - `openfarm spec list` muestra tabla: slug, nombre, status, updatedAt
  - Filtros: `--status`, `--all` (incluye archivados)

- [F6] **SHOULD**: Ver spec
  - `openfarm spec show <slug>` muestra resumen bonito en terminal
  - `--raw` muestra contenido de un archivo específico

- [F7] **COULD**: Status manual
  - `openfarm spec status <slug> <new-status>` para cambio manual

- [F8] **MUST**: Metadata estructurada por spec en `_meta.json`
  - Campos mínimos: `slug`, `name`, `status`, `createdAt`, `updatedAt`, `archivedAt?`, `artifacts`
  - `artifacts` referencia paths de `01..04`
  - Status válidos v1: `draft`, `ready`, `implementing`, `done`, `archived`
  - Validar transiciones:
    - `draft -> ready`
    - `ready -> implementing`
    - `implementing -> done`
    - Cualquier estado -> `archived` (vía archive)
    - `spec status` permite override manual explícito

## Non-Functional

- [NF1] **MUST**: Package separado `@openfarm/spec`
  - No bloatear el SDK core
  - Exportar API programática y CLI
  - Seguir mismas convenciones que otros packages

- [NF2] **MUST**: Prompts optimizados para nuestros providers
  - Prompts específicos para Claude, GPT, Aider, etc.
  - Inyectar contexto del proyecto (file tree, tech stack)

- [NF3] **MUST**: Integración con workflow-engine existente
  - Reusar sistema de tasks/execution
  - No reinventar runner

- [NF4] **SHOULD**: Work offline (con cache de prompts)
  - Si no hay AI disponible, crear templates vacíos

- [NF5] **SHOULD**: < 100ms para operaciones de filesystem
  - Sin DB, solo archivos

- [NF6] **MUST**: Interfaz CLI única y consistente
  - V1 usa `openfarm spec ...` como superficie oficial
  - Alias slash (`/spec-*`) queda fuera de v1

## Out of Scope

- UI gráfica (TUI) - por ahora solo CLI
- Multi-user / conflict resolution
- Branching / versionado de specs (usamos git)
- Comentarios en specs (usamos refine)
- Templates custom (v1 solo template built-in)
- Sync con GitHub Issues/PRs
- Alias `/spec-*` en chat o parser de comandos
