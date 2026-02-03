# ADR-004: Definir Capas de Dependencias y Eliminar Ciclos

## Estado

**ALTA** — Grafo de dependencias confuso, posibles ciclos

## Problema

El diagrama en `docs/ARCHITECTURE.md` dice:

```
sdk → agent-runner → core, engines, adapters
      ↓ (no reverse deps)
```

Pero la realidad es más compleja. Veamos las dependencias actuales:

### Dependencias declaradas (package.json)

```
@openfarm/core:
  - @openfarm/result
  - @openfarm/logger
  - @openfarm/utils
  - @openfarm/types

@openfarm/agent-runner:
  - @openfarm/core
  - @openfarm/config
  - @openfarm/result
  - @openfarm/logger
  - @openfarm/types
  - @openfarm/utils
  - @openfarm/git-worktree
  - @openfarm/git-adapter

@openfarm/sdk:
  - @openfarm/agent-runner
  - @openfarm/context
  - @openfarm/core
  - @openfarm/git-worktree
  - @openfarm/workflow-engine
  + ai, better-sqlite3, chalk, ink, js-yaml, pino, uuid, zod, zustand

@openfarm/workflow-engine:
  - @openfarm/core
  - @openfarm/agent-runner
  - @openfarm/result
  - @openfarm/logger
  - @openfarm/types
  - @openfarm/utils

@openfarm/utils:
  - @openfarm/result
```

### Análisis de Ciclos Potenciales

1. **Posible ciclo A → B → A**:
   - `core` → `utils` → `result` → ¿`core`?
   - Verificar si `result` depende de `core`. package.json de result NO tiene dependencias (solo dev). ✓ OK.
   - `utils` solo depende de `result`. ✓ OK.
   - `core` depende de `utils`, `result`, `logger`, `types`. ✓ OK (no hay ciclo).

2. **workflow-engine → agent-runner → core**:
   - `workflow-engine` depende de `agent-runner`
   - `agent-runner` depende de `core`
   - `core` NO depende de `workflow-engine` ✓ OK.

3. **sdk → agent-runner → core → utils → result**:
   - Cadena unidireccional. ✓ OK.

**Conclusión preliminar**: No hay ciclos DIRECTOS en package.json. Pero hay **acoplamiento fuerte** y dependencias cruzadas que podrían derivar en ciclos si alguien añade un _ en el futuro.

### Problemas Identificados

1. **Dependencias en dirección incorrecta**:

   Según el diagrama, `sdk` es la capa más alta (API pública). Nada debería depender de `sdk`. Sin embargo, `sdk` importa de `agent-runner`, `core`, etc. Eso está bien (sdk → abajo).

   Pero `agent-runner` importa `@openfarm/git-worktree` y `@openfarm/git-adapter`. ¿Es correcto? `git-worktree` y `git-adapter` son adapters de infraestructura. Según el principio de dependencias limpias, la capa de orquestación (agent-runner) puede depender de adapters. ✓ Parece OK.

2. **Falta de capa clara de "types"**:

   `@openfarm/types` exporta tipos de dominio. Debería ser el package más bajo (sin dependencias). Revisar su package.json: **NO tiene dependencias**. ✓ Perfecto.

3. **`core` mezcla responsabilidades**:

   `core` exporta cosas de:
   - db (conexión, queries)
   - workflow-dsl
   - config
   - constants
   
   Esto viola Single Responsibility. `core` se ha convertido en un "god package".

4. **`utils` es agnóstico pero contiene stubs**:

   `utils` tiene circuit-breaker stub, metrics stub. Ya lo vamos a consolidar (ver ADR-001). Después de consolidar, `utils` será un package útil.

5. **`sdk` tiene dependencias de alto nivel** (`@openfarm/context`, `@openfarm/analysis`) que podrían ser pesadas para un SDK ligero.

   Revisar: `sdk/package.json`:
   ```json
   "@openfarm/context": "workspace:*"
   ```
   ¿Necesita SDK `context` o es solo para TUI? El TUI está en `sdk/src/tui/`, así que probablemente sí necesita `context`. OK.

