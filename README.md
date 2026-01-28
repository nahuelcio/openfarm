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