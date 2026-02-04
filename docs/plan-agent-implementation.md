# Plan de Implementacion: Agent System - Fixes y Features

> Referencia: [ralph-tui](https://github.com/subsy/ralph-tui) `src/plugins/agents/`

---

## 1. Diagnostico: Que esta mal y que falta

### 1.1 BaseAgentPlugin - Bug critico: stdin no se cierra

**Archivo**: `packages/agent-system/src/core/base-agent.ts:286-307`

**Problema**: Cuando `getStdinInput()` retorna `undefined`, stdin queda abierto. Muchos CLIs (opencode, aider) interpretan esto como "esperando input del usuario" y se cuelgan indefinidamente.

**Ralph-tui lo resuelve asi** (`src/plugins/agents/base.ts:247-252`):
```typescript
// Write to stdin if subclass provides input
const stdinInput = this.getStdinInput(prompt, files, options);
if (stdinInput !== undefined && proc.stdin) {
  proc.stdin.write(stdinInput);
  proc.stdin.end();
} else if (proc.stdin) {
  // Close stdin if no input to prevent hanging
  proc.stdin.end();  // <-- SIEMPRE cierra stdin
}
```

**OpenFarm actual** (`base-agent.ts:300-304`):
```typescript
if (options.stdin && child.stdin) {
  child.stdin.write(options.stdin);
  child.stdin.end();
}
// <-- NO cierra stdin si no hay input = HANG
```

**Fix**:
```typescript
if (options.stdin && child.stdin) {
  child.stdin.write(options.stdin);
  child.stdin.end();
} else if (child.stdin) {
  child.stdin.end(); // Prevent hanging on agents waiting for stdin
}
```

---

### 1.2 OpenCode Agent - Funcionalidad perdida

**Archivo**: `packages/agent-system/src/agents/opencode.ts`

**Lo que tenia el viejo `opencode-process.ts` (390 lineas) y se perdio:**

| Feature | Viejo | Nuevo (112 lineas) | Ralph-tui |
|---------|-------|---------------------|-----------|
| Metadata filtering | No | No | Si - `filterOpenCodeMetadata()` con regex patterns |
| Cost tracking | `step_finish.cost` | No | No (opencode no emite cost) |
| Logging rico | `Reading:`, `Modified:`, `Executed:` | Solo `tool_use` generico | Via `onStdout` |
| Timeout configurable | `config.timeoutMs ?? 30*60*1000` | Hereda de BaseAgent pero nadie lo pasa | Via `defaultTimeout` override |
| CancellationToken | Si | No | Via `interrupt()` |
| Input validation | `validateInstruction()` | No | No |
| Metrics | `metrics.increment/histogram` | No | No |
| Agent type selection | No | No | Si - `--agent general/build/plan` |
| Output format | `--format json` | `--format json` | `--format default/json` |
| Provider config | No | No | Si - provider/model format |
| Setup questions | No | No | Si - provider, model, agent, format |
| Model validation | No | `validateModel()` retorna null siempre | Si - acepta provider/model |
| Prompt via stdin | No (via args) | No (via args) | Si - `getStdinInput()` |

---

### 1.3 Claude Code Agent - Incompleto

**Archivo**: `packages/agent-system/src/agents/claude-code.ts`

| Feature | Viejo `claude-code-process.ts` | Nuevo (121 lineas) | Ralph-tui |
|---------|-------------------------------|---------------------|-----------|
| JSONL streaming parser | Basico inline | Basico en `parseOutput()` | `ClaudeAgentPlugin.parseJsonlLine()` + streaming parser |
| Cost tracking | `event.cost_usd` | `event.cost_usd` en parseOutput | `message.cost` con inputTokens/outputTokens/totalUSD |
| Prompt via stdin | No (via `-p` arg) | No (via `-p` arg) | Si - `getStdinInput()` para evitar shell escaping |
| `--dangerously-skip-permissions` | No | No | Si - configurable `skipPermissions` |
| Setup questions | No | No | Si - printMode, model, skipPermissions |
| Model validation | No | `validateModel()` retorna null | Si - valida sonnet/opus/haiku |
| Detect con `findCommandPath` | No | `which` basico | Si - `findCommandPath()` con timeout 5s |
| File context | No | No | Si - `--add-dir` para directorios |

---

### 1.4 Aider Agent - No existe

El plan original incluia `aider.ts` first-class. Solo existe `GenericCliAgent` que NO tiene:
- `--yes-always` para modo no-interactivo
- `--no-git` para evitar auto-commits
- File context via positional args (no flags)
- Model validation (openai/model format)
- `--message` flag para prompt

---

### 1.5 Factory - `initialize()` silencioso

**Archivo**: `packages/agent-system/src/factory.ts:56-58`

```typescript
instance.initialize({ runtime: config.runtime, ...config.options }).catch(() => {});
```

Traga errores. Si runtime no esta disponible, el agent se crea "listo" pero falla despues sin contexto.

---

### 1.6 Registry - Conflicto de nombres

**Archivo**: `packages/agent-system/src/core/registry.ts`

- Linea 24: `static getInstance(): AgentRegistry` - singleton del registry
- Linea 31: `async getInstance(config): Promise<AgentPlugin>` - crea agent

Mismo nombre, diferente semantica. Ralph-tui usa `getInstance()` solo para el singleton y `createInstance()` + caching interno para agents.

---

### 1.7 Factory Meta - Instanciacion innecesaria

```typescript
// opencode.ts:120, claude-code.ts:115
getMeta(): AgentPluginMeta {
  return new OpenCodeAgent().meta;  // Crea instancia completa solo para leer meta
}
```

Ralph-tui resuelve esto con `registerBuiltin()` que crea una instancia temporal, lee meta, y la disposa.

---

### 1.8 Resilience Layer - No existe

El plan tenia `resilience/` con rate-limit detection, fallback agent switching, y exponential backoff. No se implemento nada.

Ralph-tui tiene `src/engine/rate-limit-detector.ts` (226 lineas) con:
- Patterns por agente (claude, opencode)
- Rate limit detection en stderr (no stdout para evitar false positives)
- Retry-after extraction
- Loose matching como fallback

---

## 2. Plan de Implementacion

### Fase 1: Fixes criticos (BaseAgent + stdin)

#### 1a. Cerrar stdin siempre

```diff
// packages/agent-system/src/core/base-agent.ts
private spawnProcess(options) {
  const child = this.runtime.spawn(options);

-  if (options.stdin && child.stdin) {
-    child.stdin.write(options.stdin);
-    child.stdin.end();
-  }
+  if (options.stdin && child.stdin) {
+    child.stdin.write(options.stdin);
+    child.stdin.end();
+  } else if (child.stdin) {
+    child.stdin.end(); // Prevent hanging on CLIs waiting for stdin
+  }

  return child;
}
```

#### 1b. Factory: await initialize, no swallow errors

```diff
// packages/agent-system/src/factory.ts
-export function createAgent(config) {
+export async function createAgent(config) {
   // ...
-  agent.initialize({ runtime: config.runtime, ...config.options }).catch(() => {});
+  await agent.initialize({ runtime: config.runtime, ...config.options });
   return agent;
 }
```

#### 1c. Registry: renombrar metodo conflictivo

```diff
// packages/agent-system/src/core/registry.ts
-  async getInstance(config: AgentPluginConfig): Promise<AgentPlugin> {
+  async createAndInit(config: AgentPluginConfig): Promise<AgentPlugin> {
```

#### 1d. Factory Meta: constantes estaticas

```diff
// Cada agent factory:
export class OpenCodeAgentFactory implements AgentPluginFactory {
+  private static readonly META: AgentPluginMeta = {
+    id: "opencode",
+    name: "OpenCode",
+    description: "OpenCode CLI agent",
+    version: "0.1.0",
+    defaultCommand: "opencode",
+    supportsStreaming: true,
+    supportsInterrupt: true,
+    supportsFileContext: true,
+    supportsSubagentTracing: false,
+    structuredOutputFormat: "json",
+  };
+
   create(): OpenCodeAgent {
     return new OpenCodeAgent();
   }

   getMeta(): AgentPluginMeta {
-    return new OpenCodeAgent().meta;
+    return OpenCodeAgentFactory.META;
   }
```

---

### Fase 2: OpenCode Agent completo

Referencia: `ralph-tui/src/plugins/agents/builtin/opencode.ts`

```typescript
// packages/agent-system/src/agents/opencode.ts

/**
 * Patterns para filtrar lineas de metadata de opencode output.
 * Estas son lineas de status/debug que no son parte del response real.
 * Ref: ralph-tui/src/plugins/agents/builtin/opencode.ts
 */
const OPENCODE_METADATA_PATTERNS = [
  /^[|!]\s+/,                     // Tool calls, status lines
  /^\s*\[\d+\/\d+\]/,             // Progress indicators [1/3]
  /^(Reading|Writing|Creating|Updating|Running)\s+/i,
  /^\s*\{[\s\S]*"type":\s*"/,     // JSON event objects
  /^\s*\{[\s\S]*"description":\s*"/, // JSON with description
  /^\s*\{[\s\S]*"path":\s*"/,     // JSON with path
  /^\s*\{[\s\S]*"pattern":\s*"/,  // JSON with pattern (grep)
];

function isMetadataLine(line: string): boolean {
  const clean = line.replace(/\x1b\[[0-9;]*m/g, '');
  return OPENCODE_METADATA_PATTERNS.some((p) => p.test(clean));
}

function filterMetadata(text: string): string {
  return text.split('\n').filter((l) => !isMetadataLine(l)).join('\n');
}

export class OpenCodeAgent extends BaseAgentPlugin {
  readonly meta: AgentPluginMeta = {
    id: "opencode",
    name: "OpenCode",
    description: "OpenCode CLI coding agent",
    version: "0.1.0",
    defaultCommand: "bunx",
    supportsStreaming: true,
    supportsInterrupt: true,
    supportsFileContext: true,
    supportsSubagentTracing: false,
    structuredOutputFormat: "json",
  };

  // Config fields (populated in initialize)
  private provider?: string;
  private model?: string;
  private agent: string = "general";
  private format: "default" | "json" = "json";

  async initialize(config: Record<string, unknown>): Promise<void> {
    await super.initialize(config);

    if (typeof config.provider === "string" && config.provider.length > 0) {
      this.provider = config.provider;
    }
    if (typeof config.model === "string" && config.model.length > 0) {
      this.model = config.model;
    }
    if (typeof config.agent === "string" && ["general", "build", "plan"].includes(config.agent)) {
      this.agent = config.agent;
    }
    if (typeof config.format === "string" && ["default", "json"].includes(config.format)) {
      this.format = config.format as "default" | "json";
    }
  }

  protected buildArgs(prompt: string, options?: AgentExecuteOptions): string[] {
    const opencodeHost = process.env.OPENCODE_HOST || "127.0.0.1";
    const opencodePort = process.env.OPENCODE_PORT || "4096";
    const opencodeServerUrl = `http://${opencodeHost}:${opencodePort}`;

    const args = ["opencode-ai", "run", "--attach", opencodeServerUrl];

    // Agent type (omit "general" to avoid warnings, like ralph-tui does)
    if (this.agent !== "general") {
      args.push("--agent", this.agent);
    }

    // Model in provider/model format
    const modelStr = this.buildModelString(options?.model);
    if (modelStr) {
      args.push("--model", modelStr);
    }

    // Output format
    if (this.format === "json") {
      args.push("--format", "json");
    }

    // File context
    if (options?.contextFiles) {
      for (const file of options.contextFiles) {
        args.push("-f", file);
      }
    }

    // Prompt via stdin, NOT in args (avoid shell interpretation)
    // See getStdinInput() below

    return args;
  }

  /**
   * Pass prompt via stdin to avoid shell interpretation of special chars.
   * Ref: ralph-tui opencode.ts getStdinInput()
   */
  protected getStdinInput(prompt: string): string {
    // Prepend repo context so opencode knows where to work
    const cwd = this.config.cwd as string | undefined;
    if (cwd) {
      return `IMPORTANT: Work ONLY in this repository: ${cwd}\n\n${prompt}`;
    }
    return prompt;
  }

  /**
   * Override execute to filter metadata lines from stdout.
   * Ref: ralph-tui OpenCodeAgentPlugin.execute()
   */
  execute(prompt: string, options?: AgentExecuteOptions): AgentExecutionHandle {
    const filteredOptions: AgentExecuteOptions = {
      ...options,
      onStdout: options?.onStdout
        ? (data: string) => {
            const filtered = filterMetadata(data);
            if (filtered.trim()) {
              options.onStdout!(filtered);
            }
          }
        : undefined,
    };
    return super.execute(prompt, filteredOptions);
  }

  protected parseOutput(stdout: string): ChangesSummary | undefined {
    const filesModified = new Set<string>();
    const filesCreated = new Set<string>();
    let summary = "";
    let diff = "";
    let totalCost = 0;

    for (const line of stdout.split("\n")) {
      if (!line.trim()) continue;
      try {
        const event = JSON.parse(line) as OpencodeEvent;
        if (!event.type) continue;

        if (event.type === "tool_use") {
          const tool = event.part?.tool;
          const status = event.part?.state?.status;
          const filePath = event.part?.state?.input?.filePath;
          if (status === "completed" && filePath) {
            if (tool === "edit") {
              filesModified.add(filePath);
              if (event.part?.state?.metadata?.diff) {
                diff += event.part.state.metadata.diff + "\n";
              }
            }
            if (tool === "write") {
              filesCreated.add(filePath);
            }
          }
        }

        // Capture assistant text for summary
        if (event.type === "text" && event.part?.text) {
          summary += event.part.text;
        }

        // Capture cost from step_finish events (lost in migration)
        if (event.type === "step_finish" && event.part) {
          const part = event.part as { cost?: number };
          if (typeof part.cost === "number") {
            totalCost += part.cost;
          }
        }
      } catch {
        // Non-JSON lines ignored
      }
    }

    return {
      filesModified: Array.from(filesModified),
      filesCreated: Array.from(filesCreated),
      filesDeleted: [],
      diff: diff || undefined,
      summary: summary.trim() || "OpenCode execution completed",
      totalCost: totalCost || undefined,
    };
  }

  /**
   * Validate model names in provider/model format.
   * Ref: ralph-tui OpenCodeAgentPlugin.validateModel()
   */
  validateModel(model: string): string | null {
    if (!model) return null;
    if (model.includes("/")) {
      const [provider, modelName] = model.split("/");
      if (!provider || !modelName) {
        return `Invalid model format "${model}". Expected: provider/model (e.g., anthropic/claude-3-5-sonnet)`;
      }
    }
    return null; // Delegate final validation to opencode CLI
  }

  private buildModelString(override?: string): string | undefined {
    const model = override || this.model;
    if (this.provider && model) {
      return model.includes("/") ? model : `${this.provider}/${model}`;
    }
    return model;
  }
}
```

---

### Fase 3: Claude Code Agent completo

Referencia: `ralph-tui/src/plugins/agents/builtin/claude.ts`

Cambios principales vs actual:

```typescript
// packages/agent-system/src/agents/claude-code.ts

