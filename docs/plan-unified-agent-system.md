# Plan: Sistema Unificado de Agentes - OpenFarm

## Estado Actual (Diagnostico)

### Problemas Detectados

**1. Interface `CodingEngine` demasiado delgada**
```typescript
// Actual - packages/core/src/types/adapters.ts
interface CodingEngine {
  applyChanges(instruction, repoPath, contextFiles?): Promise<Result<ChangesSummary>>;
  getName(): string;
  getSupportedModels(): Promise<string[]>;
  cancelExecution?(executionId): Promise<Result<void>>;
}
```
- Sin lifecycle management (init, dispose, detect)
- Sin streaming de output
- Sin interruption handling
- Sin validacion de modelos
- Sin deteccion de rate limits

**2. Cada engine re-implementa logica de spawn/proceso**
- `claude-code-process.ts` (679 lineas) - spawn propio, parsing propio, Docker/K8s propio
- `opencode-process.ts` - spawn propio, parsing propio
- `external-agent/index.ts` - TmuxWrapper, parsing propio
- Duplicacion masiva de: stdout buffering, error handling, exit code detection

**3. Acoplamiento Claude Code <-> Docker/K8s**
- `claude-code-process.ts` mezcla: CLI args + Docker args + Kubectl args + network detection
- Container discovery hardcodeado (`minions-farm-claude-code-1`)
- Validacion de K8s en el mismo archivo que el parsing de JSONL

**4. External Agent incompleto**
- `setTimeout(resolve, 5000)` como deteccion de completion (!)
- Sin streaming real, sin deteccion de fin de proceso
- Sin soporte para Docker/K8s

**5. Sin sistema de plugins, sin registry**
- Factory es un `switch/case` de 4 opciones
- No hay forma de que un usuario agregue su propio agente
- No hay auto-deteccion de agentes disponibles

**6. Sin rate limit handling ni fallback**
- Si Claude falla por rate limit, la ejecucion falla
- No hay switch automatico a otro agente
- No hay exponential backoff

---

## Arquitectura Propuesta

### Vision General

```
@openfarm/agent-system (nuevo paquete, reemplaza coding-engines)
  |
  +-- core/
  |     types.ts          # AgentPlugin, AgentRegistry, ExecutionHandle
  |     base-agent.ts     # BaseAgentPlugin (logica comun de spawn)
  |     registry.ts       # AgentRegistry singleton
  |     index.ts          # Public API
  |
  +-- runtime/
  |     local.ts          # Ejecutor local (spawn directo)
  |     docker.ts         # Ejecutor Docker (exec / run)
  |     kubernetes.ts     # Ejecutor Kubernetes (kubectl exec)
  |     worktree.ts       # Ejecutor en git worktree
  |     runtime.ts        # Interface + factory
  |
  +-- agents/
  |     claude-code.ts    # AgentPlugin para Claude Code CLI
  |     opencode.ts       # AgentPlugin para OpenCode CLI
  |     aider.ts          # AgentPlugin para Aider CLI
  |     generic-cli.ts    # AgentPlugin generico (reemplaza external-agent)
  |
  +-- tracing/
  |     parser.ts         # Subagent trace parser (JSONL, etc)
  |     types.ts          # SubagentEvent, SubagentState
  |
  +-- resilience/
        rate-limit.ts     # Rate limit detection
        fallback.ts       # Fallback agent switching
        retry.ts          # Exponential backoff
```

### Separacion de Responsabilidades

```
AgentPlugin          = QUE agente usar (claude, opencode, aider)
  buildArgs()        - Construye CLI args especificos del agente
  parseOutput()      - Parsea output especifico del agente
  validateModel()    - Valida modelos del agente

ExecutionRuntime     = DONDE ejecutar (local, docker, k8s, worktree)
  spawn()            - Ejecuta proceso en el runtime
  detectAvailable()  - Detecta si el runtime esta disponible
  getWorkDir()       - Resuelve el working directory

ExecutionEngine      = COMO orquestar (lifecycle, retry, fallback)
  execute()          - Orquesta: runtime.spawn(agent.buildArgs())
  handleRateLimit()  - Deteccion + backoff + fallback
  traceSubagents()   - Parsing de subagentes
```

