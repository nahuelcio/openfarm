# ADR-007: Completar Documentación de Packages

## Estado

**BAJA-MEDIA** — Falta documentación consistente en múltiples packages

## Problema

### Packages sin README.md

```
packages/analysis/README.md          NO EXISTE
packages/core/README.md              NO EXISTE
packages/execution-logger/README.md  NO EXISTE
packages/logger/README.md            NO EXISTE
packages/result/README.md            NO EXISTE
packages/types/README.md             NO EXISTE
packages/utils/README.md             NO EXISTE
packages/vault-adapter/README.md     NO EXISTE
packages/workflow-executor/README.md NO EXISTE
# ... y probablemente más
```

### Packages con README pero incompletos

- `packages/sdk/README.md` — Excelente ejemplo a seguir (completo, con ejemplos, instalación, uso, troubleshooting)
- `packages/git-worktree/README.md` — Existe? No verificado

### Problemas en README existentes

- `README.md` raíz: falta link a packages individuales
- `docs/ARCHITECTURE.md`: diagrama simplificado, no muestra dependencias reales
- No hay ADRs (Architecture Decision Records) documentados
- No hay guía de contributor (`CONTRIBUTING.md` existe pero puede necesitar expansión)

## Impacto

1. **Onboarding difícil**: Nuevos developers no saben qué hace cada package.
2. **Uso incorrecto**: Sin ejemplos, developers adivinan la API.
3. **Mantenimiento**: Sin documentación de diseño decisions, se pierde el razón detrás de arquitectura.
4. **Consistencia**: Cada package documenta (o no) a su manera.

## Solución

### 1. Template de README para Packages

Crear template estándar:

```markdown
# @openfarm/package-name

**Descripción de una línea** — qué problema resuelve.

## Installation

```bash
bun add @openfarm/package-name
# o
npm install @openfarm/package-name
```

## Quick Start

```typescript
import { Something } from '@openfarm/package-name';

const instance = new Something({ ... });
const result = await instance.doThing();
console.log(result);
```

## API Reference

### Class: Something

#### Constructor

```typescript
new Something(options: SomethingOptions)
```

#### Methods

- `doThing(): Promise<Result>` — descripción

### Interfaces

```typescript
interface SomethingOptions {
  // ...
}
```

## Architecture Context

Este package belongs to la **Capa X** ([ver ARCHITECTURE](../ARCHITECTURE.md#capas)).

Depende de:
- `@openfarm/types`
- `@openfarm/utils`

Es usado por:
- `@openfarm/sdk`
- `@openfarm/agent-runner`

## Testing

```bash
cd packages/package-name
bun run test
```

## Error Handling

Lista de errores comunes y soluciones.

## See Also

- `@openfarm/sdk` — el SDK principal que usa este package
- [ARCHITECTURE.md](../ARCHITECTURE.md) — visión general de arquitectura

## License

MIT (heredado del repo)
```

### 2. Lista de Packages Requiriendo README

**Priority Alta** (core utilities):
- `@openfarm/core` — database, workflow-dsl, config
- `@openfarm/utils` — chunk, retry, withTimeout, circuit-breaker
- `@openfarm/result` — Result type (simple pero útil documentar)
- `@openfarm/types` —所有的 tipo definitions

**Priority Media** (infrastructure):
- `@openfarm/logger` — logging utilities
- `@openfarm/git-adapter` — git commands
- `@openfarm/git-worktree` — git worktree management
- `@openfarm/github-adapter` — GitHub API client
- `@openfarm/queues` — job queues
- `@openfarm/vault-adapter` — HashiCorp Vault client

**Priority Baja** (specialized):
- `@openfarm/analysis` — code analysis engines
- `@openfarm/context` — context generation
- `@openfarm/execution-logger` — logging during execution
- `@openfarm/git-diff` — diff parsing
- `@openfarm/workflow-executor` — step executors

### 3. ADRs (Architecture Decision Records)

Crear directorio `docs/adr/` con ADRs para decisiones importantes:

```
docs/adr/
├── 001-provider-system-architecture.md
├── 002-monorepo-structure.md
├── 003-workflow-event-sourcing.md
├── 004-tui-ink-architecture.md
└── index.md
```

Template de ADR:

```markdown
# ADR-XXX: Título de la Decisión

## Status

[Proposed | Accepted | Deprecated | Superseded]

## Context

Qué problema estamos enfrentando? Qué fuerzas hay?

## Decision

Qué hemos decidido? En 1-2 párrafos.

## Consequences

- Positivos: qué gana_?
- Negativos: qué costos/tradeoffs?
- Riesgos: qué podría salir mal?
```