export class ClaudeCodeAgent extends BaseAgentPlugin {
  readonly meta: AgentPluginMeta = {
    id: "claude-code",
    name: "Claude Code",
    description: "Anthropic Claude Code CLI agent",
    version: "0.1.0",
    defaultCommand: "claude",
    supportsStreaming: true,
    supportsInterrupt: true,
    supportsFileContext: true,
    supportsSubagentTracing: true,
    structuredOutputFormat: "jsonl",
  };

  private model?: string;
  private skipPermissions = true;

  async initialize(config: Record<string, unknown>): Promise<void> {
    await super.initialize(config);
    if (typeof config.model === "string") this.model = config.model;
    if (typeof config.skipPermissions === "boolean") this.skipPermissions = config.skipPermissions;
  }

  protected buildArgs(prompt: string, options?: AgentExecuteOptions): string[] {
    const args = ["--print", "--verbose", "--output-format", "stream-json"];

    const model = options?.model || this.model;
    if (model) args.push("--model", model);

    if (this.skipPermissions) {
      args.push("--dangerously-skip-permissions");
    }

    if (this.config.maxTokens && typeof this.config.maxTokens === "number") {
      args.push("--max-tokens", String(this.config.maxTokens));
    }
    if (Array.isArray(this.config.allowedTools) && this.config.allowedTools.length > 0) {
      args.push("--allowedTools", this.config.allowedTools.join(","));
    }
    if (Array.isArray(this.config.disallowedTools) && this.config.disallowedTools.length > 0) {
      args.push("--disallowedTools", this.config.disallowedTools.join(","));
    }

    // Prompt via stdin, NOT args (avoid shell escaping issues)
    return args;
  }

