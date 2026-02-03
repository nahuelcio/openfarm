# ADR-005: Asegurar Cobertura de Tests Mínima del 80%

## Estado

**MEDIA-ALTA** — Packages críticos sin tests suficientes

## Problema

 Varios packages clave tienen tests ausentes o mínimos:

| Package | Tests? | Coverage (estimado) | Notas |
|---------|--------|--------------------|-------|
| `@openfarm/sdk` | Sí (provider-system) | ~70% | Bien, pero puede faltar coverage en TUI, parsers |
| `@openfarm/agent-runner` | No encontrados | ~0% | Posiblemente tiene tests en otra ruta |
| `@openfarm/workflow-engine` | No encontrados | ~0% | Workflow logic crítico sin tests |
| `@openfarm/core` | Algunos en `test/` | ~30%? | db, schema, events — necesita más |
| `@openfarm/utils` | **NINGUNO** | 0% | Utilities críticas sin tests! |
| `@openfarm/result` | Tiene `test/result.test.ts` | ~90%? | ✓ Bien |
| `@openfarm/logger` | `--passWithNoTests` | ~0% | Probablemente sin tests |
| `@openfarm/types` | `test/types.test.ts` | ~50%? | Revisar |
| `@openfarm/git-worktree` | No visto | ? | Necesita tests |
| `@openfarm/git-adapter` | Tiene `test/` | ~60% | Bien |
| `@openfarm/github-adapter` | `test/adapter.test.ts` | ~40% | Mejorable |
| Varios adapters | Mixed | Variable | |

### Hallazgos

1. `packages/utils` NO tiene directorio `test/` ni `__tests__/`. Sus utilities (circuit-breaker, retry, validation, etc.) **no están testeadas**.
2. `packages/agent-runner` tiene `src/utils/` duplicados pero no vi tests para ellos.
3. `packages/workflow-engine` es el corazón de la orquestación y probablemente tiene coverage baja.
4. `packages/core` tiene algunos tests (`test/schema.test.ts`, `test/add-column-safely.test.ts`, `test/index.test.ts`) pero no enough para db, events, workflow-dsl.
5. Tests existen en paquetes públicos (sdk, git-adapter) pero no en internos.

## Causa Raíz

1. **Falta de política de testing**: No hay requisito de ≥80% coverage para PRs.
2. **Tests en location incorrecta**:
   - Algunos usan `__tests__/` junto al código
   - Otros usan `test/` en raíz del package
   - Inconsistente.
3. **Configuración de Vitest** no está Centralizada: Cada package tiene su propio `vitest.config.ts`? No vi configs, asumo defaults.
4. **Times pressure**: Priorizaron features sobre tests.

## Impacto

1. **Regresiones**: Cambios en utils, core, workflow-engine pueden romper cosas sin detección.
2. **Refactor miedo**: Nadie quiere tocar código sin tests.
3. **Baja calidad**: Bugs en producción.
4. **Credibilidad**: SDK "profesional" pero coverage 0% en packages críticos.

## Solución

### 1. Configuración Standard de Vitest

Crear `vitest.config.ts` en raíz o por package. Ya usan `vitest` en devDependencies.

Recomendado: Config global en `tsconfig.json` usando `references`? No, mejor config por package simple.

Ejemplo `vitest.config.ts` para cada package:
```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      reporter: ['text', 'json', 'html'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
});
```

O shared config en `packages/utils/vitest.config.ts` y que otros lo extiendan.

### 2. Add Tests to Missing Packages

Priorización:

#### P0: Packages sin tests (0% coverage)

**`@openfarm/utils`** (2 días):
- Test `chunk()`
- Test `matchesPattern()` (múltiples patrones)
- Test `retry()` (success, failure, backoff, maxAttempts)
- Test `withTimeout()` (success, timeout, cleanup)
- Test `sequence()` (all ok, one fail)
- Test `parallel()` (all ok, one fail)
- Test `mapAsync()`
- Test `filterAsync()`
- Test `CircuitBreaker` (una vez migrado a versión completa)
- Test `validateInstruction` (dangerous patterns, safe patterns)
- Test `metrics` (increment, histogram, getMetrics, clear)

**`@openfarm/logger`** (1 día):
- Test log levels (info, warn, error)
- Test formatting (JSON vs pretty)
- Test transports (pino, pino-pretty)

**`@openfarm/result`** (ya tiene, verificar coverage) (0.5 día)

**`@openfarm/core`** (3 días):
- DB connection tests (mocks)
- Schema migrations tests
- Events: create, store, retrieve
- Workflow-DSL: parser, converter
- AgentConfigService CRUD
- EnabledModels queries

**`@openfarm/workflow-engine`** (3 días):
- WorkflowOrchestrator: setup, execute, finish, cancel
- EventBus: in-memory and database
- Error handling: retryable, serialization
- Lifecycle handlers: beforeStep, afterStep

**`@openfarm/agent-runner`** (2 días):
- Orchestrator integration
- Engine factory (crea los engines correctos)
- askUser interaction (mock stdin)
- LLM service (mocks de AI SDK)
- Git operations (worktree create/remove)
- Auth services (mock servers)

#### P1: Packages con tests insuficientes

**`@openfarm/github-adapter`** (1 día): coverage actual ~40%
- Tests para PR creation, listing, diffs
- Mock responses de GitHub API

**`@openfarm/queues`** (1 día):
- Tests de SQLite queue
- Tests de Inngest client

