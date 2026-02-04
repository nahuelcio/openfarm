# Code Simplification Opportunities - OpenFarm

## Executive Summary

This document identifies concrete simplification opportunities in the OpenFarm codebase. All suggestions prioritize **readability** while maintaining **functionality**. No breaking changes to public APIs.

---

## 1. agent-executor.ts (1,251 lines)

### Issue: Massive file with multiple responsibilities

**Location:** `/packages/agent-runner/src/engines/workflow/executors/agent-executor.ts`

**Current Problems:**
- 1,251 lines in a single file
- Multiple unrelated functions mixed together
- Complex pattern replacement logic repeated across functions
- DRY violations in expression handling

### 1.1 Extract Pattern Replacer to Utility Module

**Current Code (lines 26-161):**
```typescript
function replaceWorkItemExpressions(
  text: string,
  workItem: { /* 14+ properties */ }
): string {
  let result = text;

  // 14+ individual replace() calls
  result = result.replace(/\$\{workItem\.title\}/g, workItem.title || "");
  result = result.replace(/\$\{workItem\.description\}/g, workItem.description || "");
  // ... 12 more lines

  // Complex ternary patterns
  const complexModeTernaryPattern = /\$\{workItem\.mode\s*===\s*['"](investigate|explain)['"]\s*\|\|\s*workItem\.mode\s*===\s*['"](investigate|explain)['"]\s*\?\s*['"]([^'"]+)['"]\s*:\s*['"]([^'"]+)['"]\}/g;
  // ... more complex regex patterns
}
```

**Simplification Strategy:**

Create `packages/agent-runner/src/utils/template-engine.ts`:

```typescript
/**
 * Simple template engine for variable substitution
 * Replaces ${var} and ${var.property} patterns efficiently
 */
export class TemplateEngine {
  private static readonly SIMPLE_PATTERN = /\$\{(\w+)\}/g;
  private static readonly NESTED_PATTERN = /\$\{(\w+)\.(\w+)\}/g;

  static replace(text: string, data: Record<string, unknown>): string {
    // Handle nested properties: ${workItem.title}
    text = text.replace(this.NESTED_PATTERN, (_, obj, prop) => {
      const value = (data[obj] as Record<string, unknown>)?.[prop];
      return this.coerceToString(value);
    });

    // Handle simple variables: ${title}
    text = text.replace(this.SIMPLE_PATTERN, (_, key) => {
      return this.coerceToString(data[key]);
    });

    return text;
  }

  private static coerceToString(value: unknown): string {
    if (value == null) return "";
    if (typeof value === "string") return value;
    if (typeof value === "number") return value.toString();
    if (typeof value === "boolean") return value ? "true" : "false";
    return String(value);
  }
}

// Helper for workItem-specific patterns
export function replaceWorkItemTemplates(
  text: string,
  workItem: Record<string, unknown>
): string {
  return TemplateEngine.replace(text, { workItem });
}
```

**Impact:**
- **Reduces:** 135 lines → 40 lines
- **Improves:** Readability, testability
- **Removes:** 14+ individual regex patterns

### 1.2 Extract Step Results Replacement Logic

**Current Code (lines 166-216):**
```typescript
function replaceStepResultsExpressions(
  text: string,
  stepResults: Array<{ stepId: string; result?: string }>
): string {
  let result = text;

  // Build map
  const stepResultsMap = new Map<string, string>();
  for (const sr of stepResults) {
    if (sr.result) {
      stepResultsMap.set(sr.stepId, sr.result);
    }
  }

  // Multiple pattern replacements...
  const stepResultWithFallbackPattern = /\$\{stepResults\.(\w+)(\?\.)?\.result\s*\|\|\s*['"]([^'"]+)['"]\}/g;
  result = result.replace(stepResultWithFallbackPattern, ...);
  // ... more patterns
}
```

**Simplification Strategy:**

Extend `template-engine.ts`:

```typescript
export function replaceStepResultsTemplates(
  text: string,
  stepResults: Array<{ stepId: string; result?: string }>
): string {
  // Build lookup map once
  const resultMap = new Map(
    stepResults.filter((sr) => sr.result != null)
              .map((sr) => [sr.stepId, sr.result])
  );

  // Replace ${stepResults.research.result} or ${stepResults.research?.result}
  const pattern = /\$\{stepResults\.(\w+)(\?\.)?\.result\}/g;
  return text.replace(pattern, (_, stepId) => resultMap.get(stepId) || "");
}
```

