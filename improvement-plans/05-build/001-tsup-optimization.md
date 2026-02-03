# ADR-008: Optimizar Configuración de Tsup y Bundling

## Estado

**MEDIA** — Configuración de SDK bundlea demasiado, perdiendo ventajas de monorepo

## Problema

`packages/sdk/tsup.config.ts` tiene `noExternal` con 14 packages internos:

```ts
noExternal: [
  "@openfarm/core",
  "@openfarm/types",
  "@openfarm/logger",
  "@openfarm/result",
  "@openfarm/utils",
  "@openfarm/config",
  "@openfarm/agent-runner",
  "@openfarm/workflow-engine",
  "@openfarm/analysis",
  "@openfarm/coding-engines",
  "@openfarm/git-adapter",
  "@openfarm/github-adapter",
  "@openfarm/azure-adapter",
  "@openfarm/context"
]
```

Esto significa que cuando buildeas SDK, **todo el código de esos 14 packages se incluye en el bundle**. Problemas:

1. **Sin separación de concerns**: El SDK debería ser un entry point, no un monolito.
2. **Sin actualizaciones independientes**: Si actualizas `core`, debes rebuild SDK entero para que se vea el cambio. En un monorepo con workspaces, esto no es necesario.
3. **Tamaño de bundle innecesariamente grande**: Consumers de SDK no pueden tree-shake los packages internos porque ya están bundled.
4. **Rompe la modularidad**: La idea de tener packages separados es que sean independientes. Esto los acopla fuertemente.
5. **Contradice best practices de tsup**: `noExternal` es para casos especiales (como ESM-only packages), no para dependencias de workspace.

### Cuándo `noExternal` es Apropiado

- Packages ESM que no tienen export CommonJS (raro)
- Packages que deben ser inlined por alguna razón específica (plugin systems)
- Packages que no están en `node_modules` (vendor code)

**No** es apropiado para dependencias de workspace que ya están en `node_modules` symlinks.

### Comparación: CLI vs Library

Tienes DOS configs en `tsup.config.ts`:

1. **Library bundle** (`src/index.ts`):
   - Format: `cjs`, `esm`
   - Tiene `noExternal` gigante ← **PROBLEMA**

2. **CLI bundle** (`src/cli.ts`):
   - Format: `esm` solo
   - También tiene `noExternal` gigante ← ¿Necesario?

El **CLI** puede necesitar bundling total porque es un binario. Pero el **library** NO.

## Solución

### Para Library Bundle (config #1)

REMOVER completamente `noExternal`. Dejar que Node resuelva las dependencias de workspace.

```ts
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
  // ELIMINAR noExternal
  external: [
    // Solo packages npm EXTERNOS, no workspace packages
    "better-sqlite3",
    "pino",
    "pino-pretty",
    "uuid",
    "zod",
    "js-yaml",
    "ai",
    "react",
    "react-dom",
    "zustand",
    "ink",
    "ink-select-input",
    "ink-text-input"
    // NOTA: @openfarm/provider-*. Si son packages separados en workspace, NO deben estar external
    // Si están en packages/, son parte del monorepo y Node los resuelve via symlink
  ],
  outDir: "dist",
  target: "node18",
}
```

**Qué pasa después**:
- `dist/index.js` importará `require("@openfarm/core")` en lugar de incluir su código.
- Cuando un user instala `@openfarm/sdk`, npm instalará también `@openfarm/core` como dependency (ya está en package.json dependencies).
- Los packages de workspace se publican separadamente (o se symlinkean en desarrollo).
- Tree-shaking funciona mejor.

### Para CLI Bundle (config #2)

Para CLI, quizás quieras un standalone binary. En ese caso, `noExternal` para packages de workspace puede ser acceptable para crear un binario sin dependencias externas.

**Pero**: Si el CLI es parte del mismo package SDK (que tiene `bin` field), entonces el CLI debería ser un entry point pequeño que importe el library. Si el library ya no bundlea everything, el CLI seguirá importando esos packages, y Node los resolverá desde `node_modules`.