**`@openfarm/context`** (1 día):
- Tests de ContextEngine
- Extractors, formatters, synthesizers

#### P2: Mejorar coverage existente

**`@openfarm/sdk`** (2 días):
- TUI components (usar @testing-library/react)
- Parser tests (json, stream)
- Strategy tests (HTTP, CLI)
- Provider system integration tests

### 3. Enforce Coverage en CI

Crear GitHub Actions workflow `coverage.yml`:

```yaml
name: Coverage

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun run build
      - run: bunx vitest run --coverage
      - uses: codecov/codecov-action@v3
        with:
          token: ${{ secrets.CODECOV_TOKEN }}
          fail_ci_if_error: true
```

O threshold local:
```bash
bunx vitest run --coverage --coverage.threshold=0.8
```

Agregar a `lefthook.yml` (pre-push) para fallar local si coverage baja.

### 4. TDD Mandatory

Adoptar Test-Driven Development para nuevo código:
1. Escribir test que falle
2. Implementar mínimo código para pasar
3. Refactor

NO PR sin test para nueva funcionalidad.

### 5. Testing Utilities

Crear shared test helpers en `@openfarm/utils/test` o `packages/test-utils`:

```ts
// test-utils/mock-db.ts
export function createMockDb(): MockDatabase { ... }

// test-utils/mock-clock.ts
export function advanceTime(ms: number) { ... }
```

### 6. Integration Tests

Además de unit tests, agregar integration tests que cubran flujos completos:

- `sdk` → execute并通过 TUI
- `workflow-engine` ejecutando un workflow completo
- `git-worktree` con repo real (tmp dir)
- `agent-runner` end-to-end con mock provider

### 7. E2E Tests (opcional, más adelante)

Usar `@playwright/test` (ya en devDependencies) para tests E2E del TUI en terminal.

## Timeline

| Semana | Objetivo |
|--------|----------|
| 1 | Config vitest global, coverage thresholds; tests para @openfarm/utils |
| 2 | Tests para @openfarm/logger, @openfarm/result (verify), @openfarm/core |
| 3 | Tests para @openfarm/workflow-engine |
| 4 | Tests para @openfarm/agent-runner |
| 5 | Mejorar coverage de @openfarm/sdk, github-adapter, queues |
| 6 | Integration tests y CI enforcement |

## Checklist por Package

### @openfarm/utils

- [ ] Test `chunk()` edge cases: empty array, size > length, size = 1
- [ ] Test `matchesPattern()`: `*.ts`, `**/*.js`, `src/**/test/*.ts`
- [ ] Test `retry()`: success on first try, success after failure, maxAttempts exceeded, exponential backoff timing
- [ ] Test `withTimeout()`: resolves before timeout, rejects on timeout, clears timer
- [ ] Test `sequence()`: all Ok, first Fail
- [ ] Test `parallel()`: all Ok, one Fail
- [ ] Test `mapAsync()`: maps correctly, short-circuits on error
- [ ] Test `filterAsync()`: filter true/false
- [ ] Test `CircuitBreaker`: closed→open→half-open transitions, failures counting, success recovery
- [ ] Test `validateInstruction`: dangerous patterns detectadas, safe patterns pasan
- [ ] Test `MetricsCollector`: increment, histogram, getMetrics, clear, maxEvents eviction

### @openfarm/core

- [ ] DB connection: open, close, errors
- [ ] Schema: migrations, create tables
- [ ] Events: DatabaseEventBus store/retrieve, Event types
- [ ] Workflow-DSL: parser de YAML, converter a Step objects
- [ ] AgentConfigService: insert, get, update, delete
- [ ] EnabledModels: insertEnabled, getEnabled, getByProvider

### @openfarm/workflow-engine

- [ ] executeWorkflow: simple workflow single step
- [ ] executeWorkflow: multiple steps sequential
- [ ] executeWorkflow: parallel steps
- [ ] Lifecycle: beforeStep, afterStep hooks
- [ ] Error handling: step failure, retry logic, cancel
- [ ] Event emission: workflow.started, step.executed, workflow.completed/failed
- [ ] State persistence: resume from database

### @openfarm/agent-runner

- [ ] createCodingEngine: returns correct engine for provider
- [ ] Orchestrator.execute: end-to-end mock
- [ ] askUser: input from stdin (mock)
- [ ] LlmService: call, error handling, retry
- [ ] OpenCodeAuth: device code flow (mock fetch)
- [ ] openCodeServer: start/stop/status
- [ ] Git worktree operations: create, remove (mock fs.exec)

## Success Criteria

- [ ] **All packages** tienen test suite corriendo localmente
- [ ] **Coverage global** ≥ 80% (lines, functions, branches)
- [ ] CI falla si coverage < 80%
- [ ] Nuevo código sin test no se mergea (code review policy)
- [ ] Documentación: cada package tiene "Testing" section en README

## Dependencies

- Depende de que `vitest` esté configurado correctamente (ya está en devDeps)
- Depende de `bun run test` funcionando (ya existe script)
- Requiere que packages tengan `build` si exportan dist (pero tests pueden apuntar a src)

## Costo Estimado

- 2-3 semanas de desarrollo full-time (1 engineer)
- Si hay多个 engineers,可以 paralelizar por packages.

---

**Nota**: Testing no es optional. Es parte del Definition of Done. Sin tests, no hay calidad. Punto.