  /**
   * Pass prompt via stdin to avoid shell interpretation.
   * Ref: ralph-tui ClaudeAgentPlugin.getStdinInput()
   */
  protected getStdinInput(prompt: string): string {
    return prompt;
  }

  /**
   * Validate claude model names.
   * Ref: ralph-tui ClaudeAgentPlugin.validateModel()
   */
  validateModel(model: string): string | null {
    if (!model) return null;
    const valid = ["sonnet", "opus", "haiku"];
    // Also accept full model IDs like claude-sonnet-4-20250514
    if (!valid.includes(model) && !model.startsWith("claude-")) {
      return `Invalid model "${model}". Accepted: ${valid.join(", ")} or full model IDs (claude-sonnet-4-...)`;
    }
    return null;
  }

  protected parseOutput(stdout: string): ChangesSummary | undefined {
    // (mantener implementacion actual, ya funciona correctamente)
    // ... parseOutput actual con filesModified, filesCreated, cost_usd, summary
  }

  /**
   * JSONL streaming parser for real-time output processing.
   * Ref: ralph-tui ClaudeAgentPlugin.createStreamingJsonlParser()
   */
  static createStreamingParser() {
    let buffer = "";
    return {
      push(chunk: string): ClaudeStreamEvent[] {
        buffer += chunk;
        const events: ClaudeStreamEvent[] = [];
        let idx: number;
        while ((idx = buffer.indexOf("\n")) !== -1) {
          const line = buffer.slice(0, idx).trim();
          buffer = buffer.slice(idx + 1);
          if (!line) continue;
          try {
            events.push(JSON.parse(line));
          } catch { /* ignore */ }
        }
        return events;
      },
      flush(): ClaudeStreamEvent[] {
        if (!buffer.trim()) { buffer = ""; return []; }
        try {
          const event = JSON.parse(buffer.trim());
          buffer = "";
          return [event];
        } catch {
          buffer = "";
          return [];
        }
      },
    };
  }
}
```

---

### Fase 4: Aider Agent (nuevo, first-class)

```typescript
// packages/agent-system/src/agents/aider.ts

