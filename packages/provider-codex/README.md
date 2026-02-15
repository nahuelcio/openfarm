# @openfarm/provider-codex

Codex metadata helpers for OpenFarm.

This package reads local Codex CLI configuration and model cache to expose:

- available models
- available modes (profiles + reasoning efforts)
- default model/mode selection
- normalized `codex exec` argument resolution

## Installation

```bash
npm install @openfarm/provider-codex
```

## Usage

```typescript
import {
  getCodexCatalog,
  resolveCodexExecutionArgs,
} from "@openfarm/provider-codex";

const catalog = getCodexCatalog();

const args = resolveCodexExecutionArgs({
  model: catalog.defaultModel,
  mode: catalog.defaultMode,
});
```

## Data sources

- `~/.codex/models_cache.json`
- `~/.codex/config.toml`

## License

MIT