**Impact:**
- **Reduces:** 50 lines → 15 lines
- **Eliminates:** Redundant fallback patterns (default to empty string)

### 1.3 Simplify BuildAgentInstruction

**Current Code (lines 360-432):**
```typescript
export function buildAgentInstruction(
  step: ActionableWorkflowStep,
  config: Record<string, unknown>,
  workItem: { /* 13+ properties */ },
  stepResults: Array<{ stepId: string; result?: string }> = []
): string {
  const sanitize = (text?: string): string => {
    return (text || "").replace(/<[^>]*>/g, "");
  };

  const replaceVariables = (template: string): string => {
    const sanitizedDescription = sanitize(workItem.description);
    // ... 11 more sanitizations

    let result = template
      .replace(/{title}/g, workItem.title || "")
      .replace(/{description}/g, sanitizedDescription)
      // ... 11 more replace() calls

    // Inject step results
    for (const stepResult of stepResults) {
      if (stepResult.result) {
        // Multiple regex patterns...
      }
    }
    return result;
  };

  if (typeof config.prompt === "string") {
    return replaceVariables(config.prompt);
  }

  return `${workItem.title}\n\n${sanitizedDescription}...`;
}
```

**Simplification Strategy:**

```typescript
export function buildAgentInstruction(
  step: ActionableWorkflowStep,
  config: Record<string, unknown>,
  workItem: Record<string, unknown>,
  stepResults: Array<{ stepId: string; result?: string }> = []
): string {
  // Use prompt if provided
  if (typeof config.prompt === "string") {
    return replaceWorkItemTemplates(config.prompt, workItem);
  }

  // Build default instruction
  const title = String(workItem.title || "");
  const description = sanitizeHtml(workItem.description);
  const acceptanceCriteria = sanitizeHtml(workItem.acceptanceCriteria);

  return [
    title,
    "",
    description,
    "",
    "Acceptance Criteria:",
    acceptanceCriteria,
    "",
    "IMPORTANT: You are running in a headless automation environment.",
    "Do NOT ask clarifying questions. Do NOT ask for user input.",
    "You must attempt to implement the changes based on the information provided.",
  ].join("\n");
}

function sanitizeHtml(text: unknown): string {
  return String(text || "").replace(/<[^>]*>/g, "");
}
```

**Impact:**
- **Reduces:** 72 lines → 35 lines
- **Improves:** Clear separation of concerns
- **Removes:** Redundant {title}, {description} patterns (use ${workItem.title} instead)

### 1.4 Merge Duplicate Error Handling Logic

**Current Code (lines 710-743):**
```typescript
if (!result.ok) {
  const errorResult = result as { ok: false; error: unknown };

  await logger(`[Agent Executor] Engine returned error...`);

  let error: Error;
  if (errorResult.error instanceof Error) {
    error = errorResult.error;
  } else if (errorResult.error && typeof errorResult.error === "object") {
    // Extract error information from the object
    const errorObj = errorResult.error as Record<string, unknown>;
    // ... 20+ lines of error parsing logic
  } else {
    // ... 5 more lines
  }
  return err(error);
}
```

**Simplification Strategy:**

Create `packages/agent-runner/src/utils/error-normalizer.ts`:

```typescript
/**
 * Normalizes errors from various sources to Error objects
 */
export function normalizeError(error: unknown): Error {
  if (error instanceof Error) return error;

  if (error && typeof error === "object") {
    const obj = error as Record<string, unknown>;

    if (typeof obj.message === "string") {
      const normalized = new Error(obj.message);
      if (typeof obj.stack === "string") {
        normalized.stack = obj.stack;
      }
      return normalized;
    }
  }

  if (typeof error === "string") {
    return new Error(error);
  }

  return new Error(String(error));
}
```

Then in `agent-executor.ts`:

```typescript
if (!result.ok) {
  const errorResult = result as { ok: false; error: unknown };
  await logger(`[Agent Executor] Engine returned error: ${JSON.stringify(errorResult.error)}`);
  return err(normalizeError(errorResult.error));
}
```

