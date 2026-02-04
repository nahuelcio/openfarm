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

You also need the OpenCode server running (default: 127.0.0.1:4096).

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
| `OPENCODE_HOST` | `127.0.0.1` | OpenCode server host |
| `OPENCODE_PORT` | `4096` | OpenCode server port |
| `OPENCODE_SERVER_URL` | - | Full OpenCode server URL (overrides host/port) |
| `OPENCODE_COMMAND` | `bunx` | CLI command to execute |

## License

MIT
