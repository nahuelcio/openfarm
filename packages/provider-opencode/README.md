# @openfarm/provider-opencode

OpenCode provider for OpenFarm - supports both local CLI and cloud HTTP modes.

## Installation

```bash
npm install @openfarm/provider-opencode
```

## Usage

### Local Mode (CLI)

```typescript
import { OpenCodeProvider } from '@openfarm/provider-opencode';

const provider = new OpenCodeProvider({
  mode: 'local',
  timeout: 600000
});

const result = await provider.execute({
  task: 'Fix the bug in user authentication',
  workspace: '/path/to/project'
});
```

### Cloud Mode (HTTP)

```typescript
import { OpenCodeProvider } from '@openfarm/provider-opencode';

const provider = new OpenCodeProvider({
  mode: 'cloud',
  baseUrl: 'https://api.opencode.ai',
  password: 'your-api-key',
  timeout: 600000
});

const result = await provider.execute({
  task: 'Implement user registration feature',
  model: 'claude-3-5-sonnet-20241022'
});
```

## Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `mode` | `'local' \| 'cloud'` | `'local'` | Execution mode |
| `baseUrl` | `string` | - | Base URL for cloud mode (required for cloud) |
| `password` | `string` | - | API password for cloud mode |
| `timeout` | `number` | `600000` | Timeout in milliseconds |

## Features

- **Dual Mode Support**: Works with both local OpenCode CLI and cloud API
- **Real-time Streaming**: Live progress updates during execution
- **Token Usage Tracking**: Detailed token consumption metrics
- **File Change Tracking**: Monitors created and modified files
- **Error Handling**: Comprehensive error reporting and recovery
- **Type Safety**: Full TypeScript support with strict typing

## License

MIT