export class AiderAgent extends BaseAgentPlugin {
  readonly meta: AgentPluginMeta = {
    id: "aider",
    name: "Aider",
    description: "Aider AI pair programming CLI",
    version: "0.1.0",
    defaultCommand: "aider",
    supportsStreaming: true,
    supportsInterrupt: true,
    supportsFileContext: true,
    supportsSubagentTracing: false,
  };

  private model?: string;
  private noGit = true;
  private yesAlways = true;

  async initialize(config: Record<string, unknown>): Promise<void> {
    await super.initialize(config);
    if (typeof config.model === "string") this.model = config.model;
    if (typeof config.noGit === "boolean") this.noGit = config.noGit;
    if (typeof config.yesAlways === "boolean") this.yesAlways = config.yesAlways;
  }

  protected buildArgs(prompt: string, options?: AgentExecuteOptions): string[] {
    const args: string[] = [];

    // Non-interactive mode
    if (this.yesAlways) args.push("--yes-always");

    // Prevent aider from making its own git commits
    if (this.noGit) args.push("--no-git");

    // Model
    const model = options?.model || this.model;
    if (model) args.push("--model", model);

    // Prompt via --message flag
    args.push("--message", prompt);

    // File context: aider uses positional args for files, not flags
    if (options?.contextFiles && options.contextFiles.length > 0) {
      args.push(...options.contextFiles);
    }

    return args;
  }

