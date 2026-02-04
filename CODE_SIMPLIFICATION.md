# Code Simplification Guide

This document identifies areas where OpenFarm codebase can be simplified to improve readability and maintainability without breaking functionality.

## Table of Contents

1. [Agent Executor](#agent-executor)
2. [Planning Executor](#planning-executor)
3. [Git Worktree](#git-worktree)
4. [Git Adapter](#git-adapter)
5. [Platform Adapter Factory](#platform-adapter-factory)
6. [Provider Factory](#provider-factory)
7. [Utils](#utils)
8. [General Recommendations](#general-recommendations)

---

## Agent Executor

**File**: `packages/agent-runner/src/engines/workflow/executors/agent-executor.ts` (1288 lines)

### Issue 1: Overly Complex Expression Replacement Logic (Lines 26-216)

**Problem**:
The `replaceWorkItemExpressions` and `replaceStepResultsExpressions` functions contain repetitive string replacement logic with multiple regex patterns. This makes code hard to understand and maintain.

**Current Code** (Lines 46-87):
```typescript
function replaceWorkItemExpressions(text: string, workItem: {...}): string {
  let result = text;
  result = result.replace(/\$\{workItem\.title\}/g, workItem.title || "");
  result = result.replace(/\$\{workItem\.description\}/g, workItem.description || "");
  result = result.replace(/\$\{workItem\.acceptanceCriteria\}/g, workItem.acceptanceCriteria || "");
  result = result.replace(/\$\{workItem\.id\}/g, workItem.id || "");
  result = result.replace(/\$\{workItem\.workItemType\}/g, workItem.workItemType || "");
  result = result.replace(/\$\{workItem\.type\}/g, workItem.workItemType || "");
  result = result.replace(/\$\{workItem\.project\}/g, workItem.project || "");
  result = result.replace(/\$\{workItem\.mode\}/g, workItem.mode || "");
  result = result.replace(/\$\{workItem\.preInstructions\}/g, workItem.preInstructions || "");
  // ... more repetitive replacements
}
```

**Simplified Solution**:
```typescript
// Define property mappings once
const WORKITEM_PROPERTIES = [
  'title', 'description', 'acceptanceCriteria', 'id', 'workItemType',
  'project', 'mode', 'preInstructions', 'repositoryUrl', 'branchName',
  'defaultBranch', 'chatMessages', 'sessionId'
] as const;

function replaceWorkItemExpressions(text: string, workItem: Record<string, string | undefined>): string {
  let result = text;

  // Simple property replacements: ${workItem.title} -> workItem.title
  for (const prop of WORKITEM_PROPERTIES) {
    const pattern = new RegExp(`\\$\\{workItem\\.${prop}\\}`, 'g');
    result = result.replace(pattern, workItem[prop] || '');
  }

  // Handle complex patterns (ternary expressions with defaults)
  const patterns = [
    // ${workItem.mode || 'investigate'}
    [/\$\{workItem\.mode\s*\|\|\s*['"]([^'"]+)['"]\}/g, (m, def) => workItem.mode || def || 'investigate'],
    // ${workItem.mode === 'investigate' ? 'value1' : 'value2'}
    [/\$\{workItem\.mode\s*===\s*['"]([^'"]+)['"]\s*\?\s*['"]([^'"]+)['"]\s*:\s*['"]([^'"]+)['"]\}/g, (m, mode, trueVal, falseVal) => (workItem.mode === mode ? trueVal : falseVal)],
  ];

  for (const [pattern, replacer] of patterns) {
    result = result.replace(pattern, replacer as (...args: unknown[]) => string);
  }

  return result;
}
```

**Benefits**:
- Reduces 40+ lines of repetitive code to ~20 lines
- Single source of truth for property names
- Easier to add new properties
- More maintainable

---

### Issue 2: Overly Complex `executeAgentCode` Function (Lines 444-898)

**Problem**:
The `executeAgentCode` function is 450+ lines with deeply nested conditionals and complex engine creation logic. It's hard to follow and test.

**Simplified Approach**:
Extract engine creation logic into a separate module:

```typescript
// Create: packages/agent-runner/src/engines/workflow/engine-resolver.ts
export async function resolveEngine(
  config: AgentCodeConfig,
  context: ExecutionContext,
  services: ServiceContainer
): Promise<CodingEngine> {
  const { codingEngine, codingEngineFactory, defaultEngineOptions } = services;

  // If engine already exists and config matches, reuse it
  if (codingEngine && shouldUseDefaultEngine(config, context, defaultEngineOptions)) {
    return codingEngine;
  }

  // Otherwise, create new engine
  if (!codingEngineFactory) {
    throw new Error("No coding engine factory available");
  }

  const engineConfig = buildEngineConfig(config, context, defaultEngineOptions);
  return codingEngineFactory(engineConfig);
}

function shouldUseDefaultEngine(config: AgentCodeConfig, context: ExecutionContext, defaults: EngineOptions): boolean {
  return (
    config.provider === undefined &&
    config.model === undefined &&
    config.previewMode === undefined &&
    context.agentConfiguration?.provider === defaults.provider
  );
}

function buildEngineConfig(config: AgentCodeConfig, context: ExecutionContext, defaults: EngineOptions) {
  const resolvedModel = config.model || context.agentConfiguration?.model || defaults.model;

  return {
    provider: config.provider || defaults.provider,
    model: resolvedModel,
    previewMode: config.previewMode ?? defaults.previewMode,
    chatOnly: config.chatOnly ?? false,
    runtimeType: resolveRuntimeType(config, context, defaults),
    worktreePath: config.worktreePath ?? context.worktreePath ?? defaults.worktreePath,
    // ... other options
  };
}

function resolveRuntimeType(config: AgentCodeConfig, context: ExecutionContext, defaults: EngineOptions): RuntimeType {
  return config.runtimeType ??
    context.podName ? "kubernetes" :
    context.worktreePath ? "worktree" :
    defaults.containerName || defaults.ephemeral || defaults.imageName ? "docker" :
    "local";
}
```

**Benefits**:
- Separates concerns: configuration resolution vs execution
- Each function does one thing well
- Easier to test individual components
- Reduces `executeAgentCode` complexity by ~200 lines

---

### Issue 3: Duplicate Dry Run Report Generation (Lines 251-344)

**Problem**:
`generateAgentDryRunReport` and `generateDryRunReport` (in planning-executor.ts) have similar structure but are duplicated.

**Simplified Solution**:
Create a shared report generator:

```typescript
// Create: packages/agent-runner/src/utils/dry-run.ts
interface DryRunConfig {
  showEstimatedTime?: boolean;
  showAffectedFiles?: boolean;
  showRiskAssessment?: boolean;
}

interface DryRunContext {
  stepType: string;
  stepId: string;
  target: string; // repo or work item
  config: Record<string, unknown>;
  instruction: string;
}

function generateDryRunReport(context: DryRunContext, config: DryRunConfig = {}): string {
  const sections = [
    generateHeader(context),
    generateOverview(context),
    generateWhatWouldHappen(context),
    ...(config.showEstimatedTime ? [generateEstimatedTime(context)] : []),
    ...(config.showAffectedFiles ? [generateAffectedFiles(context)] : []),
    ...(config.showRiskAssessment ? [generateRiskAssessment(context)] : []),
    generateInstructionPreview(context),
    generateFooter(),
  ];

  return sections.join('\n\n');
}
```

---

## Planning Executor

**File**: `packages/agent-runner/src/engines/workflow/executors/planning-executor.ts` (766 lines)

### Issue 1: Overly Complex `cleanPlanContent` Function (Lines 130-229)

**Problem**:
The function has many regex patterns and nested conditional logic that's hard to follow.

**Current Code** (Lines 162-209):
```typescript
const noisePatterns = [
  /^You can skip this check with/,
  /^Added .* to .gitignore/,
  /^\.\.\/tmp\/.*worktrees/,
  /^Note: in-chat filenames/,
  /^Cur working dir:/,
  /^Git working dir:/,
  /^docs$/,
  /^\/.*\.md$/,
  /^.*: file not found error$/i,
  /^(?:❌\s*)?[^\s:]+:\s*file\s+not\s+found\s+error$/i,
  // ... more patterns
];
```

**Simplified Solution**:
```typescript
// Define pattern categories for clarity
const NOISE_PATTERNS = {
  engineOutput: [
    /^You can skip this check with/,
    /^Added .* to .gitignore/,
    /^\.\.\/tmp\/.*worktrees/,
  ],
  filePaths: [
    /^Cur working dir:/,
    /^Git working dir:/,
    /^docs$/,
    /^\/.*\.md$/,
  ],
  errors: [
    /file not found/i,
    /Unable to read/i,
    /'NoneType' object/,
  ],
  gitConflict: [
    /^<<<<<<< SEARCH/,
    /^>>>>>>> REPLACE/,
    /^=======/,
  ],
} as const;

function isNoise(line: string): boolean {
  return Object.values(NOISE_PATTERNS).some(patterns =>
    patterns.some(pattern => pattern.test(line))
  );
}
```

**Benefits**:
- Pattern categories make intent clear
- Easier to add new noise patterns
- Reduces mental load when reading

---

### Issue 2: Duplicate Kubectl Execution Patterns (Lines 558-730)

**Problem**:
`writeFileInPod` and `executeGitCommandInPod` have nearly identical promise-based timeout wrappers.

**Simplified Solution**:
```typescript
function executeInPod<T>(
  podName: string,
  command: string,
  timeout: number = 30_000
): Promise<Result<T>> {
  const { spawn } = await import("node:child_process");
  const sanitizedPodName = sanitizePodName(podName);

  return new Promise((resolve) => {
    const process = spawn("kubectl", buildKubectlArgs(sanitizedPodName, command));
    let stdout = "";
    let stderr = "";

    const timeoutId = setTimeout(() => {
      process.kill();
      resolve(err(new Error("kubectl exec timed out")));
    }, timeout);

    process.stdout.on("data", (data) => { stdout += data.toString(); });
    process.stderr.on("data", (data) => { stderr += data.toString(); });

    process.on("close", (code) => {
      clearTimeout(timeoutId);
      code === 0 ? resolve(ok(stdout as T)) : resolve(err(new Error(stderr || "Command failed")));
    });

    process.on("error", (error) => {
      clearTimeout(timeoutId);
      resolve(err(new Error(`kubectl exec error: ${error.message}`)));
    });
  });
}

// Specialized helpers
const writeFileInPod = (podName: string, path: string, content: string) =>
  executeInPod<void>(podName, `echo "${Buffer.from(content).toString('base64')}" | base64 -d > "${path}"`);

const executeGitCommandInPod = (podName: string, repoPath: string, command: string) =>
  executeInPod<void>(podName, `cd "${repoPath}" && ${command}`);
```

**Benefits**:
- Eliminates ~100 lines of duplicate code
- Single timeout/error handling implementation
- Easier to maintain

---

## Git Worktree

**File**: `packages/agent-runner/src/operations/git/worktree/create.ts` (372 lines)

### Issue 1: Excessive Validation Calls (Lines 127-176)

**Problem**:
The same validation logic is called 5 times with different error messages.

**Current Code**:
```typescript
// Line 127-130
const validation = validateMainRepository(sanitizedMainRepoPath, fs);
if (!validation.valid) {
  return err(validation.error!);
}

// Line 149-156
const validation2 = validateMainRepository(sanitizedMainRepoPath, fs);
if (!validation2.valid) {
  return err(new Error(`Main repository does not exist before listing worktrees...`));
}

// Line 164-171
const validation3 = validateMainRepository(sanitizedMainRepoPath, fs);
if (!validation3.valid) {
  return err(new Error(`Main repository does not exist before updating default branch...`));
}

// Line 196-203
const validation4 = validateMainRepository(sanitizedMainRepoPath, fs);
if (!validation4.valid) {
  return err(new Error(`Main repository does not exist before worktree creation...`));
}

// Line 308-317
const validation5 = validateMainRepository(sanitizedMainRepoPath, fs);
if (!validation5.valid) {
  return err(new Error(`Main repository was deleted during worktree repair...`));
}
```

**Simplified Solution**:
```typescript
function validateRepositoryWithMessage(
  mainRepoPath: string,
  fs: FileSystem,
  operation: string
): Result<void> {
  const validation = validateMainRepository(mainRepoPath, fs);
  if (!validation.valid) {
    return err(new Error(`Main repository does not exist before ${operation}: ${mainRepoPath}`));
  }
  return ok(undefined);
}

// Usage:
const validationResult = validateRepositoryWithMessage(sanitizedMainRepoPath, fs, "listing worktrees");
if (!validationResult.ok) return validationResult;
```

**Benefits**:
- Reduces 30+ lines to ~10 lines
- Single source of truth for validation messages
- Easier to modify error messages consistently

---

### Issue 2: Overly Complex Retry Loop (Lines 186-343)

**Problem**:
The retry loop has deep nesting and multiple strategy branches.

**Simplified Solution**:
```typescript
interface RetryStrategy {
  canHandle: (error: string) => boolean;
  attempt: () => Promise<void>;
}

const RETRY_STRATEGIES: RetryStrategy[] = [
  {
    canHandle: (err) => err.includes("already exists") || err.includes("used by worktree"),
    attempt: () => aggressiveCleanupForBranchExists(...),
  },
  {
    canHandle: (err) => err.includes("already a registered worktree") || err.includes("is a missing worktree"),
    attempt: () => repairStaleWorktreeReference(...),
  },
];

async function executeWithRetry<T>(
  operation: () => Promise<T>,
  maxAttempts: number = 3
): Promise<Result<T>> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return ok(await operation());
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Try recovery strategies
      const strategy = RETRY_STRATEGIES.find(s => s.canHandle(errorMessage));
      if (strategy && attempt < maxAttempts) {
        await strategy.attempt();
        continue;
      }

      // Last attempt or no recovery strategy
      if (attempt >= maxAttempts) {
        return await requestUserIntervention(...);
      }
    }
  }
  return err(new Error("Failed after all attempts"));
}
```

**Benefits**:
- Strategy pattern makes recovery logic clear
- Easier to add new recovery strategies
- Reduces nesting depth from 4-5 levels to 2-3 levels

---

## Git Adapter

**File**: `packages/git-adapter/src/index.ts` (595 lines)

### Issue 1: Massive `checkoutBranch` Function (Lines 111-400)

**Problem**:
This 290-line function has excessive nesting and duplicate error handling.

**Simplified Solution**:
Break down into smaller, focused functions:

```typescript
// 1. Verify repository exists
function verifyRepository(config: GitConfig, fs: FileSystem): Result<void> {
  if (!fs.existsSync(config.repoPath)) {
    return diagnoseMissingRepository(config, fs);
  }
  return verifyGitRepository(config, execFn);
}

// 2. Verify it's a git repository
function verifyGitRepository(config: GitConfig, execFn: ExecFunction): Result<void> {
  try {
    execFn(`git -C ${config.repoPath} rev-parse --git-dir`);
    return ok(undefined);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    if (errorMsg.includes("not a git") || errorMsg.includes("No such file or directory")) {
      return err(new Error(`Path exists but is not a valid git repository: ${config.repoPath}`));
    }
    return ok(undefined); // Continue anyway for worktree issues
  }
}

// 3. Handle worktree conflicts
function handleWorktreeConflict(branchName: string, error: Error): Result<void> {
  const errorMsg = String(error);
  if (errorMsg.includes("already used by worktree") || errorMsg.includes("is checked out at")) {
    console.warn(`[git-adapter] Branch '${branchName}' is used by another worktree`);
    return ok(undefined);
  }
  return err(error);
}

// 4. Main checkout function with early returns
export const checkoutBranch = async (config: GitConfig, branchName: string, ...): Promise<Result<void>> => {
  // Step 1: Verify repository
  const verifyResult = verifyRepository(config, fs);
  if (!verifyResult.ok) return verifyResult;

  // Step 2: Configure git
  await configureGitUser(config, execFn);

  // Step 3: Check if already on target branch
  const currentBranch = await getCurrentBranch(config, execFn);
  if (currentBranch === branchName) {
    return pullBranch(config, branchName, execFn).catch(() => ok(undefined));
  }

  // Step 4: Try default branch first
  if (isDefaultBranch(branchName, defaultBranch)) {
    const result = await checkoutDefaultBranch(config, branchName, execFn);
    if (result.ok) return result;
    const conflictResult = handleWorktreeConflict(branchName, result.error as Error);
    if (conflictResult.ok) return conflictResult;
  }

  // Step 5: Checkout from default branch
  const switchResult = await switchToDefaultBranch(config, defaultBranch, execFn);
  if (!switchResult.ok) {
    const conflictResult = handleWorktreeConflict(defaultBranch, switchResult.error as Error);
    if (conflictResult.ok) return conflictResult;
  }

  // Step 6: Fetch and pull
  await fetchAndPull(config, defaultBranch, execFn);

  // Step 7: Create or checkout branch
  const branchExists = await checkBranchExists(config, branchName, execFn);
  if (branchExists) {
    return checkoutExistingBranch(config, branchName, execFn);
  }
  return createNewBranch(config, branchName, execFn);
};
```

**Benefits**:
- Each function has a single responsibility
- Easy to test individual components
- Main function is ~50 lines instead of 290 lines
- Clear step-by-step flow

---

### Issue 2: Duplicate Error Handling Patterns (Lines 477-498, 499-515)

**Problem**:
The "no changes to commit" error check is duplicated in multiple places.

**Simplified Solution**:
```typescript
const NO_COMMIT_ERRORS = [
  "nothing to commit",
  "nothing added to commit",
] as const;

function isNoCommitError(errorMsg: string): boolean {
  return NO_COMMIT_ERRORS.some(msg => errorMsg.includes(msg));
}

// Usage in commitChanges:
if (isNoCommitError(errorMsg)) {
  return err(new Error("No changes to commit"));
}
```

---

## Platform Adapter Factory

**File**: `packages/agent-runner/src/engines/workflow/platform-adapter-factory.ts` (444 lines)

### Issue 1: Inline GitHub Fallback Adapter (Lines 226-370)

**Problem**:
The `createGitHubFallbackAdapter` function is 145 lines of inline object with duplicate API call patterns.

**Simplified Solution**:
```typescript
// Create a separate module for GitHub API calls
// packages/agent-runner/src/engines/workflow/github-fallback-client.ts
class GitHubFallbackClient {
  constructor(
    private token: string,
    private owner: string,
    private repo: string
  ) {}

  private async request<T>(path: string, options?: RequestInit): Promise<Result<T>> {
    try {
      const res = await fetch(`https://api.github.com${path}`, {
        headers: {
          Authorization: `token ${this.token}`,
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "OpenFarm",
          ...options?.headers,
        },
        ...options,
      });

      if (!res.ok) {
        return err(new Error(`GitHub API Error: ${res.statusText}`));
      }

      return ok(await res.json() as T);
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  getWorkItem(id: string) {
    return this.request<Record<string, unknown>>(`/repos/${this.owner}/${this.repo}/issues/${id}`)
      .then(data => ok(toWorkItem(data, this.repo, this.owner)));
  }

  createPullRequest(params: CreatePRParams) {
    return this.request<{ html_url: string }>('/repos/${this.owner}/${this.repo}/pulls', {
      method: 'POST',
      body: JSON.stringify({
        title: params.title,
        body: params.description,
        head: params.source,
        base: params.target,
      }),
    }).then(data => ok(data.html_url));
  }

  postComment(id: string, text: string) {
    return this.request(`/repos/${this.owner}/${this.repo}/issues/${id}/comments`, {
      method: 'POST',
      body: JSON.stringify({ body: text }),
    });
  }
}

// Simplified factory function
export function createGitHubFallbackAdapter(token: string, workItem: WorkItem): Result<PlatformAdapter> {
  const parseResult = parseGitHubUrl(workItem.repositoryUrl);
  if (!parseResult.ok) return parseResult;

  const { owner, repo } = parseResult.value;
  const client = new GitHubFallbackClient(token, owner, repo);

  return ok({
    getName: () => `GitHub (${owner}/${repo}) [Fallback]`,
    testConnection: () => client.request('/user').then(() => ok(true)),
    getWorkItem: (id: string) => client.getWorkItem(id),
    createPullRequest: (params) => client.createPullRequest(params),
    postComment: (id, text) => client.postComment(id, text),
  });
}
```

**Benefits**:
- Separates API logic from adapter interface
- Reduces factory file from 444 lines to ~150 lines
- Easier to test API client independently
- Reusable API client for other purposes

---

### Issue 2: Complex URL Parsing (Lines 85-109)

**Problem**:
`parseGitHubUrl` uses multiple regex patterns in a loop.

**Simplified Solution**:
```typescript
// Use URL API for structured parsing
export function parseGitHubUrl(url: string): Result<{ owner: string; repo: string }> {
  try {
    // Normalize URL
    const normalized = url.replace(/^git@/, 'https://').replace(/\.git$/, '');

    const urlObj = new URL(normalized);

    if (!urlObj.hostname.includes('github.com')) {
      return err(new Error(`Not a GitHub URL: ${url}`));
    }

    const pathParts = urlObj.pathname.split('/').filter(Boolean);
    if (pathParts.length < 2) {
      return err(new Error(`Invalid GitHub URL format: ${url}`));
    }

    const [owner, repo] = pathParts;
    return ok({ owner, repo });
  } catch (error) {
    return err(new Error(`Cannot parse GitHub URL: ${url}`));
  }
}
```

**Benefits**:
- Uses native URL parsing instead of regex
- Handles multiple formats automatically
- Easier to understand and maintain

---

## Provider Factory

**File**: `packages/provider-claude/src/claude-factory.ts` (141 lines)

### Issue 1: Duplicate Metadata Definition

**Problem**:
Metadata is defined in both the factory (lines 36-55) and the provider (lines 40-73).

**Simplified Solution**:
```typescript
// Define metadata once
const CLAUDE_METADATA: ProviderMetadata = {
  type: "claude",
  name: "Claude Code",
  version: "1.0.0",
  description: "Claude Code AI assistant with advanced code understanding and editing capabilities",
  packageName: "@openfarm/provider-claude",
  supportedFeatures: [
    "code-generation",
    "code-editing",
    "refactoring",
    "debugging",
    "code-analysis",
    "file-operations",
    "bash-execution",
    "web-search",
  ],
  configSchema: ClaudeConfigSchema,
  requiresExternal: true,
} as const;

// In factory
getMetadata(): ProviderMetadata {
  return CLAUDE_METADATA;
}

// In provider
getMetadata(): ProviderMetadata {
  return CLAUDE_METADATA;
}
```

**Benefits**:
- Single source of truth for metadata
- Prevents drift between factory and provider
- Reduces code duplication

---

### Issue 2: Over-Engineered Config Parsing (Lines 87-118)

**Problem**:
Separate `validateConfig`, `parseConfig`, `createConfigurationManager` functions for simple defaults.

**Simplified Solution**:
```typescript
function resolveConfig(config?: unknown): { timeout: number } {
  const DEFAULT_TIMEOUT = 600_000;

  if (!config || typeof config !== 'object') {
    return { timeout: DEFAULT_TIMEOUT };
  }

  const configObj = config as Record<string, unknown>;
  const timeout = typeof configObj.timeout === 'number' ? configObj.timeout : DEFAULT_TIMEOUT;

  if (timeout < 1000) {
    throw new Error('Timeout must be a number >= 1000');
  }

  return { timeout };
}

// In create():
const parsedConfig = resolveConfig(config);
```

**Benefits**:
- Combines validation and parsing
- Single function call
- Clear default handling

---

## Utils

**File**: `packages/utils/src/validation.ts`

### Issue 1: Spanish Comments

**Problem**:
Comments are in Spanish while the codebase is in English.

**Current Code** (Lines 3-32):
```typescript
const dangerousPatterns = [
  {
    pattern: /rm\s+-rf\s+\/(?!tmp|var\/tmp|\.local\/Trash)/i,
    description: "rm -rf / (excepto /tmp)",  // Spanish
  },
  {
    pattern: />\s*\/dev\/sd/i,
    description: "escribir a discos directamente",  // Spanish
  },
  // ...
];
```

**Simplified Solution**:
```typescript
const dangerousPatterns = [
  {
    pattern: /rm\s+-rf\s+\/(?!tmp|var\/tmp|\.local\/Trash)/i,
    description: "rm -rf / (except /tmp)",
  },
  {
    pattern: />\s*\/dev\/sd/i,
    description: "direct write to disks",
  },
  // ...
];
```

**Benefits**:
- Consistent language across codebase
- Better internationalization support
- Easier for non-Spanish contributors

---

**File**: `packages/utils/src/circuit-breaker.ts`

### Issue 1: Complex State Transitions (Lines 43-90)

**Problem**:
State transition logic is scattered across multiple methods.

**Simplified Solution**:
```typescript
type StateTransition = {
  from: CircuitBreakerState;
  to: CircuitBreakerState;
  condition: () => boolean;
  action: () => void;
};

const STATE_TRANSITIONS: StateTransition[] = [
  {
    from: 'open',
    to: 'half-open',
    condition: (cb) => Date.now() - cb.lastFailureTime >= cb.options.cooldownMs,
    action: (cb) => { cb.state = 'half-open'; cb.halfOpenAttempts = 0; },
  },
  {
    from: 'half-open',
    to: 'closed',
    condition: (cb) => cb.halfOpenAttempts >= cb.options.halfOpenAttempts,
    action: (cb) => { cb.state = 'closed'; cb.failures = 0; cb.halfOpenAttempts = 0; },
  },
];

private transitionState(): void {
  for (const { from, to, condition, action } of STATE_TRANSITIONS) {
    if (this.state === from && condition(this)) {
      action(this);
      logger.info(`Circuit breaker: ${from} -> ${to}`);
      return;
    }
  }
}
```

**Benefits**:
- Declarative state transitions
- Easier to add new states
- Clear visual representation of state machine

---

## General Recommendations

### 1. Prefer Early Returns

Instead of deeply nested conditionals, use early returns:

**Bad**:
```typescript
if (condition1) {
  if (condition2) {
    if (condition3) {
      // do work
    } else {
      return error;
    }
  }
}
```

**Good**:
```typescript
if (!condition1) return error;
if (!condition2) return error;
if (!condition3) return error;
// do work
```

---

### 2. Use Strategy Pattern for Variations

When you have multiple ways to accomplish the same task:

**Bad**:
```typescript
if (platform === 'github') {
  // 50 lines of GitHub logic
} else if (platform === 'azure') {
  // 50 lines of Azure logic
} else if (platform === 'gitlab') {
  // 50 lines of GitLab logic
}
```

**Good**:
```typescript
interface PlatformAdapter {
  createPR(params: PRParams): Promise<Result<string>>;
  postComment(id: string, text: string): Promise<Result<void>>;
}

const adapters: Record<string, PlatformAdapter> = {
  github: new GitHubAdapter(),
  azure: new AzureAdapter(),
  gitlab: new GitLabAdapter(),
};

const adapter = adapters[platform];
return adapter.createPR(params);
```

---

### 3. Extract Magic Strings and Numbers

**Bad**:
```typescript
if (error.includes('already used by worktree')) {
  // ...
}
setTimeout(() => { ... }, 30000);
```

**Good**:
```typescript
const WORKTREE_CONFLICT_ERROR = 'already used by worktree';
const KUBECTL_TIMEOUT_MS = 30_000;

if (error.includes(WORKTREE_CONFLICT_ERROR)) {
  // ...
}
setTimeout(() => { ... }, KUBECTL_TIMEOUT_MS);
```

---

### 4. Prefer Native APIs Over Regex

**Bad**:
```typescript
const patterns = [
  /github\.com[/:]([^/]+)\/([^/.]+)(?:\.git)?$/i,
  /git@github\.com:([^/]+)\/([^/.]+)(?:\.git)?$/i,
];
```

**Good**:
```typescript
const url = new URL(githubUrl);
const [owner, repo] = url.pathname.split('/').filter(Boolean);
```

---

### 5. Use Maps for Conditional Lookups

**Bad**:
```typescript
switch (action) {
  case StepAction.GIT_CHECKOUT: return GitCheckoutSchema;
  case StepAction.GIT_BRANCH: return GitBranchSchema;
  case StepAction.GIT_COMMIT: return GitCommitSchema;
  case StepAction.GIT_PUSH: return GitPushSchema;
  // ... 10 more cases
}
```

**Good**:
```typescript
const actionSchemas = {
  [StepAction.GIT_CHECKOUT]: GitCheckoutSchema,
  [StepAction.GIT_BRANCH]: GitBranchSchema,
  [StepAction.GIT_COMMIT]: GitCommitSchema,
  [StepAction.GIT_PUSH]: GitPushSchema,
  // ...
} as const satisfies Record<StepAction, z.ZodTypeAny>;

return actionSchemas[action];
```

---

### 6. Limit Function Length

Functions should be under 50 lines. If longer, extract:

- Input validation logic
- Configuration building
- Helper functions
- Error handling

**Example**: `checkoutBranch` (290 lines) should be split into:
- `verifyRepositoryExists()`
- `configureGitUser()`
- `fetchLatestChanges()`
- `createOrCheckoutBranch()`

---

### 7. Avoid Flag Parameters

**Bad**:
```typescript
function execute(options: { verbose?: boolean; force?: boolean; dryRun?: boolean }) {
  if (options.verbose) { /* ... */ }
  if (options.force) { /* ... */ }
  if (options.dryRun) { /* ... */ }
}
```

**Good**:
```typescript
interface ExecutionOptions {
  mode: 'normal' | 'verbose' | 'dry-run';
  force: boolean;
}

function execute(options: ExecutionOptions) {
  if (options.mode === 'verbose') { /* ... */ }
}
```

---

### 8. Use Composition for Complex Objects

**Bad**:
```typescript
const engine = {
  provider: validatedConfig.provider || (useOpenCode ? 'opencode' : 'claude-code'),
  model: resolvedModel,
  previewMode: stepPreviewMode,
  chatOnly: validatedConfig.chatOnly,
  mcpServers: defaultEngineOptions.mcpServers,
  onLog: defaultEngineOptions.onLog,
  onChanges: defaultEngineOptions.onChanges,
  onChatMessage: defaultEngineOptions.onChatMessage,
  maxIterations: tuiConfig?.maxIterations,
  ...runtimeOptions,
};
```

**Good**:
```typescript
const baseOptions = {
  mcpServers: defaultEngineOptions.mcpServers,
  onLog: defaultEngineOptions.onLog,
  onChanges: defaultEngineOptions.onChanges,
  onChatMessage: defaultEngineOptions.onChatMessage,
};

const engineOptions: EngineOptions = {
  ...baseOptions,
  provider: validatedConfig.provider || (useOpenCode ? 'opencode' : 'claude-code'),
  model: resolvedModel,
  previewMode: stepPreviewMode,
  chatOnly: validatedConfig.chatOnly,
  maxIterations: tuiConfig?.maxIterations,
  ...runtimeOptions,
};
```

---

## Priority Recommendations

### High Priority (Biggest Impact)

1. **Refactor `agent-executor.ts`** - Extract engine creation logic
   - Impact: ~200 lines reduction
   - Risk: Low (pure refactoring)

2. **Split `checkoutBranch` in git-adapter** - 290 lines to ~50 lines
   - Impact: ~240 lines reduction
   - Risk: Medium (changes complex logic)

3. **Simplify expression replacement** - Use property mapping
   - Impact: ~40 lines reduction
   - Risk: Low (well-defined behavior)

### Medium Priority

4. **Unify kubectl execution** - Single timeout wrapper
   - Impact: ~100 lines reduction
   - Risk: Low

5. **Extract GitHub API client** - Separate module
   - Impact: ~100 lines reduction
   - Risk: Low

6. **Clean up provider factories** - Remove duplication
   - Impact: ~30 lines reduction
   - Risk: Low

### Low Priority

7. **Translate Spanish comments** - Language consistency
   - Impact: Cosmetic
   - Risk: None

8. **Simplify circuit-breaker** - Use strategy pattern
   - Impact: Better maintainability
   - Risk: Low

---

## Implementation Strategy

### Phase 1: Safe Refactors (Low Risk)
- Translate Spanish comments to English
- Extract constant strings
- Use maps for conditional lookups
- Simplify URL parsing

### Phase 2: Structural Changes (Medium Risk)
- Extract engine creation logic
- Split long functions
- Create shared utilities

### Phase 3: Major Refactors (Higher Risk)
- Refactor git-adapter checkoutBranch
- Unify kubectl execution patterns
- Create GitHub API client module

---

## Testing Strategy

After each refactoring:

1. Run existing tests: `bun test`
2. Run typecheck: `bun run typecheck`
3. Run linting: `bun run lint`
4. Manual testing of affected workflows

---

## Summary

| File | Current Lines | Estimated After | Reduction | Priority |
|-------|--------------|----------------|-----------|----------|
| agent-executor.ts | 1288 | ~1088 | 200 | High |
| planning-executor.ts | 766 | ~666 | 100 | Medium |
| git-adapter/index.ts | 595 | ~355 | 240 | High |
| worktree/create.ts | 372 | ~302 | 70 | Medium |
| platform-adapter-factory.ts | 444 | ~344 | 100 | Medium |
| claude-factory.ts | 141 | ~121 | 20 | Low |

**Total Potential Reduction**: ~730 lines of simplified, more maintainable code

---

**Remember**: Simplification is an ongoing process. Start with high-priority items and iterate. Always write tests before refactoring complex logic.
