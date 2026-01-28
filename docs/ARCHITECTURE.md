# OpenFarm Architecture

## Overview

OpenFarm is a modular SDK for AI-powered code automation. It separates concerns into independent packages:

```
@openfarm/sdk          Main entry point
  └── @openfarm/agent-runner   Execute agents
      ├── @openfarm/coding-engines  Claude Code, OpenCode
      ├── @openfarm/core          Types, utilities
      └── @openfarm/adapters      Git, GitHub, Azure, etc.
```

## Core Packages

### `@openfarm/sdk`
Public API. What users import.
- `MinionsFarm` class
- Workflow definition
- Results handling

### `@openfarm/agent-runner`
Orchestrates agent execution.
- Manages lifecycle (setup, execute, cleanup)
- Handles multiple engines (Claude Code, OpenCode)
- Error recovery & retries

### `@openfarm/core`
Shared types and utilities.
- Domain types (Task, Result, Workflow)
- Database utilities
- Common functions

### `@openfarm/coding-engines`
Different AI coding providers.
- Claude Code integration
- OpenCode integration
- Engine abstraction

### `@openfarm/adapters`
Platform integrations.
- `git-adapter`: Git operations
- `github-adapter`: GitHub API
- `azure-adapter`: Azure DevOps API

## Design Patterns

### Single Responsibility
Each package does one thing well. No circular dependencies.

### Dependency Flow
```
sdk → agent-runner → core, engines, adapters
      ↓
    (no reverse deps)
```

### Public vs Internal
- `sdk`: Everything public
- `agent-runner`: Mostly public
- `core`: 100% public (shared types)
- Adapters: Public interfaces only

### Error Handling
- Errors propagate up with context
- No silent failures
- User-facing messages in `sdk`

## Development Workflow

1. **Change internal logic** → No version bump needed
2. **Add new public API** → Minor version bump
3. **Breaking public API** → Major version bump

## Testing Strategy

- **Unit tests** (≥80% coverage): Core logic
- **Integration tests**: Adapter functionality
- **E2E tests**: Real workflows (slower, critical paths only)

## Extension Points

Want to extend OpenFarm?

1. **Add new adapter**: Implement `PlatformAdapter` interface
2. **Add new engine**: Implement `CodingEngine` interface
3. **Custom workflows**: Use `Workflow` DSL

## Performance Considerations

- Agents run sequentially by default (safety)
- Can parallelize independent tasks
- Results cached (configurable TTL)
- Retry logic with exponential backoff

---

See [../README.md](../README.md) for high-level overview.
