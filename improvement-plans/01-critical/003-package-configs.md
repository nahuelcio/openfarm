# ADR-003: Estandarizar Configuración de Packages

## Estado

**CRÍTICO** — Inconsistencia entre packages rompe estándares npm

## Problema

### Patrón Incorrecto (src directo)

```json
{
  "name": "@openfarm/agent-runner",
  "main": "src/index.ts",      // ❌ Debería ser dist/
  "types": "src/index.ts",     // ❌ Debería ser dist/
  "private": true
}
```

Este patrón se repite en:
- `@openfarm/agent-runner`
- `@openfarm/workflow-engine`
- `@openfarm/core`
- `@openfarm/logger`
- `@openfarm/result`
- `@openfarm/utils`
- `@openfarm/types`

### Patrón Correcto (dist compilado)

```json
{
  "name": "@openfarm/sdk",
  "main": "./dist/index.js",
  "module": "./dist/index.mjs",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.mjs",
      "require": "./dist/index.js"
    },
    "./package.json": "./package.json"
  },
  "files": ["dist"]
}
```

### Problemas del Patrón Incorrecto

1. **No es estándar npm**: Los fields `main` y `types` deben apuntar a archivos compilados JavaScript/d.ts, no a TypeScript source.
2. **Rompe consumers**: Si alguien consume el package en un proyecto que no tiene TypeScript configurado para resolver src/, falla.
3. **Workspaces también fallan**: Aunque estés dentro del monorepo, algunos tools (como bundlers) esperan dist/.
4. **Inconsistencia**: Packages públicos (sdk, git-worktree, context) usan dist; privados usan src. ¿Por qué?
5. **tsup ineficiente**: `sdk/tsup.config.ts` tiene `noExternal` con 14 packages internos. Esto significa que bundlea TODO el código de esos packages dentro del SDK, en lugar de dejarlos como dependencias separadas.

### Ejemplo de Problema TSUP

```ts
// packages/sdk/tsup.config.ts (config de library)
noExternal: [
  "@openfarm/core", "@openfarm/types", "@openfarm/logger",
  "@openfarm/result", "@openfarm/utils", "@openfarm/config",
  "@openfarm/agent-runner", "@openfarm/workflow-engine",
  "@openfarm/analysis", "@openfarm/coding-engines",
  "@openfarm/git-adapter", "@openfarm/github-adapter",
  "@openfarm/azure-adapter", "@openfarm/context"
]
```

Esto crea un bundle gigante donde todo está incluido. Si actualizas `core`, necesitas rebuild SDK entero. No hay separación de concerns.

## Solución Propuesta

### Opción 1: Estandarizar Todos a Dist (RECOMENDADA)

**Rationale**: Consistencia total, estándar npm, mejor DX.

**Pasos**:

1. **Para cada package privado** (agent-runner, workflow-engine, core, logger, result, utils, types, config, git-adapter, github-adapter, azure-adapter, analysis, coding-engines, execution-logger, git-diff, queues, vault-adapter, workflow-executor, context, provider-*):

   a. Crear `tsup.config.ts` (si no existe):
   ```ts
   import { defineConfig } from "tsup";

   export default defineConfig({
     entry: ["src/index.ts"],
     format: ["cjs", "esm"],
     dts: true,
     splitting: false,
     sourcemap: true,
     clean: true,
     bundle: true,
     minify: false,
     treeshake: true,
     // IMPORTANTE: NO noExternal para packages de workspace
     // external: [], // Dejar vacío o externos solo npm packages externos
     outDir: "dist",
     target: "node18",
   });
   ```

   b. Modificar `package.json`:
   ```json
   {
     "main": "./dist/index.js",
     "module": "./dist/index.mjs",
     "types": "./dist/index.d.ts",
     "exports": {
       ".": {
         "types": "./dist/index.d.ts",
         "import": "./dist/index.mjs",
         "require": "./dist/index.js"
       },
       "./package.json": "./package.json"
     },
     "files": ["dist"],
     "scripts": {
       "build": "tsup",
       "prepublishOnly": "bun run build",
       ...
     }
   }
   ```

   c. Añadir `tsup` a `devDependencies` si no está.

2. **Actualizar `sdk/tsup.config.ts`**:

   Eliminar `noExternal` gigante. En su lugar, dejar que las dependencias de workspace se resuelvan normally. El `external` array solo debería incluir npm packages externos (como `better-sqlite3`, `pino`, `zod`, `ai`, etc.) que NO son parte del monorepo.

   ```ts
   // packages/sdk/tsup.config.ts - Library bundle
   {
     entry: ["src/index.ts"],
     format: ["cjs", "esm"],
     dts: true,
     splitting: false,
     sourcemap: true,
     clean: true,
     bundle: true,
     minify: false,
     treeshake: true,
     // REMOVER noExternal completamente
     external: [
       "better-sqlite3",    // npm externo
       "pino",
       "pino-pretty",
       "uuid",
       "zod",
       "js-yaml",
       "ai"
       // NOTA: providers (@openfarm/provider-*) son externos pero si son parte del monorepo?
       // Si están en packages/, NO deberían ser external aquí
     ],
     outDir: "dist",
     target: "node18",
   }
   ```

   **Nota**: Si providers (`@openfarm/provider-opencode`, etc.) están en packages/, son workspaces y NO deben estar en `external`. Tampoco en `noExternal`. Dejar que el resolvedor de Node los busque en node_modules (que symlinkea a packages/).

