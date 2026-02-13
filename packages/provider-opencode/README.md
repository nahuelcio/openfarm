# @openfarm/provider-opencode

OpenCode provider for OpenFarm using the OpenCode CLI.

## Installation

```bash
npm install @openfarm/provider-opencode
```

**Prerequisites**: OpenCode CLI must be available on your system:

```bash
bunx opencode-ai --version
```

If you want to attach to an existing OpenCode server, set `OPENCODE_SERVER_URL`.

## Usage

```typescript
import { OpenFarm } from "@openfarm/sdk";

const client = new OpenFarm({ defaultProvider: "opencode" });

const result = await client.execute({
  task: "Add input validation to the login form",
  workspace: "/path/to/project",
  model: "anthropic/claude-3-5-sonnet",
});
```

## Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `timeout` | `number` | `600000` | Timeout in milliseconds |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `OPENCODE_SERVER_URL` | - | Attach to a running OpenCode server URL (optional) |
| `OPENCODE_COMMAND` | `bunx` | CLI command to execute |

## License

MIT