Decisiones a documentar:
- Por qué monorepo con Turborepo?
- Por qué provider system con factory pattern?
- Por qué workflow-engine usa event sourcing?
- Por qué SQLite para ejecuciones?
- Por qué Bun?

### 4. Guía de Contributor

Expandir `CONTRIBUTING.md` con:

- Development setup paso a paso
- How to add a new provider
- How to add a new adapter
- How to run tests
- Code style (link a biome.jsonc)
- Commit message format (conventional commits)
- PR template
- Issue template

Crear `.github/ISSUE_TEMPLATE/` y `.github/PULL_REQUEST_TEMPLATE.md`.

### 5. Ejemplos Adicionales

`examples/` directorio solo tiene `basic-usage.ts`. Agregar:

- `custom-provider.ts` — cómo crear provider custom
- `workflow-dsl-example.ts` — definir workflow en YAML/TS
- `error-handling.ts` — manejo de errores robusto
- `tui-usage.ts` — usar TUI programmatically
- `testing-provider.ts` — mock provider para tests

## Timeline

| Día | Tarea |
|-----|-------|
| 1 | Crear template README.md (estándar) |
| 2-3 | Escribir READMEs para packages core (types, result, utils, core, logger) |
| 4-5 | Escribir READMEs para adapters (git, github, queues, etc.) |
| 6 | Actualizar `docs/ARCHITECTURE.md` con diagrama de capas completo |
| 2-3 | Escribir ADRs principales (3-5 ADRs) |
| 1 | Expandir `CONTRIBUTING.md` |
| 1 | Crear ejemplos adicionales (3-5 archivos) |

**Total**: ~10 días hábiles

## Checklist por Package

Para cada package, crear README.md con:

- [ ] Nombre y descripción clara
- [ ] Instrucciones de install (bun/npm)
- [ ] Ejemplo de uso mínimo (5-10 líneas)
- [ ] API Reference (clases, funciones, interfaces principales)
- [ ] Architecture Context (qué capa, dependencias, usado por)
- [ ] Sección de testing (cómo correr tests del package)
- [ ] Error handling (errores comunes)
- [ ] See Also (links a paquetes relacionados)
- [ ] Badge de version (si se publica)

### Ejemplo: @openfarm/utils

```markdown
# @openfarm/utils

Utility functions for OpenFarm packages: retry, timeout, circuit breaker, validation.

## Installation

```bash
bun add @openfarm/utils
```

## Quick Start

```typescript
import { retry, withTimeout, CircuitBreaker } from '@openfarm/utils';

const result = await retry(async () => {
  return fetchData();
}, { maxAttempts: 3 });

const data = await withTimeout(result, 5000, 'Request timeout');
```

## API

### `retry<T>(fn: () => Promise<T>, config?: RetryConfig): Promise<T>`

Retry async function with exponential backoff.

### `withTimeout<T>(promise: Promise<T>, timeoutMs: number, message?: string): Promise<T>`

Wrap promise with timeout.

## Architecture Context

This package is **Capa 2: Utilities** in the OpenFarm architecture.

It has **no dependencies** on other OpenFarm packages except `@openfarm/result` (for `Result` type).

Used by:
- `@openfarm/core`
- `@openfarm/agent-runner`
- `@openfarm/workflow-engine`

## Testing

```bash
cd packages/utils
bun run test
```

## See Also

- `@openfarm/result` — Result type used in utilities
- `@openfarm/core` — Domain types and database
```

## Success Criteria

- [ ] Todos los packages públicos tienen README.md
- [ ] Packages core (utils, core, result, types, logger) tienen README
- [ ] `docs/ARCHITECTURE.md` actualizado con diagrama de capas y explicación
- [ ] 5+ ADRs documentados en `docs/adr/`
- [ ] `CONTRIBUTING.md` expandido con development guide
- [ ] Directorio `examples/` tiene 5 ejemplos variados
- [ ] Cada README tiene link a `ARCHITECTURE.md` y a packages relacionados

## Dependencies

- Depende de que la arquitectura esté clara (ADR-004)
- Depende de que packages tengan API estable (por eso va después de quality fixes)

## Costo

- ~2 semanas (puede hacerse en paralelo con otros trabajos)

---

**Nota**: Documentación es parte del producto. El código sin docs es código no usable.