3. **Actualizar dependencias en package.json**:

   Algunos packages podrían tener dependencias circulares después de este cambio. Verificar:
   - `core` depende de `utils`, `result`, `logger`, `types`
   - `agent-runner` depende de `core`, `utils`, `result`, `logger`, `types`, `git-worktree`, `git-adapter`
   - `git-worktree` depende de `result`, `logger`
   - `git-adapter` depende de `result`, `logger`
   
   Esto está bien, NO hay ciclos. Pero después del cambio a dist, asegurar que todos tengan `build` antes de usarlos.

4. **Actualizar `tsconfig.json` de cada package**:

   Asegurar que `outDir` apunte a `./dist` y `rootDir` a `./src` (tsup maneja esto automáticamente, pero verificar).

5. **Update CI/CD**:

   Si hay pipelines que asumen src directo, actualizar para que usen `bun run build` antes de test o publicar.

6. **Test localmente**:

   ```bash
   # Build todos los packages
   bun run build
   
   # Verificar que imports entre packages funcionen
   bunx tsc --noEmit  # en raíz
   
   # Test individual packages
   cd packages/agent-runner && bun run test
   ```

### Opción 2: Mantener Patrón src y Documentar

**Rationale**: Los packages son privados, nunca se publican, solo workspaces. El patrón src puede funcionar si todos los tools están configurados para resolverlo.

**Desventajas**:
- No estándar
- Confuso para nuevos developers
- Algunas herramientas (como VS Code, WebStorm) pueden tener problemas
- No se puede publicar aunque seas privado (npm still expects compiled JS)

**Conclusión**: NO recomendado. Mejor estandarizar.

## Etapas de Implementación

### Fase 1: Audit (2 horas)

Listar todos los packages y sus configs actuales:

```bash
for dir in packages/*; do
  echo "=== $(basename $dir) ==="
  cat $dir/package.json | grep -E '"main"|\"types\"'
done
```

Crear spreadsheet con:
- Package name
- main actual
- types actual
- tiene tsup config?
- tiene build script?
- privado/público

### Fase 2: Crear tsup.configs (4 horas)

Para cada package sin tsup, crear `tsup.config.ts` como se especifica arriba.

### Fase 3: Actualizar package.json (2 horas)

Modificar main/module/types/exports/files.

### Fase 4: Update SDK (2 horas)

Modificar `sdk/tsup.config.ts` removiendo `noExternal`.

### Fase 5: Test completo (2 horas)

```bash
bun run clean
bun install
bun run build  # Debe build todos
bun run type-check
bun run test
```

### Fase 6: CI/CD (1 hora)

Actualizar `.github/workflows/*.yml` si es necesario para incluir `bun run build` antes de test.

### Fase 7: PR y Review

Commit en un solo PR grande o dividido por grupos de packages.

## Rollback

Si algo falla:
```bash
git checkout -- packages/*/package.json packages/*/tsup.config.ts
git checkout -- packages/sdk/tsup.config.ts
```

O revertir PR.

## Riesgos

- **Medio**: Algunos imports entre packages podrían romperse si paths no están bien configurados
- **Bajo**: Tiempo relativamente cort (1-2 días)

## Dependencies

- Depende de que `tsup` esté instalado en cada package (ya usas tsup en sdk y git-worktree)
- No depende de otros planes (puede implementarse independientemente)

## Success Criteria

- [ ] Todos los packages tienen `main`, `module`, `types` apuntando a `dist/`
- [ ] Todos los packages tienen `exports` bien definidos (con `./package.json` incluido)
- [ ] SDK ya no tiene `noExternal` para packages de workspace
- [ ] `bun run build` genera `dist/` en cada package
- [ ] Tests pasan después del cambio
- [ ] Local development funciona (imports entre packages resueltos correctamente)

---

## Preguntas Frecuentes

**Q: ¿Por qué no usar `bun build` en lugar de `tsup`?**

A: `bun build` no genera declaration files (.d.ts) automáticamente (todavía). `tsup` sí. Además, `tsup` es el estandar actual en tu codebase.

**Q: ¿Qué sobre `private: true`?**

A: `private: true` evita publicaciones accidentales en npm. No afecta el patrón de build. Puede quedarse.

**Q: ¿Debo publicar estos packages?**

A: Si son `private: true`, no. El Patrón dist sigue siendo válido para workspaces y local consumption.

**Q: ¿Y el package `@openfarm/types`? No necesita build?**

A: `types` solo exporta type definitions (interfaces). No tiene código runtime. Podría mantener `main: src/index.ts` porque no hay JavaScript. PERO para consistencia, mejor dejarlo igual que otros (aunque su dist será solo .d.ts). TypeScript no necesita dist para types, pero las tools que leen package.json sí esperan `types` field.

Mejor: para packages *solo types*, puedes dejar `types` apuntando a `src/index.ts` (no hay dist needed), pero `main` debería ser algo válido (aunque no se use). Omitted `main` es acceptable para type-only packages? npm warning. Defensive: create dummy dist o apuntar main a `src/index.ts` igual, dado que exporta solo types.

**Conclusión**: Packages que exportan solo types (como `@openfarm/types` que revisé, solo tiene exports de tipos) pueden mantener `main: src/index.ts` porque no hay runtime JS. Pero documentar esta excepción.
