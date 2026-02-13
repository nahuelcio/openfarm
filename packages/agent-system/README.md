# @openfarm/agent-system

Unified agent system for OpenFarm.

## What it provides
- Agent plugin interfaces and a shared base implementation
- Execution runtimes (local, worktree, kubernetes, docker)
- Built-in agents for OpenCode and Claude Code
- Registry for agent discovery/registration

## Usage
```ts
import {
  AgentRegistry,
  LocalRuntime,
  registerBuiltinAgents,
} from "@openfarm/agent-system";

const registry = AgentRegistry.getInstance();
registerBuiltinAgents(registry);

const agent = registry.createInstance("opencode");
await agent?.initialize({ runtime: new LocalRuntime() });

const handle = agent?.execute("Update README", {
  cwd: "/path/to/repo",
  model: "opencode/grok-code-fast-1",
});

const result = await handle?.promise;
```
