import { exec, spawn } from "node:child_process";
import { promisify } from "node:util";
import { StepAction } from "@openfarm/core/constants/actions";
import {
  checkoutBranch,
  commitChanges,
  type FileSystem,
  type ExecFunction as GitAdapterExecFunction,
  type GitConfig,
  pushBranch,
} from "@openfarm/git-adapter";
import { createWorktree, removeWorktree } from "@openfarm/git-worktree";
import { err, ok, type Result } from "@openfarm/result";
import type { StepExecutionRequest } from "../types";
import {
  type GitBranchConfig,
  type GitCheckoutConfig,
  type GitCommitConfig,
  type GitPushConfig,
  type GitWorktreeConfig,
  validateConfig,
} from "./validation";

// Constants for kubectl operations
const KUBECTL_EXEC_TIMEOUT_MS = 5000; // 5 second timeout for kubectl exec operations

/**
 * Default exec function for local execution (when not using Pod)
 * Uses Node.js exec with promisify
 */
const defaultExecFn: GitAdapterExecFunction = promisify(
  exec
) as GitAdapterExecFunction;

/**
 * Helper function to setup Pod-aware git configuration, exec function, and file system.
 * This reduces code duplication across git executor functions.
 *
 * @param context - Workflow context containing podName, repoUrl, workItem, and gitConfig
 * @param logger - Logger function
 * @param includeFileSystem - Whether to include FileSystem (not needed for git.branch)
 * @returns Object with updated gitConfig, execFn, and fs (if includeFileSystem is true)
 */
function setupPodAwareGit(
  context: StepExecutionRequest["context"],
  logger: StepExecutionRequest["logger"],
  includeFileSystem = true
): {
  updatedGitConfig: GitConfig;
  execFn: GitAdapterExecFunction;
  fs: FileSystem | undefined;
} {
  const { gitConfig, podName, repoUrl, workItem } = context;

  // If using Kubernetes Pod, update gitConfig to use Pod path and create kubectl exec wrapper
  const updatedGitConfig = podName
    ? {
        ...gitConfig,
        repoPath: getPodRepoPath(repoUrl, workItem.id),
      }
    : gitConfig;

  // Use kubectl exec function for Pods, or default exec function for local execution
  const execFn: GitAdapterExecFunction = podName
    ? createKubectlExecFunction(podName, logger)
    : defaultExecFn;

  // For Pods, create a FileSystem that checks existence via kubectl exec
  const fs: FileSystem | undefined =
    includeFileSystem && podName
      ? createPodFileSystem(podName, logger)
      : undefined;

  return { updatedGitConfig, execFn, fs };
}

/**
 * Executes git.checkout action.
 * This function performs I/O operations (git commands) but receives all dependencies explicitly,
 * making it testable through dependency injection. The function is deterministic given the same inputs.
 *
 * @param request - Step execution request containing step, context, logger, flags, and services
 * @returns Result with success message
 *
 * @example
 * ```typescript
 * const request: StepExecutionRequest = {
 *   step,
 *   context,
 *   logger: log,
 *   flags: { previewMode: false },
 *   services: {}
 * };
 * const result = await executeGitCheckout(request);
 * ```
 */
export async function executeGitCheckout(
  request: StepExecutionRequest
): Promise<Result<string>> {
  const { step, context, logger } = request;
  const { config } = step;

  const validation = validateConfig<GitCheckoutConfig>(
    StepAction.GIT_CHECKOUT,
    config
  );
  if (!validation.ok) {
    return validation;
  }
  const validatedConfig = validation.value;

  const { defaultBranch } = context;
  const branch = validatedConfig.branch || defaultBranch;

  // Setup Pod-aware git configuration
  const { updatedGitConfig, execFn, fs } = setupPodAwareGit(
    context,
    logger,
    true
  );

  await logger(`Checking out branch: ${branch}`);
  const result = await checkoutBranch(
    updatedGitConfig,
    branch,
    defaultBranch,
    fs,
    execFn
  );

  if (!result.ok) {
    const error = result as { ok: false; error: Error };
    return err(error.error);
  }

  return ok(`Checked out branch: ${branch}`);
}