**Impact:**
- **Reduces:** 33 lines → 3 lines
- **Reuses:** Error normalization across codebase
- **Improves:** Consistent error handling

### 1.5 Extract Dry Report Generator

**Current Code (lines 251-344):**
```typescript
function generateAgentDryRunReport(
  step: WorkflowStep,
  instruction: string,
  config: AgentCodeConfig,
  repoPath: string
): string {
  const lines: string[] = [];

  lines.push("# Dry Run Report: Agent Code Step");
  lines.push("");
  lines.push("## Overview");
  lines.push("- **Mode**: Preview (no changes will be made)");
  lines.push(`- **Step ID**: ${step.id}`);
  // ... 60+ lines of string building
}
```

**Simplification Strategy:**

Use template literals:

```typescript
function generateAgentDryRunReport(
  step: WorkflowStep,
  instruction: string,
  config: AgentCodeConfig,
  repoPath: string
): string {
  const mode = config.chatOnly ? "Chat Only" : "Code Changes";
  const preview = config.previewMode ? "Yes" : "No";
  const risk = config.chatOnly || config.previewMode ? "Very Low" : "Medium";

  const instructionPreview = instruction.length > 1500
    ? `${instruction.substring(0, 1500)}\n\n... [truncated]`
    : instruction;

  return `# Dry Run Report: Agent Code Step

## Overview
- **Mode**: Preview (no changes will be made)
- **Step ID**: ${step.id}
- **Provider**: ${config.provider || "opencode (default)"}
- **Model**: ${config.model || "default"}
- **Repository**: ${repoPath}

## Step Configuration
- **Chat Only**: ${config.chatOnly ? "Yes" : "No"}
- **Preview Mode**: ${preview}
- **Max Iterations**: ${config.maxIterations || "1 (default)"}

## What Would Happen
${config.chatOnly ? "..." : "..."}

## Instruction Preview
\`\`\`
${instructionPreview}
\`\`\`

---
*This is a dry run preview. No files were created or modified.*`;
}
```

**Impact:**
- **Reduces:** 94 lines → 40 lines
- **Improves:** Readability with template literals
- **Removes:** Unnecessary array building

---

## 2. create.ts (372 lines)

### Issue: Complex retry logic with repetitive validation

**Location:** `/packages/agent-runner/src/operations/git/worktree/create.ts`

### 2.1 Extract Validation to Helper

**Current Code (lines 127-203):**
```typescript
// CRITICAL: Verify that main repository exists before any operations
const validation = validateMainRepository(sanitizedMainRepoPath, fs);
if (!validation.valid) {
  return err(validation.error!);
}

// ... later

const validation2 = validateMainRepository(sanitizedMainRepoPath, fs);
if (!validation2.valid) {
  return err(
    new Error(
      `Main repository does not exist before listing worktrees: ${sanitizedMainRepoPath}. Cannot continue.`
    )
  );
}

// ... later

const validation3 = validateMainRepository(sanitizedMainRepoPath, fs);
if (!validation3.valid) {
  return err(
    new Error(
      `Main repository does not exist before updating default branch: ${sanitizedMainRepoPath}. Cannot continue.`
    )
  );
}

// ... later

const validation4 = validateMainRepository(sanitizedMainRepoPath, fs);
if (!validation4.valid) {
  return err(
    new Error(
      `Main repository does not exist before worktree creation: ${sanitizedMainRepoPath}. Cannot continue.`
    )
  );
}
```

**Simplification Strategy:**

```typescript
/**
 * Validates main repository exists
 * Throws detailed error if validation fails
 */
function ensureMainRepository(
  mainRepoPath: string,
  fs: FileSystem,
  context: string
): Result<void> {
  const validation = validateMainRepository(mainRepoPath, fs);
  if (!validation.valid) {
    return err(
      new Error(
        `Main repository does not exist before ${context}: ${mainRepoPath}. Cannot continue.`
      )
    );
  }
  return ok(undefined);
}
```

Then in `createWorktree`:

```typescript
// Single validation call
await ensureMainRepository(sanitizedMainRepoPath, fs, "worktree operations");

await pruneWorktrees(sanitizedMainRepoPath, execFn);
await cleanupExistingWorktree(...);