---

## Fase 1: Core Types + BaseAgent

### 1.1 `AgentPlugin` Interface

```typescript
// @openfarm/agent-system/src/core/types.ts

export interface AgentPluginMeta {
  id: string;                    // 'claude-code' | 'opencode' | 'aider' | custom
  name: string;                  // Human-readable
  description: string;
  version: string;
  defaultCommand: string;        // 'claude' | 'opencode' | 'aider'
  supportsStreaming: boolean;
  supportsInterrupt: boolean;
  supportsFileContext: boolean;
  supportsSubagentTracing: boolean;
  structuredOutputFormat?: 'json' | 'jsonl';
}

export interface AgentDetectResult {
  available: boolean;
  version?: string;
  executablePath?: string;
  error?: string;
}

export interface AgentExecutionResult {
  executionId: string;
  status: 'completed' | 'failed' | 'interrupted' | 'timeout';
  exitCode?: number;
  stdout: string;
  stderr: string;
  durationMs: number;
  error?: string;
  // OpenFarm extras (por encima de ralph-tui)
  changes?: ChangesSummary;
  cost?: { inputTokens?: number; outputTokens?: number; totalUSD?: number };
}

export interface AgentExecuteOptions {
  cwd?: string;
  timeout?: number;              // 0 = sin timeout
  env?: Record<string, string>;
  flags?: string[];
  model?: string;
  contextFiles?: string[];
  // Callbacks para streaming
  onStdout?: (data: string) => void;
  onStderr?: (data: string) => void;
  onStart?: (executionId: string) => void;
  onEnd?: (result: AgentExecutionResult) => void;
  // OpenFarm extras
  onChanges?: (changes: ChangesSummary) => void;
  onLog?: (message: string) => void;
  subagentTracing?: boolean;
}

export interface AgentExecutionHandle {
  executionId: string;
  promise: Promise<AgentExecutionResult>;
  interrupt(): void;
  isRunning(): boolean;
}

export interface AgentPlugin {
  readonly meta: AgentPluginMeta;

  initialize(config: Record<string, unknown>): Promise<void>;
  isReady(): Promise<boolean>;
  detect(): Promise<AgentDetectResult>;

  execute(
    prompt: string,
    options?: AgentExecuteOptions
  ): AgentExecutionHandle;

  interrupt(executionId: string): boolean;
  interruptAll(): void;
  getCurrentExecution(): AgentExecutionHandle | undefined;
  validateModel(model: string): string | null;
  dispose(): Promise<void>;
}
```

### 1.2 `BaseAgentPlugin` Abstract Class

Logica comun extraida de las 3 implementaciones actuales:

```typescript
// @openfarm/agent-system/src/core/base-agent.ts

export abstract class BaseAgentPlugin implements AgentPlugin {
  abstract readonly meta: AgentPluginMeta;

  protected config: Record<string, unknown> = {};
  protected ready = false;
  protected commandPath?: string;
  private executions: Map<string, RunningExecution> = new Map();

  // Template methods que cada agente implementa:
  protected abstract buildArgs(prompt: string, options?: AgentExecuteOptions): string[];
  protected abstract parseOutput(stdout: string): AgentExecutionResult['changes'];

  // Opcionalmente overrideable
  protected getStdinInput(prompt: string): string | undefined { return undefined; }
  protected getCommand(): string { return this.commandPath ?? this.meta.defaultCommand; }

  // Logica comun de spawn (extraida de los 3 engines actuales)
  execute(prompt: string, options?: AgentExecuteOptions): AgentExecutionHandle {
    // spawn, stdout/stderr buffering, exit handling, timeout
    // Identico patron para TODOS los agentes
  }

  async detect(): Promise<AgentDetectResult> {
    // which/where + --version (comun a todos)
  }

  interrupt(executionId: string): boolean { /* SIGTERM + SIGKILL fallback */ }
  interruptAll(): void { /* for each execution */ }
  // ...
}
```

