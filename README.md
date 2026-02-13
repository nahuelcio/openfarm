# OpenFarm

[![CI](https://github.com/openfarm/openfarm/actions/workflows/ci-oss.yml/badge.svg)](https://github.com/openfarm/openfarm/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![npm](https://img.shields.io/npm/v/@openfarm/sdk)](https://www.npmjs.com/package/@openfarm/sdk)

OpenFarm is an AI-powered code editing platform. This repository contains the open source code (SDK, TUI, and libraries).

## 📦 Packages

| Package | Description | NPM |
|---------|-------------|-----|
| `@openfarm/sdk` | Main SDK for integration | [![npm](https://img.shields.io/npm/v/@openfarm/sdk)](https://www.npmjs.com/package/@openfarm/sdk) |
| `@openfarm/agent-runner` | Agent execution with multiple engines | [![npm](https://img.shields.io/npm/v/@openfarm/agent-runner)](https://www.npmjs.com/package/@openfarm/agent-runner) |
| `@openfarm/workflow-engine` | Workflow orchestration | [![npm](https://img.shields.io/npm/v/@openfarm/workflow-engine)](https://www.npmjs.com/package/@openfarm/workflow-engine) |
| `@openfarm/core` | Core types and database | [![npm](https://img.shields.io/npm/v/@openfarm/core)](https://www.npmjs.com/package/@openfarm/core) |

## 🚀 Installation

```bash
npm install @openfarm/sdk
```

## 📝 Usage

### Programmatic API

```typescript
import { OpenFarm } from '@openfarm/sdk'

const client = new OpenFarm({
  provider: 'anthropic',
  apiKey: process.env.ANTHROPIC_API_KEY
})

const result = await client.execute({
  task: 'Fix the authentication bug',
  repo: './my-project'
})

console.log(result.diff)
```

## 🖥️ Terminal UI (TUI) - Legacy

The TUI is now in legacy mode and receives only critical fixes. For new workflows, use OpenFarm Desktop (`openfarm-desktop/`).
Migration timeline: `docs/desktop-migration-window.md`.

### Running the Legacy TUI

From the project root (after `bun install`):

```bash
OPENFARM_ENABLE_LEGACY_TUI=1 bun run tui
```

Or using npx without installation:

```bash
npx @openfarm/sdk tui --legacy-tui
```

Or run directly:

```bash
bun run packages/sdk/src/tui/index.tsx
```

### Features

- **Interactive Execution** - Execute AI coding tasks with multiple providers
- **Multiple Providers** - Choose between OpenCode, Claude Code, and Aider
- **Execution History** - All executions saved to local SQLite database
- **Diff Viewer** - View code changes with syntax highlighting
- **Real-time Streaming** - Watch logs and token usage update live
- **Smart Error Handling** - Categorized errors with actionable suggestions
- **Workflow Management** - View, edit, and select predefined workflows
- **Context Generator** - Generate project context for better AI understanding

### Navigation

- **↑/↓ Arrows** - Navigate options and history
- **Enter** - Select/Confirm
- **Esc** - Go back/Cancel
- **Tab** - Switch between sections (where applicable)

### Providers

The TUI supports multiple AI coding providers:

- **OpenCode** - Default provider, optimized for coding tasks
- **Claude Code** - Anthropic's Claude with coding capabilities
- **Aider** - Open source AI pair programmer

### Configuration

Set API keys via environment variables:

```bash
# Anthropic API key (for Claude Code)
export ANTHROPIC_API_KEY=sk-ant-...

# OpenAI API key (for some providers)
export OPENAI_API_KEY=sk-...

# Database path (optional, defaults to ./db.db)
export DB_PATH=/path/to/openfarm.db
```

### Execution History

All executions are automatically saved to a local SQLite database including:
- Full execution logs
- Token usage and costs
- Git diffs of all changes
- Error details with suggestions
- Duration and performance metrics

Access history from the main menu to review past runs, view diffs, and learn from previous executions.

### Workflow Types

Available workflows:
- **task_runner** (default) - Creates branch → Sets up worktree → Executes → Cleans up
- **simple** - Direct execution in current directory
- Custom workflows can be added via YAML files in `packages/core/workflows`

### Tips

- Use the **Context Generator** before complex tasks to improve AI understanding
- Press **Enter** on any execution in History to view the diff
- Check execution history to debug failed runs with categorized error messages
- The diff viewer shows file-by-file changes with additions/deletions highlighted

## 🏗️ Development

```bash
# Install dependencies
bun install

# Build
bun run build

# Tests
bun run test

# Lint
bun run lint
```

## 📄 License

MIT - See [LICENSE](LICENSE)

## 🤝 Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md)