  protected parseOutput(stdout: string): ChangesSummary | undefined {
    // Aider outputs plain text, extract file changes from git diff after
    return {
      summary: stdout.trim() || "Aider execution completed",
    };
  }

  validateModel(model: string): string | null {
    if (!model) return null;
    // Aider accepts provider/model format (e.g., openai/gpt-4o)
    if (model.includes("/")) {
      const [provider, modelName] = model.split("/");
      if (!provider || !modelName) {
        return `Invalid model format "${model}". Expected: provider/model`;
      }
    }
    return null;
  }
}

export class AiderAgentFactory implements AgentPluginFactory {
  private static readonly META: AgentPluginMeta = {
    id: "aider",
    name: "Aider",
    description: "Aider AI pair programming CLI",
    version: "0.1.0",
    defaultCommand: "aider",
    supportsStreaming: true,
    supportsInterrupt: true,
    supportsFileContext: true,
    supportsSubagentTracing: false,
  };

  create(): AiderAgent { return new AiderAgent(); }
  getMeta(): AgentPluginMeta { return AiderAgentFactory.META; }
  canCreate(id: string): boolean { return id === "aider"; }
}
```

Registrar en `agents/index.ts`:
```diff
+export { AiderAgent, AiderAgentFactory } from "./aider";

 export function registerBuiltinAgents(registry: AgentRegistry): void {
   registry.registerBuiltin(new ClaudeCodeAgentFactory());
   registry.registerBuiltin(new OpenCodeAgentFactory());
+  registry.registerBuiltin(new AiderAgentFactory());
 }