**Beneficio**: Las ~679 lineas de `claude-code-process.ts` + las ~260 de `opencode-process.ts` + las ~165 de `external-agent/index.ts` se reducen a:
- `base-agent.ts` (~250 lineas, logica comun)
- `claude-code.ts` (~120 lineas, solo buildArgs + parseOutput)
- `opencode.ts` (~80 lineas, solo buildArgs + parseOutput)
- `aider.ts` (~60 lineas, solo buildArgs)
- `generic-cli.ts` (~40 lineas, CLI generico)

### 1.3 `AgentRegistry`

```typescript
// @openfarm/agent-system/src/core/registry.ts

export class AgentRegistry {
  private static instance: AgentRegistry | null = null;
  private plugins: Map<string, RegisteredPlugin> = new Map();

  // Builtin agents
  registerBuiltin(factory: AgentPluginFactory): void;

  // User agents desde ~/.config/openfarm/plugins/agents/
  async discoverUserPlugins(): Promise<PluginLoadResult[]>;

  // Auto-detect: escanea cuales estan instalados
  async detectAvailableAgents(): Promise<AgentDetectResult[]>;

  // Crear/obtener instancias
  createInstance(pluginId: string): AgentPlugin | undefined;
  async getInstance(config: AgentPluginConfig): Promise<AgentPlugin>;

  getRegisteredPlugins(): AgentPluginMeta[];
  hasPlugin(pluginId: string): boolean;
}
```

---

## Fase 2: Execution Runtimes

La clave de la consolidacion: separar DONDE se ejecuta del QUE se ejecuta.

### 2.1 `ExecutionRuntime` Interface

```typescript
// @openfarm/agent-system/src/runtime/runtime.ts

export interface ExecutionRuntimeConfig {
  type: 'local' | 'docker' | 'kubernetes' | 'worktree';
  // Docker
  containerName?: string;
  imageName?: string;
  network?: string;
  volumes?: string[];
  ephemeral?: boolean;
  // Kubernetes
  podName?: string;
  namespace?: string;
  container?: string;
  // Worktree
  worktreePath?: string;
  baseBranch?: string;
}

export interface RuntimeSpawnOptions {
  command: string;
  args: string[];
  cwd?: string;
  env?: Record<string, string>;
  stdin?: string;
}

export interface ExecutionRuntime {
  readonly type: ExecutionRuntimeConfig['type'];

  detectAvailable(): Promise<boolean>;
  resolveWorkDir(repoPath: string): string;

  spawn(options: RuntimeSpawnOptions): ChildProcess;
  buildCommand(options: RuntimeSpawnOptions): { command: string; args: string[] };
}
```

### 2.2 Implementaciones

```typescript
// local.ts - Ejecucion directa
export class LocalRuntime implements ExecutionRuntime {
  spawn(options) {
    return child_process.spawn(options.command, options.args, {
      cwd: options.cwd,
      env: { ...process.env, ...options.env },
      stdio: ['pipe', 'pipe', 'pipe'],
    });
  }
}

// docker.ts - Docker exec/run
export class DockerRuntime implements ExecutionRuntime {
  async detectAvailable() {
    // docker ps, container inspect, etc.
  }

  spawn(options) {
    if (this.config.ephemeral) {
      // docker run --rm ...
    } else {
      // docker exec <container> ...
    }
  }

  resolveWorkDir(repoPath) {
    return `/workspace/${path.basename(repoPath)}`;
  }
}

// kubernetes.ts - kubectl exec
export class KubernetesRuntime implements ExecutionRuntime {
  spawn(options) {
    // kubectl exec <pod> -n <ns> -c <container> -- ...
  }
}

// worktree.ts - git worktree
export class WorktreeRuntime implements ExecutionRuntime {
  async detectAvailable() {
    // git worktree list
  }

  spawn(options) {
    // Crea worktree si no existe, ejecuta en ese path
  }

  resolveWorkDir(repoPath) {
    return this.worktreePath;
  }
}
```

