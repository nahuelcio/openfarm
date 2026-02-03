# ADR-006: Activar y Endurecer Reglas de Biome

## Estado

**MEDIA** — Biome tiene muchas reglas desactivadas que debilitan el linting

## Problema

`biome.jsonc` tiene reglas importantes desactivadas:

```json
{
  "linter": {
    "rules": {
      "correctness": {
        "noUnusedImports": "error",
        "noUnusedVariables": "warn"
        // ✅ Algunas activadas
      },
      "style": {
        "noNonNullAssertion": "off",            // ❌
        "useConst": "warn",                     // Solo warn
        "noParameterAssign": "off",             // ❌
        "noEnum": "off",                        // ❌
        "noNestedTernary": "off",               // ❌
        "useConsistentMemberAccessibility": "off" // ❌
      },
      "suspicious": {
        "noExplicitAny": "off",                 // ❌ CRÍTICO
        "noArrayIndexKey": "off",               // ❌
        "useAwait": "off",                      // ❌
        "noEvolvingTypes": "off",               // ❌
        "noImplicitAnyLet": "off",              // ❌
        "noEmptyBlockStatements": "off",        // ❌
        "useIterableCallbackReturn": "off",     // ❌
        "noBitwiseOperators": "off"             // ❌
      },
      "complexity": {
        "noForEach": "off",                     // ❌
        "noExcessiveCognitiveComplexity": "off", // ❌
        "noStaticOnlyClass": "off"              // ❌
      },
      "performance": {
        "noBarrelFile": "off",                  // ❌
        "noNamespaceImport": "off",             // ❌
        "useTopLevelRegex": "off",              // ❌
        "noAccumulatingSpread": "off"           // ❌
      }
    }
  }
}
```

### Reglas Clave Desactivadas

| Rule | Importancia | Por qué importa |
|------|-------------|-----------------|
| `noExplicitAny` | 🔴 CRÍTICA | Permite `any` (ya identificado en ADR-002) |
| `noNonNullAssertion` | 🟠 Alta | `value!` puede causar runtime errors |
| `noArrayIndexKey` | 🟠 Alta | Usar array index como key en React lists causa bugs |
| `noForEach` | 🟡 Media | `array.forEach()` con async no funciona como espera |
| `useConst` | 🟡 Media | inmutable > mutable |
| `noParameterAssign` | 🟡 Media | Parameters shouldn't be reassigned (confusing) |
| `noEnum` | 🟡 Baja | `enum` de TypeScript compila a JS pesado |
| `noNestedTernary` | 🟡 Baja | Legibilidad |
| `useTopLevelRegex` | 🟢 Baja | Performance regex |

## Causa Raíz

El proyecto usa `extends: ["ultracite/core"]` que define un baseline, pero luego se desactivan muchas reglas. Probablemente para evitar que el linter moleste durante desarrollo temprano.

## Impacto

1. **Calidad de código**: Se permiten antipatrones que causan bugs.
2. **Consistencia**: No hay guía de estilo unificada (aunque `useConst` warn ayuda).
3. **TypeScript**: Sin `noExplicitAny`, developers usan `any` libremente.
4. **React**: Sin `noArrayIndexKey`, lists en TUI pueden tener problemas de re-render.

## Solución Propuesta

### Fase 1: Baseline "estricto pero razonable" (1 hora)

Modificar `biome.jsonc`:

```json
{
  "$schema": "./node_modules/@biomejs/biome/configuration_schema.json",
  "extends": ["ultracite/core"],
  "files": {
    "includes": ["**/*", "!.turbo", "!!**/.claude"]
  },

  "javascript": {
    "globals": ["jest", "describe", "it", "expect", "beforeEach", "afterEach", "beforeAll", "afterAll"]
  },

  "linter": {
    "rules": {
      "correctness": {
        "noUnusedVariables": "warn",
        "noUnusedImports": "error",
        "noUnusedFunctionParameters": "error",  // Cambiar de 'off' a 'error'
        "useExhaustiveDependencies": "warn"     // React hooks
      },
      "style": {
        "noNonNullAssertion": "warn",           // Cambiar de 'off' a 'warn' (luego a error)
        "useConst": "error",                    // Cambiar de 'warn' a 'error'
        "noParameterAssign": "warn",            // Cambiar de 'off' a 'warn'
        "noEnum": "warn",                       // Activar warn
        "noNestedTernary": "warn",              // Activar warn
        "useConsistentMemberAccessibility": "warn" // Activar
      },
      "suspicious": {
        "noExplicitAny": "error",               // 🔥 CRÍTICO: Cambiar de 'off' a 'error'
        "noArrayIndexKey": "warn",              // Activar
        "useAwait": "error",                    // Siempre await en loops async
        "noEvolvingTypes": "warn",              // Variable que cambia de tipo
        "noImplicitAnyLet": "error",            // Similar a noExplicitAny
        "noEmptyBlockStatements": "error",      // Bloque vacío es bug o código muerto
        "useIterableCallbackReturn": "error",   // ForEach callback debería retornar value o nothing
        "noBitwiseOperators": "warn"            // Bitwise en JS es confuso, evitar
      },
      "complexity": {
        "noForEach": "warn",                    // forEach no puede ser async/await
        "noExcessiveCognitiveComplexity": "warn", // Función demasiado compleja
        "noStaticOnlyClass": "error"            // Clase solo estática? Usar namespace
      },
      "performance": {
        "noBarrelFile": "warn",                 // Importar desde barrel puede cargar todo
        "noNamespaceImport": "warn",            // Namespace imports (import * as ns) son más pesados
        "useTopLevelRegex": "warn",             // Regex compilados afuera del loop
        "noAccumulatingSpread": "error"         // spread en array que crece es O(n²)
      }
    }
  },

  "overrides": [
    {
      "includes": ["packages/**"],
      "linter": {
        "rules": {
          "correctness": {
            "noUnusedImports": "error"
          }
        }
      }
    },
    {
      "includes": ["**/*.vue"],
      // ... (mantener como está)
    }
  ]
}
```