### Propuesta: Modelo de Capas Formal

```
┌─────────────────────────────────────────────────────────┐
│                    Capa 6: SDK (Público)               │
│   @openfarm/sdk                                          │
│   Exports: OpenFarm class, tipos públicos, CLI, TUI    │
│   Depende de: todos los paquetes internos               │
└─────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────┐
│                Capa 5: Orquestación                     │
│   @openfarm/agent-runner                                 │
│   @openfarm/workflow-engine                              │
│   Responsabilidades: ejecución, workflow, life-cycle    │
│   Depende de: core, adapters, utils, types, logger      │
└─────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────┐
│                 Capa 4: Infraestructura                 │
│   @openfarm/git-worktree                                 │
│   @openfarm/git-adapter                                  │
│   @openfarm/github-adapter                               │
│   @openfarm/azure-adapter                                │
│   @openfarm/queues                                       │
│   @openfarm/vault-adapter                                │
│   Responsabilidades: I/O, networking, external APIs    │
│   Depende de: utils, types, logger, result              │
└─────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────┐
│                    Capa 3: Core                         │
│   @openfarm/core                                         │
│   Responsabilidades: tipos de dominio, db, workflow-dsl │
│   Depende de: utils, types, logger, result              │
└─────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────┐
│                 Capa 2: Utilities                       │
│   @openfarm/utils                                        │
│   @openfarm/result                                       │
│   @openfarm/logger                                       │
│   Responsabilidades: helpers, error types, logging     │
│   Depende de: types                                      │
└─────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────┐
│                  Capa 1: Types (Base)                   │
│   @openfarm/types                                        │
│   Responsabilidades: interfaces, tipos puros            │
│   Depende de: NADA                                       │
└─────────────────────────────────────────────────────────┘
```

### Reglas

1. **Capa N solo puede depender de capas ≤ N** (no dependencias ascendentes).
2. **No circular dependencies**: A → B → A forbidden.
3. **Capa 1 (Types)**: Sin dependencias. Solo type definitions e interfaces.
4. **Capa 2 (Utilities)**: Solo depende de Types. Código reusable puro.
5. **Capa 3 (Core)**: Depende de 1 y 2. Business logic, DB, DSL.
6. **Capa 4 (Adapters)**: Depende de 1, 2, 3 si es necesario (core db types). I/O operations.
7. **Capa 5 (Orchestration)**: Depende de todas las inferiores. No debe ser dependido por nadie excepto SDK.
8. **Capa 6 (SDK)**: Depende de todas. Exporta API pública.

### Packages Actuales vs Capas Propuestas

| Package | Capa Actual | Capa Propuesta | Dependencias Actuales | Dependencias Deberían |
|---------|-------------|----------------|------------------------|-----------------------|
| types | 1 | 1 | (ninguna) | ✓ OK |
| result | 2 | 2 | (ninguna) | ✓ OK |
| utils | 2 | 2 | result | ✓ OK |
| logger | 2 | 2 | (ninguna) | ✓ OK |
| core | 3 | 3 | result, logger, utils, types | ✓ OK |
| git-adapter | 4 | 4 | result, logger | ✓ OK |
| github-adapter | 4 | 4 | result?, types? | Verificar |
| git-worktree | 4 | 4 | result, logger | ✓ OK |
| azure-adapter | 4 | 4 | ? | Verificar |
| vault-adapter | 4 | 4 | ? | Verificar |
| queues | 4 | 4 | ? | Verificar |
| agent-runner | 5 | 5 | core, config, result, logger, types, utils, git-worktree, git-adapter | ✓ OK |
| workflow-engine | 5 | 5 | core, agent-runner, result, logger, types, utils | ✓ OK |
| sdk | 6 | 6 | agent-runner, context, core, git-worktree, workflow-engine, analysis, coding-engines, provider-* | ✓ OK |
| context | ? | 4 | analysis | Debería ser capa 4 (infra) |
| analysis | ? | 4 | ? | Capa 4 |
| coding-engines | ? | 4 | ? | Capa 4 |
| provider-* | ? | 4 | ? | Capa 4 |

