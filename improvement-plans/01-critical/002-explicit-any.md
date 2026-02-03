# ADR-002: Eliminar Uso de `any` y Estrictificar TypeScript

## Estado

**CRÍTICO** — 162 instancias de `any` comprometen seguridad de tipos

## Problema

El proyecto tiene configurado `"strict": true` en `tsconfig.base.json`, pero:
1. `"noImplicitAny": false` está explícitamente false (contradice strict)
2. Uso extensivo de `any` en código productivo y types definitions
3. `biome.jsonc` tiene `"noExplicitAny": "off"` en linter rules

### Ejemplos Graves

#### providers.d.ts
```typescript
interface IProviderFactory {
  getMetadata(): any;         // ❌ Devuelve any
  create(config?: any): any;  // ❌ Acepta any, devuelve any
}
```
Esto significa que **cualquier consumer** del SDK pierde type safety total al usar providers.

#### workflow-engine/orchestrator/*.ts
```typescript
const currentExecution = await getWorkflowExecution(database as any, executionId);
```
Casts inseguros de `db` (base de datos) a `any`. Si la función cambia su tipo, no habrá error de compile.

#### core/src/db/connection.ts
```typescript
if (typeof (globalThis as any).Bun !== "undefined") {
```
Usar `as any` para evitar error de compilación es un antipatrón. Debería usar feature detection sin cast.

#### Tests (que pueden ser aceptables temporalmente)
```typescript
global.fetch = vi.fn(() => Promise.reject(new Error("offline"))) as any;
```
Exceso de `as any` en tests indica que los tipos de los mocks no están correctamente definidos.

#### vault-adapter/src/services/vault-client.ts
```typescript
(error as any).response = response;
(error as any).body = errorText;
```
Extensión dinámica de properties en `Error`. Debería usar una interfaz específica.

## Estadísticas

```
Total de archivos con `any`: 30+
Total de ocurrencias: 162
- tests: ~70 (aceptable pero mejorable)
- producción: ~92 (crítico)
```

## Causa Raíz

1. **Configuración permisiva**: `noImplicitAny: false` permite cualquier variable inferida como `any` sin error
2. **Falta de disciplina**: Developers usaron `any` como "escape hatch" en lugar de definir tipos correctos
3. **Complejidad de tipos**: Algunos sistemas (db, JSON dinámico) son inherentemente dinámicos, pero se manejaron mal
4. **Times pressure**: Priorizaron velocidad sobre calidad

## Impacto

1. **Seguridad**: Bugs en runtime que TypeScript debería catch
2. **API pública**: SDK expone `any` → consumers pierden autocompletado, type checking
3. **Mantenibilidad**: Difícil refactorizar código con tipos `any` porque no sabes qué hay adentro
4. **Credibilidad**: Un SDK que se vende como "TypeScript-first" pero usa `any` por todos lados es hipócrita
5. **Tests**: Tests con `any` no verifican tipos realmente

## Solución: Fase en 3 Etapas

### Etapa 1: Configuración y Linter (Día 1)

**Objetivo**: Bloquear nuevos `any` y detectar existentes

