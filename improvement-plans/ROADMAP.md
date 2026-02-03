# Roadmap Consolidado de Mejoras

Este roadmap consolida todos los planes de mejora identificados para el proyecto OpenFarm.

## Resumen Ejecutivo

**Estado actual**: El proyecto tiene buena base arquitectónica pero problemas graves de calidad: duplicación de código (×3), uso excesivo de `any` (162 instancias), configuración inconsistente de packages, tests ausentes en packages críticos, y documentación incompleta.

**Objetivo**: Elevar el codebase a estándares profesionales de ingeniería de software.

**Timeline total estimado**: 6-8 semanas con 1-2 engineers dedicados.

---

## Fase 0: Preparación (Semana 0)

**Duración**: 2 días

**Objetivos**:
- Establecer baseline
- Crear tracking de issues

**Tareas**:
1. Crear GitHub issues para cada ADR item (etiquetar con `improvement`, `P0`, `P1`, etc.)
2. Configurar project board (GitHub Projects) con columnas: Backlog, Todo, In Progress, Review, Done
3. Forkear branches de trabajo:
   - `fix/code-duplication`
   - `fix/types-no-any`
   - `fix/package-configs`
   - `refactor/dependency-layers`
   - `test/coverage-utils`
   - `docs/readmes`
   - `build/tsup-optimization`

---

## Fase 1: Critical Fixes (Semanas 1-2)

**Prioridad**: Máxima — Bloquea cualquier otro trabajo

### Sprint 1.1: Eliminar Duplicación (2 días)

**Issue**: ADR-001 — Código duplicado en utils/runner-utils/agent-runner

**Entregables**:
- `@openfarm/utils` contiene implementaciones completas (no stubs)
- `packages/runner-utils/src/utils/` eliminado
- `packages/agent-runner/src/utils/` eliminado
- Todos los imports actualizados a `@openfarm/utils`
- Todos los tests pasan

**Dependencies**: Ninguna

**Riesgo**: Bajo

---

### Sprint 1.2: TypeScript Estricto (3 días)

**Issue**: ADR-002 — `any` y configuración TypeScript

**Entregables**:
- `tsconfig.base.json` con `"noImplicitAny": true`
- `biome.jsonc` con `"noExplicitAny": "error"`
- Lista completa de `any` eliminada de código productivo (P0: APIs públicas)
- `bunx tsc --noEmit` compila sin errores

**Dependencies**:
- Sprint 1.1 completado (por consistencia, aunque no bloquea)

**Riesgo**: Medio — Pueden aparecer muchos errores.需要 paciencia.

**Sub-tareas**:
- Día 1: Config changes + audit completo (listar todos `any`)
- Día 2-3: Fix P0 files (providers.d.ts, base-provider, http-strategy, db, vault, github)
- Día 4-5 (opcional): Continuar con P1/P2 si hay tiempo

---

### Sprint 1.3: Package Configs (2 días)

**Issue**: ADR-003 — main/types inconsistentes, tsup noExternal

**Entregables**:
- Todos los packages (privados y públicos) usan `dist/` para `main`/`types` (excepto type-only packages)
- Tsup config creado/actualizado en cada package
- `packages/sdk/tsup.config.ts` sin `noExternal` (solo external para npm externals)
- Build local exitoso para todos los packages

**Dependencies**:
- Sprint 1.1 completado (no directamente relacionado, pero es bueno tener código consolidado)

**Riesgo**: Medio — Algunos imports entre packages pueden necesitar ajustes.

---

## Fase 2: Architecture & Quality (Semanas 3-5)

### Sprint 2.1: Dependency Layers (2 días)

**Issue**: ADR-004 — Definir y enforcear capas de dependencias

**Entregables**:
- Diagrama de capas completo en `docs/ARCHITECTURE.md`
- Tabla de packages por capa
- Script de validación de dependencias (dependency-cruiser config)
- CI job que falle en ciclos/dependencias ascendentes
- READMEs actualizados con capa de cada package

**Dependencies**:
- Sprint 1.3 (porque package configs afectan capas)

**Riesgo**: Bajo — Es documentación y análisis, no código.

---

### Sprint 2.2: Test Coverage — Paquetes Críticos (5 días)

**Issue**: ADR-005 — Tests ausentes en utils, core, workflow-engine, agent-runner