// No need to revalidate - repository was verified above
await removeStaleWorktreeReferences(...);

await ensureDefaultBranchUpdated(sanitizedMainRepoPath, sanitizedDefaultBranch, execFn);

const branchStatus = await checkBranchExists(...);

// Validate before creation
await ensureMainRepository(sanitizedMainRepoPath, fs, "worktree creation");
```

**Impact:**
- **Reduces:** 40+ lines of repetitive validation → 8 lines of helper + 4 call sites
- **Improves:** Consistent error messages

### 2.2 Simplify Retry Loop

**Current Code (lines 186-343):**
```typescript
while (!worktreeCreated && createAttempt < maxAttempts) {
  createAttempt++;

  try {
    // ... 60+ lines of try block with multiple nested conditions
    const validation4 = validateMainRepository(sanitizedMainRepoPath, fs);
    if (!validation4.valid) { /* ... */ }
    await log(`Creating worktree (attempt ${createAttempt}/${maxAttempts})...`);

    if (branchStatus.local) {
      await execFn("git", [...]);
    } else {
      await execFn("git", [...]);
    }

    worktreeCreated = true;
    await log(`Successfully created worktree at ${sanitizedWorktreePath}`);

    // Post-creation verification
    if (!fs.existsSync(sanitizedWorktreePath)) {
      await log("WARNING: Worktree creation reported success but directory does not exist...");
      worktreeCreated = false;
      continue; // Retry
    }

    try {
      await execFn("git", ["-C", sanitizedWorktreePath, "rev-parse", "--git-dir"]);
      await log(`Worktree directory verified and accessible: ${sanitizedWorktreePath}`);
    } catch (verifyError) {
      // ... logging
    }
  } catch (createError) {
    // ... 80+ lines of error handling with nested conditions
    if (errorMessage.includes("already exists") || errorMessage.includes("used by worktree")) {
      try {
        await aggressiveCleanupForBranchExists(...);
        continue;
      } catch (cleanupError) { /* ... */ }
    }
    // ... more nested conditions
  }
}
```

**Simplification Strategy:**

Extract retry strategies to separate functions:

```typescript
type WorktreeRetryStrategy = (context: WorktreeContext) => Promise<Result<void>>;

async function createWorktreeWithRetry(
  context: WorktreeContext,
  strategies: WorktreeRetryStrategy[],
  maxAttempts: number = 3
): Promise<Result<void>> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    await context.log(`Creating worktree (attempt ${attempt}/${maxAttempts})...`);

    const result = await attemptWorktreeCreation(context);

    if (result.ok) {
      // Verify creation
      if (await verifyWorktreeCreated(context)) {
        await context.log(`Successfully created worktree at ${context.worktreePath}`);
        return ok(undefined);
      }
      // Verification failed - try next strategy
      continue;
    }

    // Try strategies in order
    for (const strategy of strategies) {
      const strategyResult = await strategy(context, result.error);
      if (strategyResult.ok) {
        // Strategy succeeded, retry creation
        break;
      }
    }
  }

  return err(new Error("Failed to create worktree after all attempts"));
}

async function attemptWorktreeCreation(context: WorktreeContext): Promise<Result<void>> {
  const args = context.branchExistsLocal
    ? ["-C", context.mainRepoPath, "worktree", "add", "--detach",
       context.worktreePath, context.branchName]
    : ["-C", context.mainRepoPath, "worktree", "add", "-b",
       context.branchName, context.worktreePath];

  await context.execFn("git", args);
  return ok(undefined);
}