**Beneficio**: `claude-code-process.ts` tiene ~200 lineas de logica Docker y ~30 de Kubernetes mezcladas con el parsing. Con esta separacion:
- `docker.ts` (~100 lineas) - reutilizable por CUALQUIER agente
- `kubernetes.ts` (~50 lineas) - reutilizable por CUALQUIER agente
- `worktree.ts` (~80 lineas) - NUEVO, permite worktrees para parallelismo

---

## Fase 3: Agent Implementations

### 3.1 Claude Code Agent

```typescript
// @openfarm/agent-system/src/agents/claude-code.ts

export class ClaudeCodeAgent extends BaseAgentPlugin {
  readonly meta: AgentPluginMeta = {
    id: 'claude-code',
    name: 'Claude Code',
    defaultCommand: 'claude',
    supportsStreaming: true,
    supportsInterrupt: true,
    supportsFileContext: true,
    supportsSubagentTracing: true,
    structuredOutputFormat: 'jsonl',
    // ...
  };

  protected buildArgs(prompt: string, options?: AgentExecuteOptions): string[] {
    const args = ['--print', '--verbose', '--output-format', 'stream-json'];
    if (options?.model) args.push('--model', options.model);
    if (this.skipPermissions) args.push('--dangerously-skip-permissions');
    // Ya NO tiene logica de Docker/K8s - eso es del Runtime
    return args;
  }

  // Prompt via stdin en vez de args (evita shell interpretation)
  protected getStdinInput(prompt: string) { return prompt; }

  protected parseOutput(stdout: string) {
    // Parse JSONL stream events -> ChangesSummary
    // Extraido de handleStreamEvent() actual
  }
}
```

### 3.2 OpenCode Agent

```typescript
// @openfarm/agent-system/src/agents/opencode.ts

export class OpenCodeAgent extends BaseAgentPlugin {
  readonly meta: AgentPluginMeta = {
    id: 'opencode',
    name: 'OpenCode',
    defaultCommand: 'opencode',
    supportsStreaming: true,
    supportsInterrupt: true,
    supportsFileContext: true,
    supportsSubagentTracing: false,
    // ...
  };

  protected buildArgs(prompt: string, options?: AgentExecuteOptions): string[] {
    const args = ['run'];
    if (this.agent !== 'general') args.push('--agent', this.agent);
    if (options?.model) args.push('--model', options.model);
    if (options?.contextFiles) {
      for (const file of options.contextFiles) {
        args.push('--file', file);
      }
    }
    return args;
  }

  protected getStdinInput(prompt: string) { return prompt; }
}
```

### 3.3 Aider Agent (nuevo, first-class)

```typescript
// @openfarm/agent-system/src/agents/aider.ts

export class AiderAgent extends BaseAgentPlugin {
  readonly meta: AgentPluginMeta = {
    id: 'aider',
    name: 'Aider',
    defaultCommand: 'aider',
    supportsStreaming: true,
    supportsInterrupt: true,
    supportsFileContext: true,
    supportsSubagentTracing: false,
    // ...
  };

  protected buildArgs(prompt: string, options?: AgentExecuteOptions): string[] {
    const args = ['--yes-always', '--no-git'];  // Non-interactive
    if (options?.model) args.push('--model', options.model);
    if (options?.contextFiles) {
      args.push(...options.contextFiles);
    }
    args.push('--message', prompt);
    return args;
  }
}
```

### 3.4 Generic CLI Agent (reemplaza ExternalAgentCodingEngine)