```

---

### Fase 5: Resilience Layer

Referencia directa: `ralph-tui/src/engine/rate-limit-detector.ts`

#### 5a. Rate Limit Detector

```typescript
// packages/agent-system/src/resilience/rate-limit-detector.ts

export interface RateLimitResult {
  isRateLimit: boolean;
  message?: string;
  retryAfter?: number; // seconds
}

interface RateLimitPattern {
  pattern: RegExp;
  retryAfterPattern?: RegExp;
}

// Common patterns (from ralph-tui)
const COMMON_PATTERNS: RateLimitPattern[] = [
  {
    pattern: /(?:HTTP|status|error|code|response)[\s:]*429|429\s*(?:too many|rate limit|error)/i,
    retryAfterPattern: /retry[- ]?after[:\s]+(\d+)\s*s/i,
  },
  { pattern: /rate[- ]?limit/i, retryAfterPattern: /retry[- ]?after[:\s]+(\d+)\s*s/i },
  { pattern: /too many requests/i, retryAfterPattern: /(\d+)\s*seconds?/i },
  { pattern: /quota[- ]?exceeded/i, retryAfterPattern: /(\d+)\s*seconds?/i },
  { pattern: /\boverloaded\b/i, retryAfterPattern: /(\d+)\s*seconds?/i },
];

// Agent-specific patterns (from ralph-tui)
const AGENT_PATTERNS: Record<string, RateLimitPattern[]> = {
  "claude-code": [
    { pattern: /anthropic.*rate[- ]?limit/i },
    { pattern: /claude.*is currently overloaded/i },
    { pattern: /api[- ]?error.*429/i },
  ],
  opencode: [
    { pattern: /openai.*rate[- ]?limit/i },
    { pattern: /tokens per minute/i },
    { pattern: /requests per minute/i },
    { pattern: /azure.*throttl/i },
  ],
};

export class RateLimitDetector {
  detect(input: { stderr: string; exitCode?: number; agentId?: string }): RateLimitResult {
    const { stderr, exitCode, agentId } = input;

    // Only check stderr - stdout causes false positives with code containing "429"
    if (!stderr.trim() && exitCode === 0) {
      return { isRateLimit: false };
    }

    const patterns = [...COMMON_PATTERNS, ...(agentId && AGENT_PATTERNS[agentId] || [])];

    for (const { pattern, retryAfterPattern } of patterns) {
      if (pattern.test(stderr)) {
        const retryAfter = retryAfterPattern
          ? this.extractRetryAfter(stderr, retryAfterPattern)
          : undefined;
        return { isRateLimit: true, message: this.extractMessage(stderr, pattern), retryAfter };
      }
    }

    return { isRateLimit: false };
  }

