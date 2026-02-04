# Ejecutando agentes con OpenFarm Agent System

Guia completa de como ejecutar OpenCode, Claude Code, Aider y agentes externos
usando el sistema unificado de agentes de OpenFarm.

Inspirado en la arquitectura de [ralph-tui](https://github.com/subsy/ralph-tui).

---

## Tabla de contenidos

1. [Quick Start](#quick-start)
2. [Arquitectura de ejecucion](#arquitectura-de-ejecucion)
3. [Ejecutar OpenCode](#ejecutar-opencode)
4. [Ejecutar Claude Code](#ejecutar-claude-code)
5. [Ejecutar Aider](#ejecutar-aider)
6. [Ejecutar un agente externo (cualquier CLI)](#ejecutar-un-agente-externo)
7. [Runtimes: local, docker, kubernetes, worktree](#runtimes)
8. [Resilience: rate limits y fallback](#resilience)
9. [Variables de entorno](#variables-de-entorno)
10. [Flujo completo de ejecucion (internals)](#flujo-completo)

---

## Quick Start

### Uso programatico (TypeScript)

```typescript
import { createCodingEngine } from "@openfarm/agent-system";

// 1. Crear el engine
const engine = await createCodingEngine({
  provider: "opencode",
  model: "anthropic/claude-3-5-sonnet",
});

// 2. Ejecutar una tarea
const result = await engine.applyChanges(
  "Agrega validacion de email al formulario de registro",
  "/path/to/mi-proyecto"
);

if (result.ok) {
  console.log("Archivos modificados:", result.value.filesModified);
  console.log("Resumen:", result.value.summary);
  console.log("Costo:", result.value.totalCost);
} else {
  console.error("Error:", result.error.message);
}
```

### Uso directo del agente (bajo nivel)

```typescript
import { createAgent } from "@openfarm/agent-system";
import { LocalRuntime } from "@openfarm/agent-system";

const agent = await createAgent({
  agent: "opencode",
  runtime: new LocalRuntime(),
  options: {
    model: "anthropic/claude-3-5-sonnet",
  },
});

const handle = agent.execute("Crea un archivo hello.ts con una funcion greet", {
  cwd: "/path/to/mi-proyecto",
  onStdout: (data) => process.stdout.write(data), // streaming en tiempo real
  onStderr: (data) => process.stderr.write(data),
});

// Esperar resultado
const result = await handle.promise;
console.log(result.status);   // "completed" | "failed" | "timeout" | "interrupted"
console.log(result.changes);  // { filesModified, filesCreated, summary, totalCost }

// O interrumpir
// handle.interrupt();
```

---

## Arquitectura de ejecucion

```
                    createCodingEngine({ provider: "opencode" })
                                    |
                    +---------------+---------------+
                    |               |               |
              resolveRuntime   createAgent    CodingEngineAdapter
              (local/docker/   (opencode/     (compatibilidad con
               k8s/worktree)   claude/aider)   CodingEngine interface)
                    |               |               |
                    +-------+-------+               |
                            |                       |
                    BaseAgentPlugin.execute()        |
                            |                       |
                    +-------+-------+               |
                    |               |               |
              buildArgs()    getStdinInput()         |
                    |               |               |
                    +-------+-------+               |
                            |                       |
                    runtime.spawn()                  |
                    (local: spawn directo)           |
                    (docker: docker exec)            |
                    (k8s: kubectl exec)              |
                            |                       |
                    Proceso hijo                     |
                    stdout -> parseOutput()  --------+
                    stderr -> onLog()
                    exit   -> AgentExecutionResult
```

Cada agente (OpenCode, Claude Code, Aider) extiende `BaseAgentPlugin` e implementa:

| Metodo | Que hace |
|--------|----------|
| `buildArgs()` | Construye los argumentos del CLI |
| `getStdinInput()` | El prompt se envia por stdin (no por args) |
| `parseOutput()` | Parsea stdout para extraer archivos modificados, costos, etc. |
| `validateModel()` | Valida que el modelo sea compatible |

---

## Ejecutar OpenCode

### Que comando se ejecuta internamente

```bash
bunx opencode-ai run \
  --attach http://127.0.0.1:4096 \
  --model anthropic/claude-3-5-sonnet \
  --format json \
  -f src/auth.ts \
  -f src/utils.ts
# El prompt se envia por stdin
```

### Prerequisitos

1. **opencode-ai** instalado o disponible via `bunx`
2. **Servidor OpenCode** corriendo (por defecto en `127.0.0.1:4096`)
3. **API key** del provider configurada (ej: `ANTHROPIC_API_KEY`)

### Ejemplo completo

```typescript
import { createCodingEngine } from "@openfarm/agent-system";

const engine = await createCodingEngine({
  provider: "opencode",
  model: "anthropic/claude-3-5-sonnet",
  onLog: (msg) => console.log("[opencode]", msg),
  onChanges: (changes) => {
    console.log("Archivos modificados:", changes.filesModified);
    console.log("Archivos creados:", changes.filesCreated);
    if (changes.totalCost) {
      console.log("Costo:", `$${changes.totalCost.toFixed(4)}`);
    }
  },
});

const result = await engine.applyChanges(
  "Refactoriza el modulo de autenticacion para usar JWT",
  "/home/user/mi-proyecto",
  ["src/auth.ts", "src/middleware.ts"] // context files opcionales
);
```

### Opciones de OpenCode

```typescript
const engine = await createCodingEngine({
  provider: "opencode",

  // Modelo: formato provider/model
  model: "anthropic/claude-3-5-sonnet",

  // Tipo de agente opencode
  // "general" (default) - agente general
  // "build"             - especializado en builds
  // "plan"              - solo planificacion
  agent: "general",

  // Formato de output
  // "json"    (default) - eventos JSON parseables
  // "default"           - output legible
  format: "json",

  // Provider LLM (se antepone al modelo: provider/model)
  provider: "anthropic",
});
```

### Que parsea del output

OpenCode en modo `--format json` emite eventos por linea:

```json
{"type": "text", "part": {"text": "Voy a modificar auth.ts..."}}
{"type": "tool_use", "part": {"tool": "edit", "state": {"status": "completed", "input": {"filePath": "src/auth.ts"}, "metadata": {"diff": "..."}}}}
{"type": "step_finish", "part": {"cost": 0.0234}}
```

El agente parsea estos eventos y extrae:
- `filesModified` - archivos editados
- `filesCreated` - archivos nuevos
- `diff` - diffs acumulados
- `summary` - texto del agente
- `totalCost` - costo total de la sesion

### Filtrado de metadata

OpenCode emite lineas de status/debug que se filtran automaticamente:

```
| edit src/auth.ts          <-- filtrado (metadata)
[1/3] Reading files...      <-- filtrado (progreso)
Writing src/auth.ts         <-- filtrado (accion)
{"type": "text", ...}       <-- filtrado (JSON event)
```

Solo el texto limpio del agente llega al callback `onLog`.

---

## Ejecutar Claude Code

### Que comando se ejecuta internamente

```bash
claude \
  --print \
  --verbose \
  --output-format stream-json \
  --model sonnet \
  --dangerously-skip-permissions \
  --max-tokens 8192 \
  --allowedTools Bash,Read,Write,Edit
# El prompt se envia por stdin
```

### Ejemplo

```typescript
const engine = await createCodingEngine({
  provider: "claude-code",
  model: "sonnet",                    // sonnet, opus, haiku, o claude-*
  onLog: (msg) => console.log(msg),
});

const result = await engine.applyChanges(
  "Agrega tests unitarios para el servicio de usuarios",
  "/home/user/mi-proyecto"
);
```

### Opciones de Claude Code

```typescript
const engine = await createCodingEngine({
  provider: "claude-code",
  model: "sonnet",

  // Saltar permisos interactivos (default: true)
  skipPermissions: true,

  // Limite de tokens
  maxTokens: 8192,

  // Herramientas permitidas
  allowedTools: ["Bash", "Read", "Write", "Edit"],

  // Herramientas bloqueadas
  disallowedTools: ["WebFetch"],
});
```

### Streaming parser (avanzado)

Para procesar eventos en tiempo real (no esperar a que termine):

```typescript
import { ClaudeCodeAgent } from "@openfarm/agent-system";

const parser = ClaudeCodeAgent.createStreamingParser();

agent.execute(prompt, {
  onStdout: (chunk) => {
    const events = parser.push(chunk);
    for (const event of events) {
      if (event.type === "tool_use") {
        console.log("Usando herramienta:", event.tool_name);
      }
      if (event.type === "result") {
        console.log("Resultado:", event.message);
        console.log("Costo:", event.cost_usd);
      }
    }
  },
});
```

---

## Ejecutar Aider

### Que comando se ejecuta internamente

```bash
aider \
  --yes-always \
  --no-git \
  --model anthropic/claude-3-5-sonnet \
  --message "Tu prompt aqui" \
  src/auth.ts src/utils.ts
```

### Ejemplo

```typescript
const engine = await createCodingEngine({
  provider: "aider",
  model: "anthropic/claude-3-5-sonnet",
  onLog: (msg) => console.log(msg),
});

const result = await engine.applyChanges(
  "Agrega manejo de errores al endpoint de login",
  "/home/user/mi-proyecto",
  ["src/routes/auth.ts", "src/services/user.ts"] // se pasan como args posicionales
);
```

### Opciones de Aider

```typescript
const engine = await createCodingEngine({
  provider: "aider",
  model: "openai/gpt-4o",

  // Auto-confirmar cambios (default: true)
  yesAlways: true,

  // No hacer commits automaticos (default: true)
  noGit: true,
});
```

---

## Ejecutar un agente externo

Para cualquier CLI que acepte un prompt y produzca output:

### Ejemplo: Codex

```typescript
const engine = await createCodingEngine({
  provider: "external-agent",
  cli: "codex",
  args: ["--approval-mode", "full-auto"],
  agentName: "Codex",
  onLog: (msg) => console.log(msg),
});

const result = await engine.applyChanges(
  "Agrega dark mode al componente Settings",
  "/home/user/mi-proyecto"
);
```

### Ejemplo: Gemini CLI

```typescript
const engine = await createCodingEngine({
  provider: "external-agent",
  cli: "gemini",
  args: ["--model", "gemini-2.5-pro"],
  agentName: "Gemini",
});
```

### Como funciona

El `GenericCliAgent` envia el prompt por **stdin** y captura **stdout/stderr**.
El output crudo se retorna como `summary`. No hay parsing estructurado
(a diferencia de OpenCode/Claude que parsean JSON).

---

## Runtimes

Todos los agentes pueden ejecutarse en cualquier runtime.
El runtime define **donde** corre el proceso, no **que** agente usar.

### Local (default)

```typescript
const engine = await createCodingEngine({
  provider: "opencode",
  // runtimeType: "local" es el default, no hace falta especificarlo
});
```

Ejecuta: `bunx opencode-ai run ...` directamente en la maquina.

### Docker

```typescript
// Container existente
const engine = await createCodingEngine({
  provider: "opencode",
  runtimeType: "docker",
  containerName: "opencode-dev",
});

// Container efimero (se crea y destruye por ejecucion)
const engine = await createCodingEngine({
  provider: "claude-code",
  runtimeType: "docker",
  ephemeral: true,
  imageName: "minions-farm/claude-code:latest",
});
```

Ejecuta: `docker exec -i opencode-dev bunx opencode-ai run ...`

### Kubernetes

```typescript
const engine = await createCodingEngine({
  provider: "claude-code",
  runtimeType: "kubernetes",
  podName: "claude-code-pod-abc123",
  namespace: "minions-farm",
});
```

Ejecuta: `kubectl exec claude-code-pod-abc123 -n minions-farm -- claude --print ...`

### Worktree (aislamiento git)

```typescript
const engine = await createCodingEngine({
  provider: "opencode",
  runtimeType: "worktree",
  worktreePath: "/tmp/worktrees/feature-auth",
  baseBranch: "main",
});
```

Crea un `git worktree` aislado y ejecuta el agente ahi.
Util para tareas paralelas sin conflictos de branch.

---

## Resilience

### Rate Limit Detector

Detecta automaticamente rate limits en stderr del agente:

```typescript
import { RateLimitDetector } from "@openfarm/agent-system";

const detector = new RateLimitDetector();

const result = detector.detect({
  stderr: "Error: 429 Too Many Requests. Retry after 30s",
  exitCode: 1,
  agentId: "claude-code",
});

// result = { isRateLimit: true, message: "429 Too Many Requests...", retryAfter: 30 }
```

Patrones detectados:
- HTTP 429 / Too Many Requests
- Rate limit / Quota exceeded / Overloaded
- Patrones especificos por agente (anthropic rate limit, openai tokens per minute, etc.)

### Fallback Manager

Cambia automaticamente a otro agente cuando uno esta rate-limited:

```typescript
import {
  AgentFallbackManager,
  RateLimitDetector,
  AgentRegistry,
} from "@openfarm/agent-system";

const manager = new AgentFallbackManager(
  {
    primaryAgent: "claude-code",
    fallbackAgents: ["opencode", "aider"],
    maxRetries: 3,
    baseBackoffMs: 5000,
    recoverPrimaryBetweenIterations: true,
  },
  AgentRegistry.getInstance(),
  new RateLimitDetector()
);

// Despues de cada ejecucion:
const { shouldRetry, backoffMs } = manager.handleResult(executionResult);

if (shouldRetry) {
  if (backoffMs && backoffMs > 0) {
    await sleep(backoffMs); // exponential backoff
  }
  const agent = await manager.getActiveAgent(); // puede ser el fallback
  // re-ejecutar con el nuevo agente...
}

// Entre iteraciones, intentar volver al primario:
manager.attemptPrimaryRecovery();
```

---

## Variables de entorno

### OpenCode

| Variable | Default | Descripcion |
|----------|---------|-------------|
| `OPENCODE_HOST` | `127.0.0.1` | Host del servidor OpenCode |
| `OPENCODE_PORT` | `4096` | Puerto del servidor OpenCode |
| `OPENCODE_IMAGE_NAME` | - | Imagen Docker para opencode |
| `ANTHROPIC_API_KEY` | - | API key si usas Anthropic como provider |
| `OPENAI_API_KEY` | - | API key si usas OpenAI como provider |

### Claude Code

| Variable | Default | Descripcion |
|----------|---------|-------------|
| `CLAUDE_CODE_IMAGE_NAME` | `minions-farm/claude-code:latest` | Imagen Docker |
| `ANTHROPIC_API_KEY` | - | API key de Anthropic |

### Aider

| Variable | Default | Descripcion |
|----------|---------|-------------|
| `ANTHROPIC_API_KEY` | - | Si usas modelos Anthropic |
| `OPENAI_API_KEY` | - | Si usas modelos OpenAI |
| `OPENROUTER_API_KEY` | - | Si usas OpenRouter |

---

## Flujo completo

### 1. El usuario llama `createCodingEngine()`

```typescript
const engine = await createCodingEngine({
  provider: "opencode",
  model: "anthropic/claude-3-5-sonnet",
});
```

### 2. Se resuelve el runtime

```
resolveRuntimeConfig("opencode", options)
  -> Sin podName, containerName, ni worktreePath
  -> return { type: "local" }
  -> new LocalRuntime()
```

### 3. Se crea el agente

```
createAgent({ agent: "opencode", runtime, options })
  -> new OpenCodeAgent()
  -> agent.initialize({ model: "anthropic/claude-3-5-sonnet" })
     -> this.model = "claude-3-5-sonnet"
     -> this.provider = "anthropic"  (si se pasa)
     -> this.agent = "general"
     -> this.format = "json"
```

### 4. Se envuelve en el adapter

```
new AgentToCodingEngineAdapter(agent, adapterOptions)
  -> Implementa CodingEngine interface
  -> applyChanges() delega a agent.execute()
```

### 5. Se llama `engine.applyChanges(instruction, repoPath)`

```
adapter.applyChanges("Refactoriza auth", "/home/user/proyecto")
  -> agent.execute(prompt, { cwd: "/home/user/proyecto", model: "..." })
```

### 6. OpenCodeAgent.execute() (override)

```
Envuelve onStdout con filterMetadata() para limpiar output
  -> super.execute(prompt, filteredOptions)
```

### 7. BaseAgentPlugin.execute()

```
buildArgs(prompt, options)
  -> ["opencode-ai", "run", "--attach", "http://127.0.0.1:4096",
      "--model", "anthropic/claude-3-5-sonnet", "--format", "json"]

getStdinInput(prompt, options)
  -> "IMPORTANT: Work ONLY in this repository: /home/user/proyecto\n\nRefactoriza auth"

getCommand()
  -> "bunx"

spawnProcess({ command: "bunx", args, cwd, stdin })
  -> runtime.spawn(options)  // LocalRuntime: spawn("bunx", args)
  -> child.stdin.write(stdinInput)
  -> child.stdin.end()  // CRITICO: sin esto el proceso queda colgado
```

### 8. El proceso ejecuta

```bash
bunx opencode-ai run \
  --attach http://127.0.0.1:4096 \
  --model anthropic/claude-3-5-sonnet \
  --format json
# stdin recibe: "IMPORTANT: Work ONLY in this repository: ..."
```

### 9. Se captura el output

```
child.stdout -> chunks acumulados + onStdout callback (filtrado)
child.stderr -> chunks acumulados + onStderr callback
child.on("close") -> parseOutput(stdout) -> ChangesSummary
```

### 10. Se resuelve el resultado

```
AgentExecutionResult {
  status: "completed",
  exitCode: 0,
  stdout: "...",
  stderr: "...",
  durationMs: 45000,
  changes: {
    filesModified: ["src/auth.ts"],
    filesCreated: ["src/auth.test.ts"],
    diff: "--- a/src/auth.ts\n+++ b/src/auth.ts\n...",
    summary: "Refactorice el modulo de auth para usar JWT...",
    totalCost: 0.0342,
  }
}
```

---

## Comparacion con ralph-tui

| Aspecto | ralph-tui | OpenFarm |
|---------|-----------|----------|
| Comando OpenCode | `opencode run` (directo) | `bunx opencode-ai run --attach URL` (via server) |
| Prompt | Via stdin | Via stdin |
| Output | Filtrado de metadata | Filtrado de metadata |
| Runtimes | Solo local | Local, Docker, K8s, Worktree |
| Rate limits | Deteccion + backoff + fallback | Deteccion + backoff + fallback |
| Agentes | OpenCode, Claude | OpenCode, Claude, Aider, Generic CLI |
| Plugin system | Registry + user plugins | Registry + user plugins |
| Streaming | onStdout/onStderr | onStdout/onStderr |
| Cost tracking | Per-step | Per-step |
| Task loop | Engine con iteraciones | Workflow executor / Task loop |
| Completion | `<promise>COMPLETE</promise>` | Exit code + output parsing |
| Config | TOML | Programatico + YAML workflows |

---

## Ejemplo end-to-end: Task loop con OpenCode

```typescript
import {
  createAgent,
  AgentFallbackManager,
  RateLimitDetector,
  AgentRegistry,
  LocalRuntime,
} from "@openfarm/agent-system";

const runtime = new LocalRuntime();
const registry = AgentRegistry.getInstance();

// Crear agente primario
const agent = await createAgent({
  agent: "opencode",
  runtime,
  options: { model: "anthropic/claude-3-5-sonnet" },
});

// Configurar fallback
const fallback = new AgentFallbackManager(
  {
    primaryAgent: "opencode",
    fallbackAgents: ["claude-code", "aider"],
    maxRetries: 3,
    baseBackoffMs: 5000,
    recoverPrimaryBetweenIterations: true,
  },
  registry,
  new RateLimitDetector()
);

// Lista de tareas
const tasks = [
  "Agrega validacion de email en el formulario de registro",
  "Crea tests unitarios para el servicio de usuarios",
  "Refactoriza el middleware de autenticacion para usar JWT",
];

for (const task of tasks) {
  console.log(`\n--- Ejecutando: ${task} ---\n`);

  const handle = agent.execute(task, {
    cwd: "/home/user/mi-proyecto",
    onStdout: (data) => process.stdout.write(data),
    timeout: 120_000,
  });

  const result = await handle.promise;

  // Verificar rate limits
  const { shouldRetry, backoffMs } = fallback.handleResult(result);

  if (shouldRetry) {
    console.log(`Rate limited. Backoff: ${backoffMs}ms`);
    if (backoffMs) await new Promise((r) => setTimeout(r, backoffMs));
    // Re-ejecutar con agente de fallback...
  }

  if (result.status === "completed") {
    console.log("Completado:", result.changes?.summary);
    console.log("Archivos:", result.changes?.filesModified);
  } else {
    console.error("Fallo:", result.error);
  }

  // Intentar volver al primario entre tareas
  fallback.attemptPrimaryRecovery();
}
```
