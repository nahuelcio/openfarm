# ADR-001: Eliminar Duplicación de Utilities

## Estado

**CRÍTICO** — Impidemantenimiento coherente

## Problema

Tres implementaciones separadas de mismas utilities:

| Utility | Ubicaciones |
|---------|-------------|
| `CircuitBreaker` | `utils/src/circuit-breaker.ts` (stub), `runner-utils/src/utils/circuit-breaker.ts`, `agent-runner/src/utils/circuit-breaker.ts` |
| `validateInstruction` | `utils/src/validation.ts` (simple), `runner-utils/src/utils/validation.ts` (completa), `agent-runner/src/utils/validation.ts` (copia) |
| `MetricsCollector` | `utils/src/metrics.ts` (stub), `runner-utils/src/utils/metrics.ts`, `agent-runner/src/utils/metrics.ts` |

### Detalle por archivo

#### 1. CircuitBreaker

- **utils/src/circuit-breaker.ts**: Solo `execute()` llama a `fn()` sin lógica de circuit breaker. Tiene TODO.
- **runner-utils/src/utils/circuit-breaker.ts**: Implementación completa con estados (closed/open/half-open), failure counting, cooldown.
- **agent-runner/src/utils/circuit-breaker.ts**: IDÉNTICO a runner-utils (líneas 1-99 exactamente iguales). Copia directa.

#### 2. validateInstruction

- **utils/src/validation.ts**: Solo verifica string vacío. Devuelve `Result<string>` (extraño, debería ser `Result<void>`). Tiene TODO: "Implement full validation".
- **runner-utils/src/utils/validation.ts**: Implementación completa con `dangerousPatterns` (7 patrones de comandos peligrosos como `rm -rf /`, `dd if=`, fork bomb, etc). Devuelve `Result<void>`.
- **agent-runner/src/utils/validation.ts**: IDÉNTICO a runner-utils.

#### 3. Metrics

- **utils/src/metrics.ts**: Stub con métodos vacíos y TODOs.
- **runner-utils/src/utils/metrics.ts**: Implementación completa con `MetricsCollector`, historial de 1000 eventos, métodos `increment`, `histogram`, `getMetrics`, `clear`.
- **agent-runner/src/utils/metrics.ts**: IDÉNTICO a runner-utils.

## Causa Raíz

`agent-runner` copió utilities de `runner-utils` en lugar de importarlas. Posteriormente, ambos packages dependen de `@openfarm/utils` pero `utils` tiene implementaciones stub incompletas.

## Impacto

1. **Mantenibilidad**: Si encuentras bug en CircuitBreaker, debes arreglarlo en 3 lugares (si es que sabes que existen los 3).
2. **Inconsistencia`: Cambios en runner-utils no se reflejan en agent-runner (aunque ahora son idénticos, no hay guarantee de que sigan así).
3. **Confusión`: ¿Cuál es la fuente de verdad? ¿Por qué existen tres copias?
4. ** Bugs': Las versiones stub en `utils` no funcionan. Cualquiera que importe desde `@openfarm/utils` obtiene código no funcional.

## Opciones de Solución

### Opción A: Consolidar en `@openfarm/utils` (RECOMENDADA)

**Rationale**: `utils` ya existe como package compartido. Es el lugar natural para utilities comunes.

**Pasos**:

1. En `packages/utils/src/`:
   - Reemplazar `circuit-breaker.ts` con la implementación completa de `runner-utils/src/utils/circuit-breaker.ts`
   - Reemplazar `validation.ts` con la implementación completa de `runner-utils/src/utils/validation.ts` (dangerousPatterns)
   - Reemplazar `metrics.ts` con la implementación completa de `runner-utils/src/utils/metrics.ts`

2. En `packages/agent-runner/src/utils/`:
   - Eliminar `circuit-breaker.ts`, `validation.ts`, `metrics.ts`
   - Cambiar imports en `agent-runner/src/utils/index.ts` (si existe) o en archivos que usen estas utilities para importar desde `@openfarm/utils`

3. En `packages/runner-utils/src/utils/`:
   - Eliminar `circuit-breaker.ts`, `validation.ts`, `metrics.ts`
   - En `runner-utils/src/composition/retry.ts` ya re-exporta desde `@openfarm/utils`, verify que funcione
   - En `runner-utils/src/utils/index.ts` (si existe), eliminar exports de estas utilities o re-exportar desde utils

4. Actualizar todos los imports en el codebase que apunten a:
   - `@openfarm/agent-runner/src/utils/circuit-breaker` → `@openfarm/utils`
   - `@openfarm/runner-utils/src/utils/circuit-breaker` → `@openfarm/utils`
   - Similar para validation y metrics

5. Test: correr todos los tests para asegurar que nothing break.

**Riesgos**:
- Bajo: utils es dependency de core, agent-runner, sdk, etc. Todos ya lo tienen instalado.
- Si hay archivos que importan directamente desde las rutas de agent-runner/runner-utils, se romperán. Deberán actualizarse.

**Esfuerzo**: 4-6 horas (incluye buscar todos los imports y actualizar).

### Opción B: Crear `@openfarm/common-utils` package