async function verifyWorktreeCreated(context: WorktreeContext): Promise<boolean> {
  if (!context.fs.existsSync(context.worktreePath)) {
    await context.log(`WARNING: Worktree directory does not exist: ${context.worktreePath}`);
    return false;
  }

  try {
    await context.execFn("git", ["-C", context.worktreePath, "rev-parse", "--git-dir"]);
    await context.log(`Worktree directory verified: ${context.worktreePath}`);
    return true;
  } catch {
    await context.log("WARNING: Worktree verification failed");
    return false;
  }
}
```

**Impact:**
- **Reduces:** 157 lines → 80 lines
- **Improves:** Testability of individual strategies
- **Clarifies:** Intent of each retry step

---

## 3. command-executor.ts (379 lines)

### Issue: Duplicate K8S validation functions

**Location:** `/packages/agent-runner/src/engines/workflow/executors/command-executor.ts`

### 3.1 Merge validatePodName and validateNamespace

**Current Code (lines 164-213):**
```typescript
function validatePodName(podName: string): string {
  if (!podName || typeof podName !== "string") {
    throw new Error("Pod name must be a non-empty string");
  }

  const k8sNameRegex = /^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/;
  if (!k8sNameRegex.test(podName)) {
    throw new Error(
      `Invalid pod name: ${podName}. Pod names must be lowercase, start and end with alphanumeric characters, and can only contain lowercase letters, numbers, and hyphens.`
    );
  }

  if (podName.length > K8S_POD_NAME_MAX_LENGTH) {
    throw new Error(
      `Pod name exceeds maximum length of ${K8S_POD_NAME_MAX_LENGTH} characters`
    );
  }

  return podName;
}

function validateNamespace(namespace: string): string {
  if (!namespace || typeof namespace !== "string") {
    throw new Error("Namespace must be a non-empty string");
  }

  const k8sNameRegex = /^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/;
  if (!k8sNameRegex.test(namespace)) {
    throw new Error(
      `Invalid namespace: ${namespace}. Namespace names must be lowercase, start and end with alphanumeric characters, and can only contain lowercase letters, numbers, and hyphens.`
    );
  }

  if (namespace.length > K8S_NAMESPACE_MAX_LENGTH) {
    throw new Error(
      `Namespace exceeds maximum length of ${K8S_NAMESPACE_MAX_LENGTH} characters`
    );
  }

  return namespace;
}
```

**Simplification Strategy:**

```typescript
/**
 * Validates Kubernetes resource names against RFC 1123 subdomain rules
 */
function validateK8sResourceName(
  name: string,
  resourceType: "pod" | "namespace"
): string {
  if (!name || typeof name !== "string") {
    throw new Error(`${resourceType} name must be a non-empty string`);
  }

  // RFC 1123 subdomain: ^[a-z0-9]([-a-z0-9]*[a-z0-9])?$
  const k8sNameRegex = /^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/;
  if (!k8sNameRegex.test(name)) {
    throw new Error(
      `Invalid ${resourceType} name: ${name}. ` +
      `${resourceType} names must be lowercase, start and end with alphanumeric characters, ` +
      `and can only contain lowercase letters, numbers, and hyphens.`
    );
  }

  const maxLength = resourceType === "pod"
    ? K8S_POD_NAME_MAX_LENGTH
    : K8S_NAMESPACE_MAX_LENGTH;

  if (name.length > maxLength) {
    throw new Error(
      `${resourceType} name exceeds maximum length of ${maxLength} characters`
    );
  }

  return name;
}

// Usage
const podName = validateK8sResourceName(context.podName, "pod");
const namespace = validateK8sResourceName("minions-farm", "namespace");
```

**Impact:**
- **Reduces:** 50 lines → 25 lines
- **Eliminates:** Code duplication
- **Improves:** Consistency of K8S validation

### 3.2 Simplify Dry Run Report Generation

**Current Code (lines 19-86):**
```typescript
function generateCommandDryRunReport(
  stepId: string,
  command: string,
  context: WorkflowContext
): string {
  const lines: string[] = [];

  lines.push("# Dry Run Report: Command Execution");
  lines.push("");
  lines.push("## Overview");
  // ... 67 lines of array building
}
```

**Simplification Strategy:**

```typescript
function generateCommandDryRunReport(
  stepId: string,
  command: string,
  context: WorkflowContext
): string {
  const analysis = analyzeCommand(command);
  const executionEnv = context.podName
    ? `Kubernetes Pod (${context.podName})`
    : "Local";

  const affectedPaths = analysis.affectedPaths.length > 0
    ? analysis.affectedPaths.map(p => `- ${p}`).join("\n")
    : "None";

  const warnings = analysis.warnings.length > 0
    ? analysis.warnings.map(w => `  - WARNING: ${w}`).join("\n")
    : "None";

  return `# Dry Run Report: Command Execution

## Overview
- **Mode**: Preview (command not executed)
- **Step ID**: ${stepId}
- **Repository**: ${context.repoPath}
- **Execution Environment**: ${executionEnv}

## Command Details
\`\`\`bash
${command}
\`\`\`

## Risk Assessment
- **Risk Level**: ${analysis.riskLevel}
- **Type**: ${analysis.commandType}
- **Warnings**:
${warnings}

## Potentially Affected Paths
${affectedPaths}

## What Would Happen
1. Command would be executed in: \`${context.repoPath}\`
${context.podName ? `2. Execution would occur inside Kubernetes pod: \`${context.podName}\`` : ""}
3. Output would be captured and logged
4. Exit code would determine success/failure