1. **tsconfig.base.json**:
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true  // Cambiar de false a true
  }
}
```

2. **biome.jsonc**: Activar regla
```json
{
  "linter": {
    "rules": {
      "suspicious": {
        "noExplicitAny": "error"  // Cambiar de "off" a "error"
      }
    }
  }
}
```

3. Probar que build actual falla con nueva configuración:
```bash
bunx tsc --noEmit  # Debería mostrar errors por cada `any`
```

Esto revelará el número exacto de violations.

### Etapa 2: Eliminar `any` en Producción (2-3 días)

**Priorización**:

**P0 (Críticos — API pública)**:
1. `packages/sdk/src/types/providers.d.ts` — Cualquier `any` aquí afecta a todos los users
2. `packages/sdk/src/provider-system/base-provider.ts` — Tipos de respuesta
3. `packages/sdk/src/strategies/http-strategy.ts` — Response parsing
4. `packages/workflow-engine/src/orchestrator/*.ts` — Lógica de negocio principal
5. `packages/core/src/db/*.ts` — Base de datos (tipar rows)
6. `packages/vault-adapter/src/**` — External API responses
7. `packages/github-adapter/src/**` — GitHub API responses
8. `packages/provider-opencode/src/**` — OpenCode responses

**P1 (Importantes — Librería interna)**:
9. `packages/azure-adapter/src/**`
10. `packages/context/src/**`
11. `packages/analysis/src/**`

**P2 (Tests — Pueden esperar pero deben arreglarse)**:
12. Tests en `sdk/src/strategies/__tests__/`
13. Tests en `git-adapter/test/`
14. Tests en `core/test/`
15. Tests en `queues/test/`

**Estrategia por caso**:

#### Caso A: `any` para "dinámico" (JSON externo)
```typescript
// Antes
const data = response as any;

// Después
interface ApiResponse {
  id: string;
  attributes: Record<string, unknown>;
}
const data = response as ApiResponse;
// O usar: const data = response as unknown as ApiResponse;

// O mejor: parsear con Zod
const schema = z.object({ id: z.string() });
const data = schema.parse(response);
```

#### Caso B: `any` para "mocks de tests"
```typescript
// Antes
(mockFn as any).mockResolvedValue(...);

// Después
import type { Mock } from 'vitest';
const mockFn = vi.fn() as Mock<typeof realFn>;
```

#### Caso C: `as any` para "type assertion en db rows"
```typescript
// Antes
const rows = (await db`SELECT * FROM table`) as any[];

// Después
interface UserRow {
  id: number;
  name: string;
  email: string;
}
const rows = (await db`SELECT * FROM users`).toArray<UsersRow>();
// Nota: better-sqlite3 tiene métodos tipados
```

#### Caso D: `any` en class extends o property access
```typescript
// Antes (vault-adapter)
(error as any).response = response;

// Después
interface ExtendedError extends Error {
  response?: Response;
}
(error as ExtendedError).response = response;
```

#### Caso E: `any` en function parameters
```typescript
// Antes
function formatResult(parsedResult: any, response: any) { ... }

// Después (proven-specific types)
function formatResult(
  parsedResult: z.infer<typeof parseSchema>,
  response: Response
) { ... }
```

#### Caso F: `any` en generics/utilities
```typescript
// Antes
function chunk<T>(array: T[]): T[][] { ... } // OK (no any)
// Pero en uso:
const result = (someValue as any); // NO OK

// Después
// Eliminar cast y usar type guards
if (isString(someValue)) { ... }
```

### Etapa 3: Refactorizar Tipos Públicos (1 día)

**Enfoque en definiciones de tipos (`*.d.ts` o `types.ts`)**:

1. **packages/sdk/src/types/providers.d.ts**:
```typescript
// Antes
interface IProvider {
  getMetadata(): any;
  create(config?: any): any;
}

// Después
interface ProviderMetadata {
  id: string;
  name: string;
  description?: string;
  version: string;
}

interface ProviderConfig {
  [key: string]: unknown;  // O definir config específica por provider
}

interface IProvider {
  getMetadata(): ProviderMetadata;
  create(config?: ProviderConfig): Provider;
}
```

2. **BaseProvider** en `sdk/src/provider-system/base-provider.ts`:
- Definir `ProviderResponse` generic con tipos seguros
- `formatResult(parsedResult: ParserResult, response: CommunicationResponse)`

3. **CommunicationStrategy interface**: Especificar tipo de respuesta

## Checklist de Eliminación de `any`

Para cada archivo con `any`, documentar:
- [ ] Razón original del `any`
- [ ] Tipo correcto que debería usarse
- [ ] Implementación sin `any`
- [ ] Tests actualizados si es necesario
- [ ] `bunx tsc --noEmit` pasa sin errors

## Automatización

Puedes usar `eslint` o `biome` para auto-fix algunos casos, pero `any` generalmente requiere manual review.

### Herramientas útiles:

1. **TypeScript compiler** ya detecta implicit any:
```bash
bunx tsc --noEmit  # Muestra todos los errors
```

2. **Biome** con regla `noExplicitAny` activada:
```bash
bunx biome check packages --write  # Puede sugerir fixes
```

3. **ts-prune**: Para encontrar imports no usados (relacionado)

## Riesgos

- **Alto**: Romper APIs públicas si cambias tipos en SDK. Requiere version bump major.
- **Medio**: Tiempo de implementación largo (varias semanas si se hace exhaustivo)
- **Bajo**: Tests existentes deberían seguir pasando (son código, no tipos)

## Mitigación

1. **Hacer cambios incrementales**: por archivo, commit por commit
2. **No cambiar tipos sin actualizar tests**: cada tipo modificado debe tener tests que verifiquen usage
3. **Usar `unknown` como paso intermedio**: Si no conoces el tipo, usa `unknown` en lugar de `any`. Es más seguro.
4. **Versionado**: Si es API pública, documentar como breaking change y hacer major version bump

## Timeline Estimado

- **Día 1**: Config + audit completo (listar todos `any`)
- **Días 2-4**: P0 (API pública) — ~50 occurrences
- **Días 5-7**: P1 (core interno) — ~40 occurrences  
- **Días 8-10**: P2 (tests) — ~70 occurrences (más rápido porque tests son menos críticos)
- **Día 11**: Testing completo y validación
- **Día 12**: Documentación de cambios

**Total**: ~12 días hábiles (2.5 semanas)

## Dependencies

Este plan depende de:
- Ninguno (puede empezar inmediatamente)

Pero se recomienda hacer **Primero** antes que otros cambios arquitectónicos, porque:
1. Te obliga a entender mejor los tipos del codebase
2. Facilita refactors posteriores (con tipos fuertes, puedes refactor con confidence)
3. Previene introducir más `any` en otros planes

## Success Criteria

- [ ] `bunx tsc --noEmit` compila sin errores de `any`
- [ ] `biome check` no reporta `noExplicitAny`
- [ ] Ningún archivo en `packages/*/src` usa `any` (excepto tests)
- [ ] API pública (`@openfarm/sdk`) tiene tipos 100% seguros
- [ ] README de cada package documenta los tipos principales

## Seguimiento

Crear issue tracking en GitHub:
- `[TypeSafety][P0]` para cada archivo crítico
- `[TypeSafety][P1]` para internos
- `[TypeSafety][Tests]` para tests

Label issues con `type-safety` y `breaking-change` si applicable.

---

## Nota Final

TypeScript sin `any` es como cinturón de seguridad sin agujeros. Puede parecer incómodo al principio, pero salva vidas (de bugs). Es hora de dejar de usar `any` como shortcut y tomarnos el tiempo para definir tipos correctos.

Si no tienen tiempo para definir tipos, usen `unknown`. Al menos eso fuerza un type check en cada usage.