```typescript
// @openfarm/agent-system/src/agents/generic-cli.ts

export class GenericCliAgent extends BaseAgentPlugin {
  constructor(private cliConfig: { cli: string; args?: string[] }) {
    super();
  }

  readonly meta: AgentPluginMeta = {
    id: 'generic-cli',
    name: 'Generic CLI',
    defaultCommand: this.cliConfig.cli,
    supportsStreaming: true,
    supportsInterrupt: true,
    supportsFileContext: false,
    supportsSubagentTracing: false,
  };

  protected buildArgs(prompt: string): string[] {
    return [...(this.cliConfig.args || [])];
  }

  protected getStdinInput(prompt: string) { return prompt; }
}
```

---

## Fase 4: Resilience Layer

### 4.1 Rate Limit Detection

```typescript
// @openfarm/agent-system/src/resilience/rate-limit.ts

export class RateLimitDetector {
  detect(input: { stdout: string; stderr: string; exitCode?: number; agentId: string }): {
    isRateLimit: boolean;
    retryAfter?: number;      // Segundos
    message?: string;
  };
}
```

### 4.2 Fallback Agent Switching

```typescript
// @openfarm/agent-system/src/resilience/fallback.ts

export interface FallbackConfig {
  primaryAgent: string;
  fallbackAgents: string[];          // Ordenados por prioridad
  maxRetries: number;
  baseBackoffMs: number;
  recoverPrimaryBetweenIterations: boolean;
}

export class AgentFallbackManager {
  constructor(config: FallbackConfig, registry: AgentRegistry);

  async getActiveAgent(): Promise<AgentPlugin>;
  markRateLimited(agentId: string): void;
  async tryFallback(): Promise<{ switched: boolean; agent?: AgentPlugin }>;
  async attemptPrimaryRecovery(): Promise<boolean>;
}
```

---

## Fase 5: Backward Compatibility + Migration

### 5.1 Adapter para `CodingEngine` existente

Para no romper el API actual mientras se migra:

```typescript
// @openfarm/agent-system/src/compat/coding-engine-adapter.ts

/**
 * Adapta el nuevo AgentPlugin al viejo CodingEngine interface.
 * Permite migrar gradualmente sin romper consumers existentes.
 */
export class AgentToCodingEngineAdapter implements CodingEngine {
  constructor(
    private agent: AgentPlugin,
    private runtime: ExecutionRuntime
  ) {}

  async applyChanges(instruction, repoPath, contextFiles?): Promise<Result<ChangesSummary>> {
    const handle = this.agent.execute(instruction, {
      cwd: this.runtime.resolveWorkDir(repoPath),
      contextFiles,
    });
    const result = await handle.promise;
    if (result.status === 'completed') {
      return ok(result.changes || { summary: result.stdout });
    }
    return err(new Error(result.error || 'Agent execution failed'));
  }

  getName() { return this.agent.meta.name; }
  getSupportedModels() { return Promise.resolve([]); }
}
```

### 5.2 Factory actualizado

```typescript
// @openfarm/agent-system/src/factory.ts

export function createAgent(config: {
  agent: string;           // 'claude-code' | 'opencode' | 'aider' | 'generic-cli'
  runtime?: string;        // 'local' | 'docker' | 'kubernetes' | 'worktree'
  // ...options
}): { agent: AgentPlugin; runtime: ExecutionRuntime } {
  const registry = AgentRegistry.getInstance();
  const agent = registry.createInstance(config.agent);
  const runtime = createRuntime(config.runtime || 'local', config);
  return { agent, runtime };
}

// Backward compat
export function createCodingEngine(options: CodingEngineFactoryOptions): CodingEngine {
  const { agent, runtime } = createAgent({
    agent: mapProviderToAgent(options.provider),
    runtime: detectRuntime(options),
  });
  return new AgentToCodingEngineAdapter(agent, runtime);
}
```

---

## Plan de Ejecucion

### Etapa 1: Foundation (Core Types)
- [ ] Crear `@openfarm/agent-system` package
- [ ] Definir `AgentPlugin`, `AgentPluginMeta`, `AgentExecutionResult` interfaces
- [ ] Implementar `BaseAgentPlugin` con logica comun de spawn
- [ ] Implementar `AgentRegistry` con registro y discovery
- [ ] Tests unitarios para BaseAgentPlugin y Registry