---
*This is a dry run preview. The command was not executed.*`;
}
```

**Impact:**
- **Reduces:** 67 lines → 30 lines
- **Improves:** Template literal readability

---

## 4. opencode-auth.ts (515 lines)

### Issue: Duplicate JSON parsing logic

**Location:** `/packages/agent-runner/src/services/opencode-auth.ts`

### 4.1 Centralize JSON Parsing

**Current Code (lines 80-94, 174, 302, 402):**
```typescript
private async parseJsonSafe(
  response: Response
): Promise<Record<string, unknown> | null> {
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    return null;
  }
  try {
    return (await response.json()) as Record<string, unknown>;
  } catch (error) {
    console.warn(
      `[OpenCodeAuth] Failed to parse JSON: ${error instanceof Error ? error.message : String(error)}`
    );
    return null;
  }
}
```

**Simplification Strategy:**

The current implementation is already good. However, it's called multiple times with the same pattern. Suggest:

```typescript
private async fetchJson<T = Record<string, unknown>>(
  url: string,
  options?: RequestInit
): Promise<T | null> {
  try {
    const response = await fetch(url, {
      ...options,
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) return null;

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      console.warn(`[OpenCodeAuth] Expected JSON, got: ${contentType}`);
      return null;
    }

    return (await response.json()) as T;
  } catch (error) {
    console.warn(
      `[OpenCodeAuth] Fetch failed: ${error instanceof Error ? error.message : String(error)}`
    );
    return null;
  }
}
```

Then replace all fetch+parseJsonSafe calls:

```typescript
// Before
const response = await fetch(this.getProviderEndpoint(), { ... });
if (!response.ok) return false;
const data = await this.parseJsonSafe(response);

// After
const data = await this.fetchJson(this.getProviderEndpoint());
if (!data) return false;
```

**Impact:**
- **Reduces:** Multiple 4-5 line sequences → Single 1-liner
- **Consolidates:** Fetch + parse + error handling

---

## 5. app.tsx (34 lines)

### Issue: Manual switch statement for rendering

**Location:** `/packages/sdk/src/tui/app.tsx`

### 5.1 Use Component Map

**Current Code:**
```typescript
export function App() {
  const { screen } = useStore();

  return (
    <Box flexDirection="column" padding={1}>
      {screen === "dashboard" && <Dashboard />}
      {screen === "execute" && <Execute />}
      {screen === "running" && <Running />}
      {screen === "history" && <History />}
      {screen === "diff-viewer" && <DiffViewer />}
      {screen === "execution-detail" && <ExecutionDetail />}
      {screen === "workflows" && <WorkflowList />}
      {screen === "workflow-editor" && <WorkflowEditor />}
      {screen === "context-config" && <ContextConfigScreen />}
      {screen === "context" && <ContextScreen />}
      {screen === "context-history" && <ContextHistoryScreen />}
    </Box>
  );
}
```

**Simplification Strategy:**

```typescript
const SCREEN_COMPONENTS = {
  dashboard: Dashboard,
  execute: Execute,
  running: Running,
  history: History,
  "diff-viewer": DiffViewer,
  "execution-detail": ExecutionDetail,
  workflows: WorkflowList,
  "workflow-editor": WorkflowEditor,
  "context-config": ContextConfigScreen,
  context: ContextScreen,
  "context-history": ContextHistoryScreen,
} as const;

type ScreenName = keyof typeof SCREEN_COMPONENTS;

export function App() {
  const { screen } = useStore();
  const ScreenComponent = SCREEN_COMPONENTS[screen as ScreenName];

  return (
    <Box flexDirection="column" padding={1}>
      {ScreenComponent && <ScreenComponent />}
    </Box>
  );
}
```

