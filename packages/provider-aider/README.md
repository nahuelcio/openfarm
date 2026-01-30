# @openfarm/provider-aider

Aider provider for OpenFarm - AI pair programming with your codebase.

## Installation

```bash
npm install @openfarm/provider-aider
```

**Prerequisites**: Aider must be installed on your system:
```bash
pip install aider-chat
```

## Usage

```typescript
import { AiderProvider } from '@openfarm/provider-aider';

const provider = new AiderProvider({
  timeout: 600000
});

const result = await provider.execute({
  task: 'Add error handling to the user service',
  workspace: '/path/to/project',
  model: 'gpt-4o'
});
```

## Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `timeout` | `number` | `600000` | Timeout in milliseconds |

## Features

- **CLI Integration**: Direct integration with Aider CLI tool
- **Real-time Output**: Live progress updates during execution
- **Git Integration**: Automatic git commits and file tracking
- **Model Support**: Works with any model supported by Aider
- **Error Handling**: Comprehensive error reporting and recovery
- **Type Safety**: Full TypeScript support with strict typing

## Supported Models

Aider supports many models including:
- GPT-4o, GPT-4o-mini
- Claude 3.5 Sonnet, Claude 3.5 Haiku
- Gemini Pro
- And many more via Aider's model configuration

## Requirements

- Python 3.8+
- Aider CLI tool (`pip install aider-chat`)
- Git repository (Aider works best with git-tracked files)

## License

MIT