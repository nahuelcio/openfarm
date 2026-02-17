# OpenFarm SDK Examples

## Prerrequisitos

1. `npm install`
2. `npm run build --workspace=@openfarm/sdk`
3. Tener CLIs instalados según el provider que uses (`claude`, `opencode`, `codex`, etc.)

## Ejecutar demo

```bash
node packages/sdk/examples/simple-demo.mjs
```

## Providers

- `claude`
- `opencode`
- `external-agent` (por ejemplo `cli: "codex"`)

## Snippet rápido con Codex

```typescript
import { OpenFarm } from "@openfarm/sdk";

const openFarm = new OpenFarm();

await openFarm.execute({
  provider: "external-agent",
  cli: "codex",
  task: "Diagnose TypeScript errors and fix them",
  workspace: "/path/to/repo",
});
```