  private extractRetryAfter(output: string, pattern: RegExp): number | undefined {
    const match = output.match(pattern);
    if (match?.[1]) {
      const seconds = parseInt(match[1], 10);
      if (!isNaN(seconds) && seconds > 0 && seconds < 3600) return seconds;
    }
    return undefined;
  }

  private extractMessage(output: string, pattern: RegExp): string {
    const match = output.match(pattern);
    if (!match) return "Rate limit detected";
    const idx = match.index ?? 0;
    return output.slice(Math.max(0, idx - 50), Math.min(output.length, idx + match[0].length + 100))
      .trim().replace(/\s+/g, " ").slice(0, 200);
  }
}
```

#### 5b. Fallback Manager

```typescript
// packages/agent-system/src/resilience/fallback-manager.ts

export interface FallbackConfig {
  primaryAgent: string;
  fallbackAgents: string[];
  maxRetries: number;
  baseBackoffMs: number;
  recoverPrimaryBetweenIterations: boolean;
}

export class AgentFallbackManager {
  private activeAgent: string;
  private rateLimited = new Set<string>();
  private retryCount = 0;

  constructor(
    private config: FallbackConfig,
    private registry: AgentRegistry,
    private detector: RateLimitDetector,
  ) {
    this.activeAgent = config.primaryAgent;
  }

  getActiveAgentId(): string {
    return this.activeAgent;
  }

  async getActiveAgent(): Promise<AgentPlugin> {
    const agent = this.registry.createInstance(this.activeAgent);
    if (!agent) throw new Error(`Agent '${this.activeAgent}' not found`);
    return agent;
  }

  handleResult(result: AgentExecutionResult): { shouldRetry: boolean; backoffMs?: number } {
    const detection = this.detector.detect({
      stderr: result.stderr,
      exitCode: result.exitCode,
      agentId: this.activeAgent,
    });

    if (!detection.isRateLimit) {
      this.retryCount = 0;
      return { shouldRetry: false };
    }

    this.rateLimited.add(this.activeAgent);

    // Try fallback agents
    for (const fallbackId of this.config.fallbackAgents) {
      if (!this.rateLimited.has(fallbackId) && this.registry.hasPlugin(fallbackId)) {
        this.activeAgent = fallbackId;
        this.retryCount = 0;
        return { shouldRetry: true, backoffMs: 0 };
      }
    }

    // All agents rate limited - exponential backoff
    this.retryCount++;
    if (this.retryCount > this.config.maxRetries) {
      return { shouldRetry: false };
    }

    const backoff = detection.retryAfter
      ? detection.retryAfter * 1000
      : this.config.baseBackoffMs * Math.pow(2, this.retryCount - 1);

    return { shouldRetry: true, backoffMs: backoff };
  }

  /**
   * Attempt to recover primary agent between task iterations.
   * Ref: ralph-tui engine agent:recovery-attempted event
   */
  attemptPrimaryRecovery(): void {
    if (!this.config.recoverPrimaryBetweenIterations) return;
    if (this.activeAgent === this.config.primaryAgent) return;

    this.rateLimited.delete(this.config.primaryAgent);
    this.activeAgent = this.config.primaryAgent;
    this.retryCount = 0;
  }
}
```

---

### Fase 6: Docker Runtime - Recuperar features perdidas

```typescript
// packages/agent-system/src/runtime/docker.ts - metodos a agregar

export class DockerRuntime implements ExecutionRuntime {
  // ... existente ...