**Entregables**:
- `@openfarm/utils` con ≥80% coverage (tests de todas las utilities)
- `@openfarm/logger` con tests básicos
- `@openfarm/core` coverage ≥60% (db, events, workflow-dsl)
- `@openfarm/workflow-engine` coverage ≥60% (orchestrator, events)
- `@openfarm/agent-runner` coverage ≥50% (orchestrator, engines)
- Config vitest global con thresholds
- CI fail si coverage < thresholds
- Guía de testing en `CONTRIBUTING.md`

**Dependencies**:
- Sprint 1.1 (utils consolidado, así se testea una sola vez)
- Sprint 1.2 (tipos fuertes ayudan a escribir tests)
- Sprint 1.3 (build correcto ayuda a importar en tests)

**Riesgo**: Alto — Escribir buenos tests toma tiempo. No apresurar.

**Sub-tareas por package**:
Ver detailed checklist en `improvement-plans/03-quality/001-test-coverage.md`.

---

### Sprint 2.3: Biome Rules Enforcement (2 días)

**Issue**: ADR-006 — Activar reglas de Biome

**Entregables**:
- `biome.jsonc` actualizado con reglas estrictas pero razonables
- CI configurado para fallar en `error` level violations
- Código refactorizado para cumplir reglas:
  - No `any` (ya hecho en Sprint 1.2)
  - No `forEach` en loops async
  - `useConst` en variables no reasignadas
  - No `noNonNullAssertion` (o mínimo)
  - No `arrayIndexKey` en React lists
- `lefthook.yml` con pre-commit formatting

**Dependencies**:
- Sprint 1.2 (eliminar `any`) es prerequisito para activar `noExplicitAny: error`
- Sprint 2.2 no es dependencia, pero tests deberían pasar después de estilo changes

**Riesgo**: Bajo — Biome puede autofix muchos issues.

---

## Fase 3: Build & Release (Semana 6)

### Sprint 3.1: Tsup Optimization (2 días)

**Issue**: ADR-008 — Remover `noExternal` innecesario en SDK

**Entregables**:
- `packages/sdk/tsup.config.ts` sin `noExternal` gigante
- CLI bundle quizás mantiene `external: ["better-sqlite3"]`
- Verificado que build genera imports a `@openfarm/*` en lugar de inlining
- Documentación actualizada sobre cómo publicar packages
- CI/CD actualizado (build antes de test,顺序 correcto)

**Dependencies**:
- Sprint 1.3 (package configs estandarizados)
- Sprint 2.1 (capas claras ayudan a entender qué externalizar)

**Riesgo**: Medio — Publicación puede break si packages no están versionados correctamente.

---

## Fase 4: Documentation (Semana 7)

### Sprint 4.1: READMEs y ADRs (3 días)

**Issue**: ADR-007 — Documentación faltante

**Entregables**:
- README.md para cada package (core, utils, result, logger, types, analysis, context, execution-logger, git-diff, vault-adapter, workflow-executor, queues, azure-adapter, github-adapter, git-adapter, git-worktree, coding-engines, provider-aider, provider-claude, provider-opencode)
- ADRs en `docs/adr/` (mínimo 5):
  - ADR-001: Provider system architecture
  - ADR-002: Workflow event sourcing
  - ADR-003: Monorepo con Turborepo
  - ADR-004: TUI con Ink
  - ADR-005: SQLite para persistence
- `docs/ARCHITECTURE.md` actualizado con:
  - Diagrama de capas con todos los packages
  - Explicación de cada layer
  - Grafo de dependencias visual (puede ser texto o Mermaid)
- `CONTRIBUTING.md` expandido con:
  - Development setup completo
  - How to add new provider/adapter
  - How to run tests locally
  - Code style expectations
  - PR process
  - Issue templates

**Dependencies**:
- Sprint 2.1 (capas definidas) para documentar architecture context
- Sprint 2.2 (tests) para referenciar en READMEs

**Riesgo**: Bajo — Documentación no rompe nada.

---

### Sprint 4.2: Examples (2 días)

**Entregables**:
- `examples/custom-provider.ts`
- `examples/workflow-dsl-example.ts`
- `examples/error-handling.ts`
- `examples/tui-programmatic.ts`
- `examples/testing-mocks.ts`
- `examples/README.md` explicando cada ejemplo

**Dependencies**:
- Sprint 4.1 (README oficial examples) pero puede hacerse en paralelo

**Riesgo**: Bajo

---

## Fase 5: Polish & Release (Semana 8)

### Sprint 5.1: Final QA (2 días)