### Action Items

1. **Verificar dependencias de packages no analizados**:
   - `github-adapter/package.json`
   - `azure-adapter/package.json`
   - `vault-adapter/package.json`
   - `queues/package.json`
   - `analysis/package.json`
   - `coding-engines/package.json`
   - `execution-logger/package.json`
   - `git-diff/package.json`

2. **Asignar cada package a una capa** y documentar en su README.

3. **Eliminar dependencias cruzadas** si existen:
   - Ejemplo: si `core` depende de `git-adapter` (no debería), mover esa funcionalidad a `utils` o crear un nuevo package.
   - Si `git-adapter` depende de `core`, eso está bien (capa 4 puede depender de capa 3). Pero revisar: `git-adapter` debería ser bajo nivel, no debería necesitar `core`. Probablemente solo necesita `types` y `result`.

4. **Enforce capas via tooling** (opcional pero recomendado):
   - Usar `dependency-cruiser` o `madge` para visualizar grafo
   - Configurar CI para fallar si hay dependencias ascendentes
   - Ejemplo con dependency-cruiser:
     ```json
     {
       "forbidden": [
         {
           "name": "no-upward-deps",
           "from": { "path": "packages/agent-runner" },
           "to": { "path": "packages/sdk" }
         }
       ]
     }
     ```

5. **Documentar grafo oficial** en `docs/ARCHITECTURE.md` actualizado con diagrama de capas y listado exacto de packages por capa.

6. **Publicar aclaración**: en cada package `README.md`, indicar en qué capa reside y su propósito.

## Implementation

### Paso 1: Mapeo Completo (2 horas)

Crear tabla de todos los packages con:
- Nombre
- Capa propuesta
- Dependencias declaradas
- Dependencias de desarrollo
- Tipos de exports
- Público/privado

Documentar en `improvement-plans/02-architecture/dependency-graph.md`.

### Paso 2: Identificar Violaciones (1 hora)

Para cada package, verificar que sus dependencias sean solo de capas inferiores.

Usar script:
```bash
#!/usr/bin/env bash
# list-deps.sh
for pkg in packages/*; do
  name=$(basename $pkg)
  deps=$(jq -r '.dependencies // {} | keys[]' $pkg/package.json 2>/dev/null)
  echo "$name:"
  for dep in $deps; do
    echo "  - $dep"
  done
done
```

### Paso 3: Refactorizar Violaciones (variable)

Si se encuentran dependencias ascendentes:
- Mover código a package correcto
- O extraer interfaz común a capa inferior
- O revertir dependencia (usar inversión de dependencias con interfaces)

Ejemplo: Si `git-adapter` depende de `core` (capa 3), pero `git-adapter` es capa 4 → MAL.
Solución: Mover lo que `git-adapter` necesita de `core` a `utils` o `types`.

### Paso 4: Testing y Validación (1 hora)

Asegurar que todos los tests pasan después de cambios.

### Paso 5: CI Enforcement (1 hora)

Agreggar job en GitHub Actions que corre `dependency-cruiser` y falle en violaciones.

## Adoption

Todos los contributors deben:
1. Consultar el diagrama de capas antes de agregar una dependencia
2. No agregar dependencias ascendentes
3. Si necesitan funcionalidad de capa superior, invertir dependencia (crear interfaz en capa baja e implementar en alta)

## References

- [Dependency-Cruiser](https://github.com/sverweij/dependency-cruiser)
- [Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Onion Architecture](https://jeffreypalermo.com/2008/07/the-onion-architecture-part-1/)

---

**Nota**: Este ADR asume que las dependencias actuales son mayoritariamente correctas. El objetivo es formalizar y documentar, no hacer cambios masivos a menos que se identifiquen violaciones claras.