/**
 * Executes git.branch action (creates a new branch).
 * This function performs I/O operations (git commands) but receives all dependencies explicitly,
 * making it testable through dependency injection. The function is deterministic given the same inputs.
 *
 * @param request - Step execution request containing step, context, logger, flags, and services
 * @returns Result with new branch name and updated context
 *
 * @example
 * ```typescript
 * const request: StepExecutionRequest = {
 *   step,
 *   context,
 *   logger: log,
 *   flags: { previewMode: false },
 *   services: {}
 * };
 * const result = await executeGitBranch(request);
 * ```
 */
export async function executeGitBranch(
  request: StepExecutionRequest
): Promise<Result<{ message: string; newBranchName: string }>> {
  const { step, context, logger, flags } = request;
  const { config } = step;

  const validation = validateConfig<GitBranchConfig>(
    StepAction.GIT_BRANCH,
    config
  );
  if (!validation.ok) {
    return validation;
  }
  const validatedConfig = validation.value;

  const { workItem, defaultBranch, podName } = context;
  const pattern =
    validatedConfig.pattern || `fix/${workItem.workItemType}-${workItem.id}`;

  // Replace placeholders in pattern (immutable)
  const finalBranchName = pattern
    .replace("{type}", workItem.workItemType.toLowerCase())
    .replace("{id}", workItem.id);

  // Setup Pod-aware git configuration (no FileSystem needed for git.branch)
  const { updatedGitConfig, execFn } = setupPodAwareGit(context, logger, false);

  if (flags.previewMode) {
    await logger(`[Dry Run] Would create/checkout branch: ${finalBranchName}`);
    // In preview mode, we try to checkout if it exists to provide context,
    // but we won't fail if we can't create it or if it doesn't exist.
    // Ideally, we should stay on the current branch (usually default) for reading files.
    // However, for correct context, let's try a safe checkout if the branch happens to exist.

    // For now, we simulate success and return the branch name so the context is updated
    // and subsequent steps (even if mocked) use the correct branch name.
    return ok({
      message: `[Dry Run] Simulated branch creation: ${finalBranchName}`,
      newBranchName: finalBranchName,
    });
  }

  // For Pods, create a FileSystem that checks existence via kubectl exec
  const fsPod: FileSystem | undefined = podName
    ? createPodFileSystem(podName, logger)
    : undefined;

  // Note: When using Pods, the git-adapter will check existence via the FileSystem
  // When not using Pods, we skip the check here (git-adapter will handle it)

  await logger(`Creating branch: ${finalBranchName}`);
  const result = await checkoutBranch(
    updatedGitConfig,
    finalBranchName,
    defaultBranch,
    fsPod,
    execFn
  );

  if (!result.ok) {
    const error = result as { ok: false; error: Error };
    return err(error.error);
  }

  return ok({
    message: `Created branch: ${finalBranchName}`,
    newBranchName: finalBranchName,
  });
}

/**
 * Executes git.commit action.
 * This function performs I/O operations (git commands) but receives all dependencies explicitly,
 * making it testable through dependency injection. The function is deterministic given the same inputs.
 *
 * @param request - Step execution request containing step, context, logger, flags, and services
 * @returns Result with success message
 *
 * @example
 * ```typescript
 * const request: StepExecutionRequest = {
 *   step,
 *   context,
 *   logger: log,
 *   flags: { previewMode: false },
 *   services: {}
 * };
 * const result = await executeGitCommit(request);
 * ```
 */