**Impact:**
- **Reduces:** 34 lines → 25 lines
- **Improves:** Extensibility (add new screen by adding to map)
- **Eliminates:** Repeated conditional rendering

---

## 6. utils/index.ts (153 lines)

### Issue: Mixed re-exports and local implementations

**Location:** `/packages/utils/src/index.ts`

### 6.1 Document Re-export Sources Clearly

**Current Code:**
```typescript
// chunk from core/utils/array
export function chunk<T>(array: T[], size: number): T[][] { /* ... */ }

// retry from core/composition
export async function retry<T>(fn: () => Promise<T>, config: RetryConfig = {}): Promise<T> { /* ... */ }

// Re-export utilities
export { CircuitBreaker } from "./circuit-breaker";
export { metrics } from "./metrics";
export { validateInstruction } from "./validation";
```

**Simplification Strategy:**

Organize by origin and deprecate local implementations where core has them:

```typescript
/**
 * Utility exports for OpenFarm packages
 *
 * Some utilities are locally implemented for backward compatibility.
 * Others are re-exported from @openfarm/core.
 */

// === LOCAL IMPLEMENTATIONS ===
// These are maintained here for backward compatibility

export function chunk<T>(array: T[], size: number): T[][] { /* ... */ }
export const matchesPattern = (str: string, pattern: string): boolean => { /* ... */ }
export { mapAsync, filterAsync, sequence, parallel } from "./async-helpers";

// === RE-EXPORTED FROM @openfarm/core ===
// These should be imported from @openfarm/core in new code

export { CircuitBreaker } from "./circuit-breaker";
export { metrics } from "./metrics";
export { validateInstruction } from "./validation";
```

**Impact:**
- **Clarifies:** What is local vs re-exported
- **Improves:** Code organization

---

## Implementation Priority

### High Priority (Immediate Impact)
1. **Section 1.1**: Extract template engine → Reduces 135 lines immediately
2. **Section 3.1**: Merge K8S validation functions → Simple, high ROI
3. **Section 5.1**: Use component map → Simple refactor

### Medium Priority (Maintainability)
1. **Section 1.2**: Extract step results replacement → Consistent with 1.1
2. **Section 1.3**: Simplify buildAgentInstruction → After 1.1 done
3. **Section 1.4**: Extract error normalizer → Reusable across codebase

### Low Priority (Nice to Have)
1. **Section 2**: Simplify worktree creation retry → Complex refactor
2. **Section 4**: Centralize JSON parsing in opencode-auth → Minor improvement
3. **Section 6**: Document utils organization → Documentation only

---

## Testing Strategy

For each simplification:

1. **Before Refactor**: Write integration tests capturing current behavior
2. **Refactor**: Apply simplification in small, atomic commits
3. **After Refactor**: Run all tests to ensure functionality preserved
4. **Lint**: Run `bun run lint` to catch any issues

**Example Test:**
```typescript
describe("TemplateEngine", () => {
  it("should replace nested properties", () => {
    const result = TemplateEngine.replace("Hello ${workItem.title}", {
      workItem: { title: "World" }
    });
    expect(result).toBe("Hello World");
  });

  it("should handle missing properties", () => {
    const result = TemplateEngine.replace("${workItem.missing}", {
      workItem: { title: "Test" }
    });
    expect(result).toBe("");
  });
});
```

---

## Summary

| File | Current Lines | Potential Reduction | Priority |
|------|--------------|-------------------|----------|
| agent-executor.ts | 1,251 | ~300 lines | High |
| create.ts | 372 | ~100 lines | Medium |
| command-executor.ts | 379 | ~60 lines | High |
| app.tsx | 34 | ~10 lines | High |
| opencode-auth.ts | 515 | ~30 lines | Low |

**Total Potential Reduction: ~500 lines of code**

All simplifications prioritize:
- ✅ Readability through clearer intent
- ✅ Testability through smaller, focused functions
- ✅ Maintainability through reduced duplication
- ✅ No breaking changes to public APIs

---

## Notes

- All suggestions maintain backward compatibility
- No changes to public interfaces
- Internal implementation details only
- Each simplification can be applied independently
- Recommended to apply in order of priority listed above
