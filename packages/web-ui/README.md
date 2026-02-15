# @openfarm/web-ui

Web UI components for OpenFarm.

## Features

- **PTY Bridge**: Connects web interface to terminal processes
- **WebSocket Server**: Real-time communication
- **Configuration**: Network and security settings

## Quick Start

```bash
cd packages/web-ui
bun install
bun run dev  # Starts development server
```

## Usage

```typescript
import { startWebServer, PtyManager } from '@openfarm/web-ui';

// Start web server
const server = startWebServer({
  port: 3000,
  host: 'localhost'
});

// Create PTY manager
const pty = new PtyManager({
  command: 'bun',
  args: ['run', 'tui'],
  cols: 120,
  rows: 40
});
```

## Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `port` | `number` | `3000` | Server port |
| `host` | `string` | `'localhost'` | Server host |
| `token` | `string` | `undefined` | Security token |

## Architecture

- **WebSocket**: Real-time bidirectional communication
- **PTY**: Terminal process management
- **Bridge**: C++ bridge for performance
