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

## 🖥️ OpenFarm Desktop

OpenFarm Desktop is the modern desktop application for AI-powered code editing. Built with Tauri and React, it provides a native desktop experience with enhanced features and performance.

### Getting Started

Download the latest release from: https://github.com/openfarm/openfarm-app

Or build from source:

```bash
cd openfarm-app
bun install
bun run build
bun run dev
```

### Key Features

- **Native Desktop Experience** - Built with Tauri for performance
- **Modern UI** - React-based interface with TailwindCSS
- **Enhanced Performance** - Faster execution and better resource management
- **Local Development** - Full local development environment
- **Cross-platform** - Windows, macOS, and Linux support

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
