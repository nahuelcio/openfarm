import type { FileSystem } from "@openfarm/core/db/connection";
import { defaultFileSystem } from "@openfarm/core/db/connection";
import type {
  AgentConfig,
  AgentConfiguration,
  WorkItem,
} from "@openfarm/core/types/domain";
import type { ExecFunction } from "@openfarm/core/types/runtime";
import { err, ok, type Result } from "@openfarm/result";
import { getBranchName, getDefaultBranch } from "../../utils/work-item";
import { ensureMainRepo } from "../git/ensure";
import { createWorktree } from "../git/worktree";

/**
 * Configuration for repository setup
 */
export interface RepositorySetupConfig {
  workItem: WorkItem;
  config: AgentConfig;
  agentConfiguration?: AgentConfiguration;
  jobId?: string;
  fileSystem?: FileSystem;
  execAsync?: ExecFunction;
  existingWorktreePath?: string; // Optional: reuse existing worktree
  existingBranchName?: string; // Optional: reuse existing branch
  checkWorktreeInUse?: (path: string) => Promise<boolean>; // Optional: function to check if worktree is in use
}

/**
 * Result of repository setup
 */
export interface RepositorySetupResult {
  repoName: string;
  mainRepoPath: string;
  worktreePath: string;
  repoPath: string;
  branchName: string;
  defaultBranch: string;
  authenticatedUrl: string;
}

/**
 * Sets up repository and worktree for agent execution.
 * This function performs I/O operations (git commands, filesystem operations) but receives all dependencies explicitly,
 * making it testable through dependency injection. The function is deterministic given the same inputs.
 *
 * @param setupConfig - Configuration for repository setup
 * @param authenticatedUrl - Authenticated repository URL
 * @param log - Logging function
 * @returns Result with repository setup information
 *
 * @example
 * ```typescript
 * const result = await setupRepository(
 *   { workItem, config, agentConfiguration, jobId },
 *   authenticatedUrl,
 *   log
 * );
 *
 * if (result.ok) {
 *   const { repoPath, branchName } = result.value;
 *   // Use repository...
 * }
 * ```
 */
export async function setupRepository(
  setupConfig: RepositorySetupConfig,
  authenticatedUrl: string,
  log: (message: string) => Promise<void>
): Promise<Result<RepositorySetupResult>> {
  const {
    workItem,
    config,
    agentConfiguration,
    jobId,
    fileSystem = defaultFileSystem,
    execAsync = require("node:util").promisify(
      require("node:child_process").exec
    ),
    existingWorktreePath,
    existingBranchName,
    checkWorktreeInUse,
  } = setupConfig;

  if (!workItem.repositoryUrl) {
    return err(new Error("Work item does not have a repository URL assigned"));
  }

  // Ensure work directory exists
  if (!fileSystem.existsSync(config.workDir)) {
    fileSystem.mkdirSync(config.workDir, { recursive: true });
  }

  // Calculate repository paths
  const repoName =
    workItem.repositoryUrl.split("/").pop()?.replace(".git", "") ||
    `repo-${workItem.id}`;
  const mainRepoPath = `${config.workDir}/${repoName}`;
  const branchName =
    existingBranchName || getBranchName(workItem, agentConfiguration);
  const worktreePath =
    existingWorktreePath || `${config.workDir}/${repoName}-wt-${workItem.id}`;
  const repoPath = worktreePath;
  const defaultBranch = getDefaultBranch(agentConfiguration);

  await log(`Ensuring main repository exists: ${repoName}`);
  const mainRepoResult = await ensureMainRepo(
    mainRepoPath,
    authenticatedUrl,
    config,
    fileSystem,
    execAsync
  );
  if (!mainRepoResult.ok) {
    const error = mainRepoResult as { ok: false; error: Error };
    return err(
      new Error(`Failed to ensure main repository: ${error.error.message}`)
    );
  }

  // If reusing existing worktree, verify it exists and is valid
  if (existingWorktreePath && existingBranchName) {
    if (fileSystem.existsSync(existingWorktreePath)) {
      await log(
        `Reusing existing worktree: ${existingWorktreePath}, branch: ${existingBranchName}`
      );
      // Verify the worktree is valid
      try {
        if (execAsync) {
          await execAsync(`git -C ${existingWorktreePath} rev-parse --git-dir`);
          await log(
            `Verified existing worktree is valid: ${existingWorktreePath}`
          );
        }
      } catch (error) {
        await log(
          `Warning: Existing worktree verification failed, will create new one: ${error instanceof Error ? error.message : String(error)}`
        );
        // Fall through to create new worktree
      }
    } else {
      await log(
        `Existing worktree not found at ${existingWorktreePath}, will create new one`
      );
    }
  } else {
    // Check if worktree path already exists and is valid (even if not explicitly provided)
    // This handles cases where a worktree was created but the execution was interrupted
    if (fileSystem.existsSync(worktreePath)) {
      await log(
        `Found existing worktree at ${worktreePath}, verifying validity...`
      );
      try {
        if (execAsync) {
          await execAsync(`git -C ${worktreePath} rev-parse --git-dir`);
          // Check if worktree is in use by another execution
          if (checkWorktreeInUse) {
            const isInUse = await checkWorktreeInUse(worktreePath);
            if (isInUse) {
              await log(
                `Worktree at ${worktreePath} is in use by another execution, cannot reuse`
              );
              // Continue to create new worktree (will fail in createWorktree if still in use)
            } else {
              await log(
                `Existing worktree at ${worktreePath} is valid and not in use, reusing it`
              );
              // Worktree exists and is valid, skip creation
              if (!fileSystem.existsSync(worktreePath)) {
                return err(
                  new Error(`Worktree does not exist at ${worktreePath}`)
                );
              }
              return ok({
                repoName,
                mainRepoPath,
                worktreePath,
                repoPath,
                branchName,
                defaultBranch,
                authenticatedUrl,
              });
            }
          } else {
            // No check function provided, assume worktree is valid and reuse it
            await log(
              `Existing worktree at ${worktreePath} is valid, reusing it`
            );
            if (!fileSystem.existsSync(worktreePath)) {
              return err(
                new Error(`Worktree does not exist at ${worktreePath}`)
              );
            }
            return ok({
              repoName,
              mainRepoPath,
              worktreePath,
              repoPath,
              branchName,
              defaultBranch,
              authenticatedUrl,
            });
          }
        }
      } catch (error) {
        await log(
          `Existing worktree verification failed, will create new one: ${error instanceof Error ? error.message : String(error)}`
        );
        // Fall through to create new worktree
      }
    }
  }

  // Only create worktree if we're not reusing an existing one or if it doesn't exist
  if (!(existingWorktreePath && fileSystem.existsSync(existingWorktreePath))) {
    await log(`Creating worktree for branch: ${branchName}`);
    const worktreeResult = await createWorktree(
      mainRepoPath,
      worktreePath,
      branchName,
      jobId,
      log,
      defaultBranch,
      fileSystem,
      execAsync,
      checkWorktreeInUse
    );
    if (!worktreeResult.ok) {
      const error = worktreeResult as { ok: false; error: Error };
      return err(
        new Error(`Failed to create worktree: ${error.error.message}`)
      );
    }
  }

  if (!fileSystem.existsSync(worktreePath)) {
    return err(new Error(`Worktree does not exist at ${worktreePath}`));
  }

  return ok({
    repoName,
    mainRepoPath,
    worktreePath,
    repoPath,
    branchName,
    defaultBranch,
    authenticatedUrl,
  });
}