**Rationale**: Si `utils` debe mantener otras funcionalidades y no queremos mezclar, crear un package nuevo para estas tres utilities.

**Pasos**:
1. Crear `packages/common-utils/` con `circuit-breaker.ts`, `validation.ts`, `metrics.ts` (copiar implementaciones completas)
2. Hacer que `@openfarm/utils` y `@openfarm/agent-runner` y `@openfarm/runner-utils` dependan de `@openfarm/common-utils`
3. Eliminar las copias duplicadas
4. Update imports

**Desventajas**:
- Otro package más en el monorepo
- Overhead de mantenimiento
- `utils` ya existe, ¿por qué crear otro?

**Esfuerzo**: Similar a Opción A.

### Opción C: Mantener duplicación pero sincronizar

**Rationale**: No hacer nada estructural, pero documentar que son la misma cosa.

**Desventajas**:
- Imposible mantener sincronización a largo plazo
- Alto riesgo de divergencia
- No resuelve el problema de fondo

**Conclusión**: NO recomendado.

## Decisión Recomendada

**Opción A** — Consolidar en `@openfarm/utils`.

- Es el package diseñado para utilities
- Ya es dependency de multiple packages
- Simplifica el grafo de dependencias
- Elimina Commits de copy-paste
- Permite que `utils` deje de ser stub y tenga código funcional

## Implementation Plan

### Paso 1: Preparación (30 min)
```bash
# 1. Branch git: fix/code-duplication
git checkout -b fix/code-duplication

# 2. Commit estado actual (por si algo falla)
git add -A && git commit -m "chore: snapshot before deduplication"
```

### Paso 2: Reemplazar utils (1 hora)
```bash
# Backup viejos archivos
cd packages/utils/src
mv circuit-breaker.ts circuit-breaker.stub.ts
mv validation.ts validation.stub.ts
mv metrics.ts metrics.stub.ts

# Copiar implementaciones completas desde runner-utils
cp ../../runner-utils/src/utils/circuit-breaker.ts ./circuit-breaker.ts
cp ../../runner-utils/src/utils/validation.ts ./validation.ts
cp ../../runner-utils/src/utils/metrics.ts ./metrics.ts
```

### Paso 3: Eliminar duplicados en runner-utils (30 min)
```bash
cd packages/runner-utils/src/utils
rm circuit-breaker.ts validation.ts metrics.ts

# Si hay index.ts que exporte estas cosas, modificar para re-export desde @openfarm/utils
```

### Paso 4: Eliminar duplicados en agent-runner (30 min)
```bash
cd packages/agent-runner/src/utils
rm circuit-breaker.ts validation.ts metrics.ts

# Update imports en cualquier archivo que los use
# Ejemplo: grep -r "from '../utils/circuit-breaker'" .
# Cambiar a: import { CircuitBreaker } from '@openfarm/utils'
```

### Paso 5: Buscar y reemplazar imports (1 hora)
```bash
# Buscar en todos los packages
rg "from '@openfarm/(runner-utils|agent-runner).*/(circuit-breaker|validation|metrics)'" packages

# Para cada match, cambiar a '@openfarm/utils'
```

### Paso 6: Test (30 min)
```bash
bun run type-check  # Debe pasar sin errors
bun run test        # Todos los tests deben pasar
bun run lint        # Biome check
```

### Paso 7: Commit y PR
```bash
git add -A
git commit -m "feat: consolidate utils - eliminate code duplication

- Move full implementations from runner-utils/agent-runner to @openfarm/utils
- Remove duplicate files
- Update all imports
- Fix: circuit-breaker now works correctly
- Fix: validateInstruction now includes dangerous pattern detection
- Fix: metrics collection now functional"
```

### Paso 8: Actualizar dependencias si es necesario

Si `runner-utils` o `agent-runner` ahora dependen de `@openfarm/utils` (ya dependen via otros packages pero quizás necesiten ser explícitas):

```bash
# En packages/runner-utils/package.json, ya tiene:
# "dependencies": { "@openfarm/utils": "workspace:*" }
# Debería estar bien.
```

## Rollback Plan

Si algo falla:
```bash
git reset --hard fix/code-duplication  # vuelve al snapshot pre-implementation
```

Luego, investigar el problema y reintentar.

## Seguimiento

- [ ] Paso 1 completado
- [ ] Paso 2 completado
- [ ] Paso 3 completado
- [ ] Paso 4 completado
- [ ] Paso 5 completado
- [ ] Paso 6 completado
- [ ] Paso 7 completado
- [ ] PR creado y aprobado

## Asignación

- **Owner**: @tu-usuario
- **Revisor**: Otro maintainer
- **Estimación**: 4-6 horas
- **Dependencies**: Ninguna (puede hacerse independiente)

## Riesgos

- **Bajo**: Algunos imports externos (fuera del monorepo) podrían romperse si alguien consumía directamente `@openfarm/runner-utils/src/utils/circuit-breaker`. Eso sería incorrecto (importar src interno). No soportado.

---

**Nota**: Este plan asume que la Opción A es la elegida. Si se elige otra opción, modificar pasos correspondientemente.