**Tareas**:
- [ ] Correr `bun run lint` en todo el codebase — sin warnings/errors
- [ ] Correr `bun run type-check` — sin errores
- [ ] Correr `bun run test` — todos pasan, coverage ≥80% global
- [ ] Correr `bun run build` — todos los packages buildean sin errores
- [ ] Verificar imports entre packages funcionan después de changes
- [ ] Local end-to-end test: crear nuevo project, instalar `@openfarm/sdk`, ejecutar example básico
- [ ] Documentar cualquier breaking change en `CHANGELOG.md` (o crear)

### Sprint 5.2: Changelog y Versioning (1 día)

**Tareas**:
- Actualizar versiones de todos los packages a `0.0.2` (o `0.1.0` si es significativo)
- Generar CHANGELOG.md automáticamente (usar `standard-version` o `changesets`)
- Commit de releases

**Dependencies**: Sprint 5.1 aprobado

---

## Visual Timeline

```
Semana 0:  █████ Preparación (issues, branches)
Semana 1:  ████████████ Fase 1 Sprint 1.1 (duplicación)
Semana 1-2: ████████████████████ Fase 1 Sprint 1.2 (any)
Semana 2:  ██████████████ Fase 1 Sprint 1.3 (configs)
Semana 3:  ████████████ Fase 2 Sprint 2.1 (layers)
Semana 3-5: ██████████████████████████████████████████ Fase 2 Sprint 2.2 (tests)
Semana 5:  ████████████ Fase 2 Sprint 2.3 (biome)
Semana 6:  ████████████ Fase 3 Sprint 3.1 (tsup)
Semana 7:  ██████████████████ Fase 4 Sprint 4.1 (docs)
Semana 7-8: ████████████ Fase 4 Sprint 4.2 (examples)
Semana 8:  █████████ Fase 5 Sprint 5.1 (QA) + 5.2 (release)
```

**Total**: 8 semanas (40 días hábiles) con 1 engineer.
Con 2 engineers en paralelo, puede reducirse a 4-5 semanas.

---

## Priorización Detallada

### P0 (IMPRESCINDIBLE) — Hacer primero

1. Duplicación de código (1.1) — rompe mantenibilidad
2. TypeScript `any` (1.2) — rompe type safety
3. Package configs (1.3) — rompe build/publicación
4. Tests de utils/core (2.2 P0 packages) — sin tests no hay calidad
5. Biome `noExplicitAny` (2.3) — enforce que no vuelva `any`

### P1 (IMPORTANTE)

6. Dependency layersanalysis (2.1) — claridad arquitectónica
7. Test coverage para resto de packages (2.2 P1)
8. Tsup optimization (3.1) — mejora performance y modularidad
9. READMEs para packages core (4.1) — documentación essential
10. ADRs (4.1) — preservar decisiones arquitectónicas

### P2 (DESEABLE)

11. Examples adicionales (4.2)
12. Contributing guide expandido (4.1)
13. Tests de packages especializados (2.2 P2)
14. Mejorar coverage a 90%+

---

## Communication Plan

- Weekly standup los lunes: reporte de progreso, blockers
- PRs revisados por al menos un maintainer
- Issues actualizados diariamente
- Slack/Discord canal `#engineering` para preguntas rápidas

---

## Metrics de Success

Al final de cada sprint, medir:

| Métrica | Baseline (hoy) | Target (final) | Cómo medir |
|---------|----------------|----------------|------------|
| Instancias de `any` en producción | 162 | 0 | `rg "as any|:\s*any\b" packages --count` |
| Packages con README | ~30% | 100% | Manual/count |
| Coverage global | ~20% (estimado) | ≥80% | `vitest --coverage` |
| Tests ausentes en utils/core | 100% | 0% | `ls packages/utils/test` |
| Packages con config tsup | 2/20 | 20/20 | `rg "tsup.config.ts" packages` |
| Violaciones de Biome | cientos | 0 | `biome check` |
| Ciclos de dependencias | ? | 0 | `depcruise` |
| Tiempo de build SDK | ? | <10s (incremental) | `time bun run build` (sdk) |
| Documentación ADRs | 0 | ≥5 | Count en `docs/adr/` |

---

## Rollback Contingency

Si un sprint no cumple objectives:
1. Revertir cambios (git branch separado por sprint)
2. Analizar blockers
3. Ajustar scope/timeline
4. No mergear hasta que tests pasen

---

## Sign-Off

**Arquitecto**: Kilo Code
**Fecha**: 2026-02-02
**Status**: Draft — awaiting review

**Approvers**:
- [ ] Tech Lead
- [ ] Product Manager
- [ ] Engineering Manager

---

**Nota**: Este roadmap es agresivo pero achievable con dedicación. La clave es no saltar pasos: calidad requiere trabajo. No hay atajos.