### Etapa 2: Runtime Separation
- [ ] Definir `ExecutionRuntime` interface
- [ ] Implementar `LocalRuntime`
- [ ] Extraer logica Docker de `claude-code-process.ts` a `DockerRuntime`
- [ ] Extraer logica K8s de `claude-code-process.ts` a `KubernetesRuntime`
- [ ] Implementar `WorktreeRuntime` (nuevo)
- [ ] Tests para cada runtime

### Etapa 3: Agent Implementations
- [ ] Implementar `ClaudeCodeAgent` (extraer de `claude-code/`)
- [ ] Implementar `OpenCodeAgent` (extraer de `opencode/`)
- [ ] Implementar `AiderAgent` (nuevo, first-class)
- [ ] Implementar `GenericCliAgent` (reemplaza external-agent)
- [ ] Registrar builtins en el registry

### Etapa 4: Resilience
- [ ] Implementar `RateLimitDetector`
- [ ] Implementar `AgentFallbackManager`
- [ ] Implementar exponential backoff con retry
- [ ] Tests de resilience

### Etapa 5: Migration + Integration
- [ ] Crear `AgentToCodingEngineAdapter` para backward compat
- [ ] Actualizar `createCodingEngine()` factory
- [ ] Migrar consumers de `CodingEngine` al nuevo sistema
- [x] Deprecar `@openfarm/coding-engines`
- [ ] Actualizar TUI para usar nuevo sistema
- [ ] Integration tests end-to-end

---

## Comparacion: Antes vs Despues

| Aspecto | Antes | Despues |
|---------|-------|---------|
| **Agregar agente** | Crear paquete, implementar 300+ lineas | Extender BaseAgentPlugin, ~60 lineas |
| **Usar en Docker** | Solo Claude Code lo soporta | Cualquier agente + DockerRuntime |
| **Usar en K8s** | Solo Claude Code lo soporta | Cualquier agente + KubernetesRuntime |
| **Worktrees** | No soportado | WorktreeRuntime para cualquier agente |
| **Rate limits** | Falla y muere | Backoff + fallback automatico |
| **Custom agent** | No posible | `~/.config/openfarm/plugins/agents/` |
| **Lineas de codigo** | ~1100 (3 engines) | ~600 (base + 4 agents + 4 runtimes) |
| **Duplicacion** | Alta (spawn x3, parsing x3) | Cero (BaseAgentPlugin) |

## Diagrama de Flujo Final

```
Usuario configura:
  agent: "claude-code"
  runtime: "docker"
  fallback: ["opencode", "aider"]

                    AgentRegistry
                    /     |      \
            claude-code  opencode  aider
                    \     |      /
                     BaseAgentPlugin
                     (spawn comun)
                          |
                    ExecutionRuntime
                    /    |    |    \
                local  docker  k8s  worktree
                          |
                  AgentFallbackManager
                  (rate limit -> switch)
                          |
                  AgentExecutionResult
                  (changes, cost, duration)
```

---

## Notas de Diseno

1. **No over-engineer**: El GenericCliAgent cubre el 90% de "quiero usar X CLI". No hace falta un plugin system con hot-reload para el MVP.

2. **Runtime como composicion, no herencia**: Un ClaudeCodeAgent no "sabe" de Docker. El Runtime wrappea la ejecucion. Esto permite `claude-code + worktree` o `aider + kubernetes` sin cambios.

3. **Backward compat via Adapter**: El `AgentToCodingEngineAdapter` permite migrar gradualmente. Los consumers existentes siguen funcionando con `createCodingEngine()`.

4. **Inspiracion de Ralph, no copia**: Ralph tiene un engine monolitico de ~4500 lineas. OpenFarm mantiene la separacion modular pero adopta las interfaces limpias (`AgentPlugin`, `AgentRegistry`, `BaseAgentPlugin`).