export async function executeGitCommit(
  request: StepExecutionRequest
): Promise<Result<string>> {
  const { step, context, logger, flags } = request;
  const { config } = step;

  const validation = validateConfig<GitCommitConfig>(
    StepAction.GIT_COMMIT,
    config
  );
  if (!validation.ok) {
    return validation;
  }
  const validatedConfig = validation.value;

  const { workItem } = context;
  const messageTemplate = validatedConfig.message || "fix: {title}";

  // Replace placeholders (immutable)
  const message = messageTemplate
    .replace("{title}", workItem.title)
    .replace("{id}", workItem.id);

  if (flags.previewMode) {
    await logger(`[Dry Run] Would execute: git commit -m "${message}"`);
    return ok("Dry run: Commit skipped");
  }

  // Setup Pod-aware git configuration
  const { updatedGitConfig, execFn, fs } = setupPodAwareGit(
    context,
    logger,
    true
  );

  await logger(`Committing changes: ${message}`);

  // Get the current HEAD commit SHA before attempting commit
  let headBeforeCommit: string | undefined;
  try {
    const { stdout: headOutput } = await execFn(
      `git -C ${updatedGitConfig.repoPath} rev-parse HEAD`
    );
    headBeforeCommit = headOutput.trim();
  } catch {
    // If we can't get HEAD (e.g., empty repo), that's okay - we'll check after
    headBeforeCommit = undefined;
  }

  const result = await commitChanges(updatedGitConfig, message, fs, execFn);

  if (!result.ok) {
    const error = result as { ok: false; error: Error };
    const errorMessage = error.error.message;

    // If there are no changes to commit, treat it as a warning but continue
    // This can happen if the previous step didn't apply changes or if changes were already committed
    if (
      errorMessage.includes("No changes detected") ||
      errorMessage.includes("Nothing to commit") ||
      errorMessage.includes("nothing to commit") ||
      errorMessage.includes("nothing added to commit")
    ) {
      await logger(
        `Warning: ${errorMessage}. Skipping commit and continuing workflow.`
      );
      // Store a flag in context to indicate no commit was made (for push/pr steps)
      return ok(`No changes to commit: ${errorMessage}`);
    }

    // For other errors, return the error
    return err(error.error);
  }

  // Verify that a commit was actually made by comparing HEAD before and after
  try {
    const { stdout: headAfterCommit } = await execFn(
      `git -C ${updatedGitConfig.repoPath} rev-parse HEAD`
    );
    const headAfter = headAfterCommit.trim();

    // If HEAD didn't change (or we couldn't get it before), check if there were actually changes
    if (headBeforeCommit && headBeforeCommit === headAfter) {
      // No commit was made - verify there are no changes
      try {
        const { stdout: statusOutput } = await execFn(
          `git -C ${updatedGitConfig.repoPath} status --porcelain`
        );
        if (!statusOutput.trim()) {
          // No changes detected - treat as warning but continue
          await logger(
            "Warning: No changes to commit. The workflow attempted to commit but no file changes were detected. This usually means the previous step (agent.code) did not apply any changes to the repository. Continuing workflow."
          );
          return ok("No changes to commit - continuing workflow");
        }
      } catch {
        // Status check failed, but we know no commit was made
        // Log warning but continue - might be a transient issue
        await logger(
          "Warning: Could not verify if changes exist. No commit was created. Continuing workflow."
        );
        return ok("No commit created - continuing workflow");
      }
    }
  } catch (error) {
    // If we can't verify, log a warning but don't fail - the commit might have succeeded
    await logger(
      `Warning: Could not verify commit was created: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }

  return ok(`Committed: ${message}`);
}

/**
 * Executes git.push action.
 * This function performs I/O operations (git commands) but receives all dependencies explicitly,
 * making it testable through dependency injection. The function is deterministic given the same inputs.
 *
 * @param request - Step execution request containing step, context, logger, flags, and services
 * @returns Result with success message
 *
 * @example
 * ```typescript
 * const request: StepExecutionRequest = {
 *   step,
 *   context,
 *   logger: log,
 *   flags: { previewMode: false },
 *   services: {}
 * };
 * const result = await executeGitPush(request);
 * ```
 */
export async function executeGitPush(
  request: StepExecutionRequest
): Promise<Result<string>> {
  const { step, context, logger, flags } = request;
  const { config } = step;

  const validation = validateConfig<GitPushConfig>(StepAction.GIT_PUSH, config);
  if (!validation.ok) {
    return validation;
  }

  const { branchName } = context;

  if (flags.previewMode) {
    await logger(`[Dry Run] Would execute: git push -u origin ${branchName}`);
    return ok("Dry run: Push skipped");
  }

  // Setup Pod-aware git configuration
  const { updatedGitConfig, execFn, fs } = setupPodAwareGit(
    context,
    logger,
    true
  );

  // Get current branch from git HEAD instead of relying solely on context
  // This ensures we push the branch we are actually on, fixing issues where context might be stale
  let currentBranch = branchName;
  try {
    const { stdout } = await execFn(
      `git -C ${updatedGitConfig.repoPath} rev-parse --abbrev-ref HEAD`
    );
    const detectedBranch = stdout.trim();
    if (detectedBranch && detectedBranch !== "HEAD") {
      if (detectedBranch !== branchName) {
        await logger(
          `[Git] Detected actual branch: ${detectedBranch} (overriding context branch: ${branchName})`
        );
      }
      currentBranch = detectedBranch;
    }
  } catch (error) {
    await logger(
      `[Git] Warning: Failed to detect current branch: ${error instanceof Error ? error.message : String(error)}. Using context branch: ${branchName}`
    );
  }

  await logger(`Pushing branch: ${currentBranch}`);
  const result = await pushBranch(updatedGitConfig, currentBranch, fs, execFn);

  if (!result.ok) {
    const error = result as { ok: false; error: Error };
    return err(error.error);
  }

  return ok(`Pushed branch: ${branchName}`);
}

/**
 * Executes git.worktree action.
 * Creates or removes a git worktree for isolated task execution.
 *
 * @param request - Step execution request containing step, context, logger, flags, and services
 * @returns Result with worktree path or success message
 */
export async function executeGitWorktree(
  request: StepExecutionRequest
): Promise<Result<{ message: string; worktreePath?: string }>> {
  const { step, context, logger, flags } = request;
  const { config } = step;

  const validation = validateConfig<GitWorktreeConfig>(
    StepAction.GIT_WORKTREE,
    config
  );
  if (!validation.ok) {
    return validation;
  }
  const validatedConfig = validation.value;

  const { operation, path, branch, baseBranch } = validatedConfig;

  // Setup Pod-aware git configuration
  const { updatedGitConfig, execFn } = setupPodAwareGit(context, logger, false);

  if (operation === "create") {
    // Generate worktree path if not provided
    const worktreePath = path || `/tmp/openfarm-worktree-${Date.now()}`;
    const worktreeBranch = branch || context.branchName || `task-${Date.now()}`;
    const worktreeBase = baseBranch || context.defaultBranch || "main";

    if (flags.previewMode) {
      await logger(`[Dry Run] Would create worktree: ${worktreePath} for branch ${worktreeBranch}`);
      return ok({
        message: `[Dry Run] Would create worktree: ${worktreePath}`,
        worktreePath,
      });
    }

    await logger(`Creating worktree: ${worktreePath}`);

    // First create the branch if it doesn't exist
    await logger(`Ensuring branch exists: ${worktreeBranch}`);
    try {
      await execFn(`git -C ${updatedGitConfig.repoPath} branch ${worktreeBranch}`);
    } catch {
      // Branch might already exist, that's ok
    }

    const result = await createWorktree(updatedGitConfig.repoPath, {
      path: worktreePath,
      branch: worktreeBranch,
      baseBranch: worktreeBase,
    });

    if (!result.ok) {
      return err(result.error);
    }

    await logger(`✅ Worktree created: ${result.value.path}`);
    return ok({
      message: `Created worktree: ${result.value.path}`,
      worktreePath: result.value.path,
    });
  }

  if (operation === "remove") {
    const worktreePath = path;

    if (!worktreePath) {
      return err(new Error("path is required for worktree remove operation"));
    }

    if (flags.previewMode) {
      await logger(`[Dry Run] Would remove worktree: ${worktreePath}`);
      return ok({
        message: `[Dry Run] Would remove worktree: ${worktreePath}`,
      });
    }

    await logger(`Removing worktree: ${worktreePath}`);

    const result = await removeWorktree(updatedGitConfig.repoPath, worktreePath, true);

    if (!result.ok) {
      return err(result.error);
    }

    await logger(`✅ Worktree removed: ${worktreePath}`);
    return ok({
      message: `Removed worktree: ${worktreePath}`,
    });
  }

  return err(new Error(`Unknown worktree operation: ${operation}`));
}

/**
 * Routes git actions to the appropriate executor.
 * This function delegates to executors that perform I/O operations, but receives all dependencies explicitly,
 * making it testable through dependency injection.
 *
 * @param request - Step execution request containing step, context, logger, flags, and services
 * @returns Result with execution result
 */
export async function executeGitAction(
  request: StepExecutionRequest
): Promise<Result<string | { message: string; newBranchName: string } | { message: string; worktreePath?: string }>> {
  const { step } = request;
  const action = step.action;

  if (action === StepAction.GIT_CHECKOUT) {
    return executeGitCheckout(request);
  }
  if (action === StepAction.GIT_BRANCH) {
    // Return the full result object for git.branch so that execute-workflow
    // can update context.branchName with the new branch name
    return await executeGitBranch(request);
  }
  if (action === StepAction.GIT_COMMIT) {
    return executeGitCommit(request);
  }
  if (action === StepAction.GIT_PUSH) {
    return executeGitPush(request);
  }
  if (action === StepAction.GIT_WORKTREE) {
    return executeGitWorktree(request);
  }

  return err(new Error(`Unknown git action: ${action}`));
}

/**
 * Gets the repository path inside the Pod.
 * This matches the path used by the orchestrator when provisioning the Pod.
 */
function getPodRepoPath(repoUrl: string, workItemId: string): string {
  const repoName =
    repoUrl.split("/").pop()?.replace(".git", "") || `repo-${workItemId}`;
  return `/workspace/${repoName}`;
}

/**
 * Creates an ExecFunction that executes commands inside a Kubernetes Pod using kubectl exec.
 * This wrapper adapts the git-adapter's ExecFunction interface (string command) to kubectl exec.
 *
 * @param podName - Name of the Kubernetes Pod
 * @param logger - Logger function for logging
 * @returns ExecFunction compatible with git-adapter
 */
function createKubectlExecFunction(
  podName: string,
  logger: (message: string) => Promise<void>
): GitAdapterExecFunction {
  const namespace = "minions-farm";

  return async (
    command: string
  ): Promise<{ stdout: string; stderr: string }> => {
    await logger(`Executing git command in Pod ${podName}: ${command}`);

    // The git-adapter uses commands like "git -C /path/to/repo ..."
    // We need to execute this inside the Pod, so we'll use sh -c to run the full command
    return new Promise((resolve, reject) => {
      const kubectlArgs = [
        "exec",
        podName,
        "-n",
        namespace,
        "-c",
        "claude-code",
        "--",
        "sh",
        "-c",
        command,
      ];

      const kubectlProcess = spawn("kubectl", kubectlArgs);

      let stdout = "";
      let stderr = "";

      kubectlProcess.stdout.on("data", (data) => {
        stdout += data.toString();
      });

      kubectlProcess.stderr.on("data", (data) => {
        stderr += data.toString();
      });

      kubectlProcess.on("close", (code) => {
        if (code === 0) {
          resolve({ stdout, stderr });
          return;
        }

        if (code === null) {
          const execError = new Error(
            `Command failed with exit code null: ${stderr || stdout}`
          ) as Error & { code: number };
          execError.code = -1;
          reject(execError);
          return;
        }

        {
          interface ExecError extends Error {
            code: number;
            stdout?: string;
            stderr?: string;
          }
          const error: ExecError = new Error(
            `Command failed with exit code ${code}: ${stderr || stdout}`
          ) as ExecError;
          error.code = code;
          error.stdout = stdout;
          error.stderr = stderr;
          reject(error);
        }
      });

      kubectlProcess.on("error", (error) => {
        interface ExecError extends Error {
          code: number;
        }
        const execError: ExecError = new Error(
          `Failed to execute kubectl: ${error.message}`
        ) as ExecError;
        execError.code = -1;
        reject(execError);
      });
    });
  };
}

/**
 * Creates a FileSystem interface that checks file existence inside a Kubernetes Pod.
 * This is needed because git-adapter uses fs.existsSync to check if the repo path exists.
 *
 * @param podName - Name of the Kubernetes Pod
 * @param logger - Logger function for logging
 * @returns FileSystem compatible with git-adapter
 */
function createPodFileSystem(
  podName: string,
  _logger: (message: string) => Promise<void>
): FileSystem {
  const namespace = "minions-farm";

  return {
    existsSync: (path: string): boolean => {
      // For simplicity, we'll use a synchronous check via kubectl exec
      // Note: This is a blocking operation, but existsSync is expected to be synchronous
      // In practice, the git-adapter only checks if the repo path exists at the start
      try {
        const { spawnSync } = require("node:child_process");
        const kubectlArgs = [
          "exec",
          podName,
          "-n",
          namespace,
          "-c",
          "claude-code",
          "--",
          "test",
          "-d",
          path,
        ];

        const result = spawnSync("kubectl", kubectlArgs, {
          stdio: "ignore",
          timeout: KUBECTL_EXEC_TIMEOUT_MS,
        });
        return result.status === 0;
      } catch {
        return false;
      }
    },
  };
}