  /**
   * Auto-discover container by name patterns.
   * Ref: viejo claude-code-process.ts findClaudeCodeContainer()
   */
  async findContainer(namePatterns: string[]): Promise<string | null> {
    for (const name of namePatterns) {
      try {
        await this.exec("docker", ["inspect", name]);
        return name;
      } catch { /* continue */ }
    }

    // Fallback: search by partial name
    try {
      const child = spawn("docker", ["ps", "--filter", `name=${namePatterns[0]}`, "--format", "{{.Names}}"], {
        stdio: ["ignore", "pipe", "ignore"],
      });
      const output = await new Promise<string>((resolve) => {
        let out = "";
        child.stdout?.on("data", (d: Buffer) => { out += d.toString(); });
        child.on("close", () => resolve(out.trim()));
      });
      const first = output.split("\n")[0];
      if (first) return first;
    } catch { /* ignore */ }

    return null;
  }

  /**
   * Auto-detect Docker network.
   * Ref: viejo claude-code-process.ts detectDockerNetwork()
   */
  async detectNetwork(): Promise<string | null> {
    if (this.config.network) return this.config.network;
    if (process.env.CLAUDE_CODE_NETWORK) return process.env.CLAUDE_CODE_NETWORK;

    // Try to find network from container
    const container = this.config.containerName;
    if (container) {
      try {
        const child = spawn("docker", ["inspect", container, "--format",
          "{{range $key, $value := .NetworkSettings.Networks}}{{$key}}{{end}}"], {
          stdio: ["ignore", "pipe", "ignore"],
        });
        const output = await new Promise<string>((resolve) => {
          let out = "";
          child.stdout?.on("data", (d: Buffer) => { out += d.toString(); });
          child.on("close", () => resolve(out.trim()));
        });
        const first = output.split(/\s+/)[0];
        if (first) return first;
      } catch { /* ignore */ }
    }

    return null;
  }
}
```

---

## 3. Estructura Final de Archivos

```
packages/agent-system/src/
├── core/
│   ├── types.ts              # Interfaces (sin cambios)
│   ├── base-agent.ts         # Fix stdin.end() + onEnd callback
│   └── registry.ts           # Rename getInstance -> createAndInit
│
├── agents/
│   ├── index.ts              # + AiderAgentFactory
│   ├── claude-code.ts        # + stdin, skipPermissions, streaming parser, validateModel
│   ├── opencode.ts           # REWRITE: metadata filter, stdin, agent type, cost, validateModel
│   ├── aider.ts              # NEW: --yes-always, --no-git, --message, file positional args
│   └── generic-cli.ts        # Sin cambios
│
├── runtime/
│   ├── runtime.ts            # Sin cambios
│   ├── index.ts              # Sin cambios
│   ├── local.ts              # Sin cambios
│   ├── docker.ts             # + findContainer(), detectNetwork()
│   ├── kubernetes.ts          # Sin cambios
│   └── worktree.ts           # Sin cambios
│
├── resilience/               # NEW
│   ├── index.ts
│   ├── rate-limit-detector.ts # Pattern-based detection (from ralph-tui)
│   └── fallback-manager.ts    # Agent switching + backoff
│
├── compat/
│   └── coding-engine-adapter.ts # Sin cambios
│
├── factory.ts                # async createAgent, fix initialize
└── index.ts                  # + export resilience, aider
```

---

## 4. Orden de Ejecucion

| # | Tarea | Impacto | Riesgo |
|---|-------|---------|--------|
| 1 | Fix stdin.end() en BaseAgent | Critico - previene hangs | Bajo |
| 2 | Fix factory initialize() await | Critico - errores silenciosos | Bajo |
| 3 | Rename registry getInstance() | Cleanup - evita confusion | Bajo |
| 4 | Fix factory meta constantes | Cleanup - performance | Bajo |
| 5 | Rewrite OpenCode agent | Alto - funcionalidad perdida | Medio |
| 6 | Mejorar Claude Code agent | Medio - stdin + skipPermissions | Bajo |
| 7 | Crear Aider agent | Medio - nueva feature | Bajo |
| 8 | Rate limit detector | Alto - resilience | Bajo |
| 9 | Fallback manager | Alto - resilience | Medio |
| 10 | Docker runtime improvements | Medio - auto-discovery | Bajo |

**Recomendacion**: Hacer 1-4 primero (son fixes puros, bajo riesgo), luego 5-7 (agents), luego 8-10 (resilience + docker).