**Nota**: No activar todas como `"error"` al principio si el codebase no cumple. Empezar con `"warn"` y evolucionar a `"error"` gradualmente.

### Fase 2: Migración Gradual (2-3 semanas)

**Semana 1**: Solo `noExplicitAny` en `error`.
- Correr `biome check` en CI, permitir warnings pero fail en `any`.
- Fix todos los `any` (ver ADR-002).
- Commit sin `any`.

**Semana 2**: Activar reglas de `suspicious` y `correctness` como `error`.
- `noArrayIndexKey`
- `useAwait`
- `noEmptyBlockStatements`
- `noUnusedFunctionParameters`
- Fix warnings.

**Semana 3**: Activar reglas de `style` como `warn` y luego `error`.
- `noNonNullAssertion`
- `useConst`
- `noParameterAssign`
- Fix.

**Semana 4**: `complexity` y `performance`.
- `noForEach`
- `noExcessiveCognitiveComplexity`
- `noAccumulatingSpread`
- Refactor funciones complejas.

### Fase 3: Auto-fix en Pre-commit (opcional)

Configurar `lefthook.yml`:

```yaml
pre-commit:
  parallel: true
  commands:
    biome-format:
      glob: "*.{ts,tsx,js,jsx,json,md,yml,yaml}"
      run: bunx biome format --write {staged_files}
    biome-lint:
      glob: "*.{ts,tsx,js,jsx}"
      run: bunx biome check {staged_files} --write  # --write intenta autofix
```

**Cuidado**: `biome check --write` puede hacer cambios automáticos. Revisar antes de commit.

### Override por Package

Algunos packages pueden necesitar excepciones:

**Tests**: En archivos `*.test.ts` o `__tests__/`, permitir:
```json
{
  "overrides": [
    {
      "includes": ["**/*.test.ts", "**/__tests__/**"],
      "linter": {
        "rules": {
          "suspicious": {
            "noExplicitAny": "off"  // Temporal, hasta que se mejoren mocks
          }
        }
      }
    }
  ]
}
```

**TUI components** (`*.tsx` en `sdk/src/tui`): React keys pueden necesitar index en algunos casos. `noArrayIndexKey` podría dar false positives. Override si es necesario.

## Checklist

- [ ] Actualizar `biome.jsonc` con reglas estrictas pero alcanzables
- [ ] Correr `bunx biome check` y capturar todos los warnings/errors
- [ ] Fix issues por categoría:
  - [ ] `any` elimination (ADR-002)
  - [ ] `noArrayIndexKey` en React lists
  - [ ] `useConst` en variables que no se reasignan
  - [ ] `noForEach` → cambiar a `for...of`
  - [ ] `noUnusedImports`/`noUnusedVariables`
  - [ ] `noNonNullAssertion` → agregar null checks o opt types
  - [ ] `useAwait` → asegurar `await` en callbacks async
- [ ] Configurar CI para fallar en `error` level violations
- [ ] Documentar reglas en `CONTRIBUTING.md`

## Rollback

Si las reglas son demasiado estrictas:
```bash
git checkout -- biome.jsonc
# O revertir cambios gradualmente
```

## Impacto Esperado

- **Código más limpio**: Menos bugs de null/any
- **Consistencia**: Todos siguen mismas reglas
- **Mejor DX**: Biome puede autofix muchos issues

## Referencias

- [Biome Rules](https://biomejs.dev/linter/rules/)
- [Ultracite Ruleset](https://github.com/biomejs/biome/tree/main/packages/%40biomejs/biome-ultracite)

---

**Conclusión**: Biome está配置 pero desactivado. Es hora de activar las reglas que importan. Empezar con `noExplicitAny` como error (ya Linked a ADR-002) y gradualmente endurecer.
