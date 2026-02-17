# @openfarm/sdk

OpenFarm SDK para ejecutar tareas de coding con providers en TypeScript.

## Estado

- El foco principal está en Desktop (`openfarm-app/`).
- Este SDK mantiene API de ejecución y compatibilidad.

## Instalación

```bash
npm install @openfarm/sdk
```

## Providers soportados

- `claude` (built-in en `@openfarm/sdk`)
- `opencode` (built-in en `@openfarm/sdk`)
- `external-agent` (CLI genérico; se puede usar con `codex`)

## Quick Start

```typescript
import { OpenFarm } from "@openfarm/sdk";

const openFarm = new OpenFarm({
  defaultProvider: "claude",
});

const result = await openFarm.execute({
  task: "Create a simple React component for a todo list",
  workspace: "./my-project",
});

console.log(result.output);
```

## Uso con Codex (CLI)

```typescript
await openFarm.execute({
  provider: "external-agent",
  cli: "codex",
  task: "Fix TypeScript errors in src/",
  workspace: "/path/to/repo",
});
```

## Gestión de providers

```typescript
const providers = await openFarm.getAvailableProviders();
await openFarm.setProvider("opencode");
const metadata = await openFarm.getProviderMetadata("opencode");
await openFarm.preloadProvider("opencode");
```

## Ejemplos

Ver `/packages/sdk/examples`.

## License

MIT
