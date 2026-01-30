# @openfarm/provider-claude

Claude Code provider for OpenFarm - Anthropic's Claude AI with advanced code editing capabilities.

## Installation

```bash
npm install @openfarm/provider-claude
```

**Prerequisites**: Claude Code CLI must be installed on your system:
```bash
npm install -g @anthropic-ai/claude-code
```

## Usage

```typescript
import { ClaudeProvider } from '@openfarm/provider-claude';

const provider = new ClaudeProvider({
  timeout: 600000
});

const result = await provider.execute({
  task: 'Refactor this component to use React hooks',
  workspace: '/path/to/project',
  model: 'claude-3-5-sonnet-20241022',
  verbose: true
});
```

## Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `timeout` | `number` | `600000` | Timeout in milliseconds |

## Features

- **Advanced Code Understanding**: Claude's superior code comprehension and editing
- **Multiple Tools**: Read, Edit, Write, Bash, Glob, Grep, LS, Task, URLFetch
- **Raw Output**: Preserves Claude's formatted output including markdown
- **Verbose Mode**: Detailed tracing and debugging information
- **Model Selection**: Support for different Claude model variants
- **Type Safety**: Full TypeScript support with strict typing

## Supported Models

- `claude-3-5-sonnet-20241022` (recommended)
- `claude-3-5-haiku-20241022`
- `claude-3-opus-20240229`
- `claude-3-sonnet-20240229`
- `claude-3-haiku-20240307`

## Requirements

- Node.js 18+
- Claude Code CLI (`npm install -g @anthropic-ai/claude-code`)
- Valid Anthropic API key configured in Claude CLI

## License

MIT