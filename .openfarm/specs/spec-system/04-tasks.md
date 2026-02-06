# Tasks

## Phase 1: Estructura Base

- [ ] T1.1 Crear package `@openfarm/spec`
  - package.json, tsconfig.json, estructura de carpetas
  - dependencias: mínimas, sin parser YAML en v1

- [ ] T1.2 Implementar types.ts
  - Interfaces: Spec, SpecArtifacts, Proposal, Requirements, Design, Tasks
  - Enums: SpecStatus (`draft|ready|implementing|done|archived`)

- [ ] T1.3 Definir contrato `_meta.json`
  - Schema runtime (zod o validador equivalente)
  - Helpers de lectura/escritura con defaults seguros
  - Validación de transiciones de estado

- [ ] T1.4 Implementar core/spec-manager.ts
  - init(): crear directorios
  - create(): nuevo spec con proposal
  - load(): leer spec por slug
  - list(): listar todos los specs
  - updateStatus(): cambiar estado
  - archive(): mover a archive/
  - loadArtifacts(): leer todos los md

- [ ] T1.5 Implementar formatters y parsers
  - formatProposal / parseProposal
  - formatRequirements / parseRequirements
  - formatDesign / parseDesign
  - formatTasks / parseTasks

## Phase 2: Prompts y AI

- [ ] T2.1 Implementar prompts/context.ts
  - detectProjectContext(): leer package.json, tsconfig, file tree
  - formatContextForPrompt(): string para AI

- [ ] T2.2 Implementar prompts/plan.ts
  - buildPlanPrompt(name, description, context): string
  - Prompt optimizado para generar proposal + requirements + design
  - Incluir ejemplos en el prompt (few-shot)

- [ ] T2.3 Implementar prompts/refine.ts
  - buildRefinePrompt(spec, artifact, feedback): string
  - Incluir artifact completo + feedback + instrucciones de modificación

- [ ] T2.4 Implementar prompts/tasks.ts
  - buildTasksPrompt(design, requirements): string
  - Generar fases y tasks específicos

- [ ] T2.5 Implementar core/prompt-engine.ts
  - Interfaz con AI providers (reusar sistema existente de OpenFarm)
  - Manejo de errores y fallbacks

## Phase 3: Comandos CLI

- [ ] T3.1 Implementar commands/plan.ts
  - Handler para `openfarm spec plan <name> [description]`
  - Flujo completo: context → AI → write files → AI tasks → write tasks

- [ ] T3.2 Implementar commands/refine.ts
  - Handler para `openfarm spec refine <slug> <feedback>`
  - Detectar artifact a refinar (auto o --focus flag)
  - Update archivo

- [ ] T3.3 Implementar commands/implement.ts
  - Handler para `openfarm spec implement <slug>`
  - Integración con @openfarm/workflow-engine
  - Ejecutar tasks secuencialmente
  - Update estado de tasks

- [ ] T3.4 Implementar commands/archive.ts
  - Handler para `openfarm spec archive <slug>`
  - Mover carpeta, update metadata

- [ ] T3.5 Implementar commands/list.ts
  - Handler para `openfarm spec list`
  - Tabla bonita con chalk (o sin dependencias)
  - Flags: --all, --status

- [ ] T3.6 Implementar cli.ts
  - Entry point con args parsing (sin libs pesadas)
  - Routing a comandos
  - Help text
  - Superficie oficial: `openfarm spec ...`

## Phase 4: Integración

- [ ] T4.1 Integrar al SDK
  - Agregar @openfarm/spec como dependencia de workspace
  - Exponer comandos como subcomandos de `openfarm spec`
  - Sin binario separado en v1

- [ ] T4.2 Agregar a tui-cli.ts
  - Nuevo subcomando "spec" en el router
  - Pasar args al spec CLI

- [ ] T4.3 Testing básico
  - Test unitario: slugify
  - Test unitario: format/parse roundtrip
  - Test unitario: validación `_meta.json` + transiciones de estado
  - Test integración: create → refine → implement(simulado) → archive
  - Test integración: list/show/status

## Phase 5: Polish

- [ ] T5.1 Documentación
  - README.md en packages/spec/
  - Ejemplos de uso
  - Tips para buenos specs

- [ ] T5.2 Review y cleanup
  - Verificar linting pasa
  - Verificar builds
  - Code review

---

## Dependencies

- @openfarm/workflow-engine (para implement)
- @openfarm/core (para AI providers)

## Estimación

- Phase 1: 2-3 horas
- Phase 2: 3-4 horas
- Phase 3: 4-5 horas
- Phase 4: 1-2 horas
- Phase 5: 1 hora

**Total: ~12-15 horas de trabajo concentrado**
