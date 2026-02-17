# Project Overview
The OpenFarm SDK provides a unified interface for AI-powered code execution across multiple providers. It allows developers to integrate AI coding assistants into their applications through a consistent, modular API. The SDK handles provider discovery, lazy loading, and standardized execution flows, supporting providers such as Claude Code, OpenCode, and external CLI agents (for example Codex).

# Tech Stack
- **Language**: TypeScript (ES2022)
- **Runtime**: Bun (Primary) / Node.js
- **CLI Framework**: OpenTUI (React-based TUI - proprietary library)
- **State Management**: Zustand (TUI state)
- **Database**: SQLite (via `@openfarm/core` and `better-sqlite3`)
- **Build Tools**: `tsup` (esbuild), `typescript`
- **Testing**: `vitest`, `fast-check` (property-based testing)
- **Linting/Formatting**: Biome
- **Key Libraries**: `zod` (validation), `pino` (logging), `ai` (Vercel AI SDK), `chalk`

# Architecture
The SDK follows a modular, extensible architecture designed for high performance and testability.

### Core Components
- **Provider Registry**: Manages discovery, registration, and instantiation of providers. Supports lazy loading of external provider packages.
- **Provider System**: Uses the Template Method pattern via `BaseProvider` to enforce a consistent execution lifecycle (Validate -> Prepare -> Execute -> Parse -> Format).
- **Communication Strategies**: Reusable interaction patterns including `HttpStrategy` for API calls and `CliStrategy` for wrapping CLI-based tools.
- **Response Parsers**: Standardized parsing for different AI outputs (JSON, streaming, etc.).
- **TUI Layer**: A React-based terminal interface built with OpenTUI for interactive task execution and history management.

### Directory Structure
```
src/
├── provider-system/ # Core provider registry and base classes
├── providers/       # Built-in providers (e.g., external-agent)
├── strategies/      # Communication patterns (HTTP, CLI)
├── parsers/         # Response format handlers
├── tui/             # OpenTUI-based terminal interface components
├── utils/           # Shared utilities (logger, etc.)
├── types.ts         # Global type definitions
├── open-farm.ts     # Main OpenFarm class (Primary Entry Point)
├── cli.ts           # CLI entry point
└── index.ts         # Library exports
```

# Development Workflow

### Setup
```bash
bun install
bun run build
```

### Common Commands
```bash
bun run dev          # Start the interactive TUI
bun run dev:cli      # Start in legacy CLI mode
bun run test         # Run vitest suite
bun run lint         # Run Biome linting/formatting checks
bun run type-check   # Run TypeScript compiler checks
```

### Environment Variables
- `OPENFARM_API_KEY`: Authentication key for providers that need credentials
- `OPENFARM_PROVIDER`: Default provider to use (e.g., `external-agent`, `claude`, `opencode`)
- `OPENFARM_MODEL`: Default model identifier

# Code Conventions

### File Naming
- All files must use `kebab-case` (enforced by Biome).
- Test files must be named `*.test.ts` and typically reside in `__tests__` directories within their respective modules.

### Code Style
- **Naming**: Functions and variables use `camelCase`, classes use `PascalCase`, constants use `UPPER_SNAKE_CASE`.
- **Types**: Strict TypeScript mode is enabled. Avoid `any`; use `unknown` or specific interfaces.
- **Async**: Prefer `async/await` over raw Promises.
- **Exports**: Use named exports for better discoverability and tree-shaking.

### Testing Patterns
- **Unit Tests**: Focus on individual components using Vitest.
- **Property-Based Testing**: Use `fast-check` for core logic like registry validation and configuration management.
- **Integration Tests**: Verify end-to-end provider execution flows.
- **Mocks**: Use `ProviderTestUtils` for creating isolated registries and mock providers.

# Key Files & Directories

- `src/open-farm.ts`: The main class used by consumers to execute tasks.
- `src/provider-system/registry.ts`: Central hub for provider discovery and lifecycle.
- `src/provider-system/base-provider.ts`: The contract and base implementation for all providers.
- `src/tui/store.ts`: Zustand store managing terminal UI state and database persistence.
- `tsup.config.ts`: Build configuration for bundling the SDK and CLI.

# Common Patterns

### Creating a New Provider
1. Create a new package `@openfarm/provider-name`.
2. Implement a class extending `BaseProvider`.
3. Create a `ProviderFactory` to instantiate the provider.
4. Export the factory from the package.
5. Register it in the `ProviderRegistry` (automatically handled via discovery).

### API Execution Flow
```typescript
const openFarm = new OpenFarm({ defaultProvider: 'claude' });
const result = await openFarm.execute({
  task: "Implement feature X",
  workspace: "./my-project"
});
```

### Error Handling
The SDK uses standardized `ProviderError` types. All errors are normalized in the `BaseProvider.handleError` method to ensure consistent `ExecutionResult` structures.

# Critical Rules & Gotchas

- **Lazy Loading**: Most providers are lazy-loaded. Use `createProviderAsync` when interacting directly with the registry.
- **Surgical Changes**: When modifying core logic in `provider-system`, ensure `lsp_diagnostics` are clean and property tests pass.
- **Package Bloat**: Keep the core SDK lean. New providers should be created as separate packages in the `@openfarm/` scope.
- **Case Sensitivity**: Be careful with file naming on macOS; Git casing must match the filesystem exactly to pass CI/Biome checks.
- **SQLite Persistence**: TUI executions and contexts are automatically persisted to `db.db` via `@openfarm/core`. Ensure the database is accessible in the working directory.

# External Integrations
- **Claude Code**: Requires provider package `@openfarm/provider-claude`.
- **OpenCode**: Requires provider package `@openfarm/provider-opencode`.
- **Codex**: Use provider `external-agent` with CLI `codex`.
- **Claude Code**: Requires `@anthropic-ai/claude-code` global installation. Package: `@openfarm/provider-claude`
- **OpenCode**: Requires `opencode` CLI installation. Package: `@openfarm/provider-opencode`