**Opción B (recomendada)**: CLI también sin `noExternal`, pero con `external` solo para npm packages pesados como `better-sqlite3` (que tiene binary). Los packages `@openfarm/*` pueden dejarse como dependencias externas normativas.

```ts
{
  entry: ["src/cli.ts"],
  format: ["esm"],
  splitting: false,
  sourcemap: true,
  bundle: true,
  minify: false,
  treeshake: true,
  external: [
    "better-sqlite3",  // No bundlear binary native module
    // Los demás npm packages pueden bundlear o no, según preferencia
  ],
  outDir: "dist",
  target: "node18",
  outExtension: () => ({ js: ".mjs" }),
}
```

### Publicación de Packages

Antes, verificar que todos los packages (core, utils, agent-runner, etc.) tengan:

1. `package.json` con `main/module/types` apuntando a `dist/` (ver ADR-003)
2. `prepare` script o `prepublishOnly` que corra `bun run build`
3. `files` campo que incluya `dist/`

Así, cuando alguien instale `@openfarm/sdk`, npm instalará también `@openfarm/core@x.x.x`, etc., y Node resolverá los imports a los `dist/` de cada package.

### Actualizar package.json Dependencies

`packages/sdk/package.json` ya tiene:

```json
"dependencies": {
  "@openfarm/agent-runner": "workspace:*",
  "@openfarm/context": "workspace:*",
  "@openfarm/core": "workspace:*",
  "@openfarm/git-worktree": "workspace:*",
  "@openfarm/workflow-engine": "workspace:*",
  + ai, better-sqlite3, chalk, ink, js-yaml, pino, uuid, zod, zustand
}
```

Está bien. Publicando estos packages como semver (aunque privados), funciona.

### Costo de Cambio

- Actualizar `tsup.config.ts` en SDK: 30 min
- Verificar que todos los packages estén correctamente configurados con dist: 1 hora (ver ADR-003)
- Testing local: `bun run build && bunx tsc --noEmit`: 30 min
- Potential breakage si alguien importa internos directamente (`@openfarm/core/src/...`) — Documentar que NO se debe hacer.

## Implementation Steps

1. **Audit packages con tsup**: ¿Cuáles usan `noExternal`?
   ```bash
   rg "noExternal" packages/*/tsup.config.ts
   ```
   Posiblemente solo SDK. Otros packages (git-worktree, context) pueden tener configs diferentes.

2. **Modificar `sdk/tsup.config.ts`**:
   - Eliminar `noExternal` array completo
   - Asegurar que `external` solo contenga npm packages externos
   - Para CLI: maybe keep `external: ["better-sqlite3"]` solo

3. **Test**:
   ```bash
   cd packages/sdk
   bun run clean
   bun run build
   # Inspeccionar dist/
   # Verificar que imports a @openfarm/* queden como require/import statements, no inlined
   head -20 dist/index.js
   ```

4. **Update README si es necesario**: Documentar que los packages de OpenFarm son dependencies separadas y deben instalarse.

5. **CI/CD**: Asegurar que el pipeline de build no asuma que todo está en un bundle.

## Ejemplo de Output Esperado

**Antes** (con noExternal):
```js
// dist/index.js incluye TODO el código de core, utils, etc. inline
class OpenFarm { ... } // from sdk
// 5000 líneas más...
```

**Después** (sin noExternal):
```js
// dist/index.js
export { OpenFarm } from "./open-farm.js";
// Y en open-farm.js:
import { coreSomething } from "@openfarm/core";
// Node lo resuelve desde node_modules/@openfarm/core/dist/index.js
```

## Rollback

Si algo rompe:
```bash
git checkout -- packages/sdk/tsup.config.ts
# Y reverts ADR-003 si ya lo aplicaste
```

## Referencias

- [tsup Options — noExternal](https://tsup.egoist.dev/options#noexternal)
- [Monorepo best practices](https://monorepo.tools/)

---

**Conclusión**: El `noExternal` gigante en SDK es antipatrón. Elimínalo. Deja que el systema de módulos de Node haga su trabajo. Si quieres un binario standalone, usa `pkg` o `nexe` en lugar de bundling todo con tsup.
