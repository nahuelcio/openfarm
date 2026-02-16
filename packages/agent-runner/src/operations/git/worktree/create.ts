import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { ExecFunction, FileSystem } from "@openfarm/core/types/runtime";
import { defaultFileSystem } from "@openfarm/core/types/runtime";
import { logger } from "@openfarm/logger";
import { err, ok, type Result } from "@openfarm/result";

const execFileAsync = promisify(execFile);

/**
 * Default ExecFunction implementation using execFile
 * This prevents command injection by using argument arrays instead of string interpolation
 */
const defaultExecFn: ExecFunction = async (
  file: string,
  args: string[],
  options?: { cwd?: string }
): Promise<{ stdout: string; stderr: string }> => {
  const result = await execFileAsync(file, args, options);
  return {
    stdout: result.stdout ? result.stdout.toString() : "",
    stderr: result.stderr ? result.stderr.toString() : "",
  };
};

import { checkBranchExists } from "./branch-status";
import {
  cleanupExistingWorktree,
  pruneWorktrees,
  removeStaleWorktreeReferences,
} from "./cleanup";
import {
  aggressiveCleanupForBranchExists,
  repairStaleWorktreeReference,
  requestUserIntervention,
} from "./retry";
import {
  sanitizeGitUserConfig,
  sanitizeWorktreeInputs,
  validateMainRepository,
} from "./validation";

/**
 * Validates the main repository exists with a contextual error message
 */
function validateRepositoryWithMessage(
  mainRepoPath: string,
  fs: FileSystem,
  operation: string
): Result<void> {
  const validation = validateMainRepository(mainRepoPath, fs);
  if (!validation.valid) {
    return err(
      new Error(
        `Main repository does not exist before ${operation}: ${mainRepoPath}. Cannot continue.`
      )
    );
  }
  return ok(undefined);
}

/**
 * Ensures the default branch is up to date in the main repository
 */
async function ensureDefaultBranchUpdated(
  mainRepoPath: string,
  defaultBranch: string,
  execFn: ExecFunction
): Promise<void> {
  try {
    await execFn("git", [
      "-C",
      mainRepoPath,
      "fetch",
      "origin",
      defaultBranch,
    ]).catch(() => {});
    await execFn("git", ["-C", mainRepoPath, "checkout", defaultBranch]).catch(
      () => {
        return execFn("git", ["-C", mainRepoPath, "checkout", "main"]).catch(
          () => {
            return execFn("git", ["-C", mainRepoPath, "checkout", "master"]);
          }
        );
      }
    );
    await execFn("git", [
      "-C",
      mainRepoPath,
      "pull",
      "origin",
      defaultBranch,
    ]).catch(() => {
      return execFn("git", [
        "-C",
        mainRepoPath,
        "pull",
        "origin",
        "main",
      ]).catch(() => {
        return execFn("git", ["-C", mainRepoPath, "pull", "origin", "master"]);
      });
    });
  } catch {
    // Continue even if pull fails
  }
}

/**
 * Helper function to create a worktree for a work item
 * Refactored to receive dependencies as parameters
 */
export const createWorktree = async (
  mainRepoPath: string,
  worktreePath: string,
  branchName: string,
  jobId: string | undefined,
  onLog: ((message: string) => void | Promise<void>) | undefined,
  defaultBranch = "main",
  fs: FileSystem = defaultFileSystem,
  execFn: ExecFunction = defaultExecFn,
  checkWorktreeInUse?: (path: string) => Promise<boolean>
): Promise<Result<void>> => {
  const log = async (message: string) => {
    if (onLog) {
      await onLog(message);
    }
    logger().info({ branchName, worktreePath }, message);
  };

  try {
    // Sanitize inputs
    const {
      sanitizedMainRepoPath,
      sanitizedWorktreePath,
      sanitizedBranchName,
      sanitizedDefaultBranch,
    } = sanitizeWorktreeInputs(
      mainRepoPath,
      worktreePath,
      branchName,
      defaultBranch
    );

    // CRITICAL: Verify that the main repository exists before any operations
    const validationResult = validateRepositoryWithMessage(
      sanitizedMainRepoPath,
      fs,
      "any operations"
    );
    if (!validationResult.ok) {
      return validationResult;
    }

    // ROBUST CLEANUP: Handle orphaned worktrees
    await pruneWorktrees(sanitizedMainRepoPath, execFn);

    // Check if worktree directory exists and clean it up
    const cleanupResult = await cleanupExistingWorktree(
      sanitizedMainRepoPath,
      sanitizedWorktreePath,
      checkWorktreeInUse,
      onLog,
      fs,
      execFn
    );
    if (cleanupResult.error) {
      return err(cleanupResult.error);
    }

    // Additional check: list all worktrees and remove any that point to our path
    const validationResult2 = validateRepositoryWithMessage(
      sanitizedMainRepoPath,
      fs,
      "listing worktrees"
    );
    if (!validationResult2.ok) {
      return validationResult2;
    }
    await removeStaleWorktreeReferences(
      sanitizedMainRepoPath,
      sanitizedWorktreePath,
      execFn
    );

    // Ensure we have latest defaultBranch in main repo
    const validationResult3 = validateRepositoryWithMessage(
      sanitizedMainRepoPath,
      fs,
      "updating default branch"
    );
    if (!validationResult3.ok) {
      return validationResult3;
    }
    await ensureDefaultBranchUpdated(
      sanitizedMainRepoPath,
      sanitizedDefaultBranch,
      execFn
    );

    // Check if branch already exists (local or remote)
    const branchStatus = await checkBranchExists(
      sanitizedMainRepoPath,
      sanitizedBranchName,
      fs,
      execFn
    );

    // ROBUST WORKTREE CREATION with multiple retry strategies
    let worktreeCreated = false;
    let createAttempt = 0;
    const maxAttempts = 3;

    while (!worktreeCreated && createAttempt < maxAttempts) {
      createAttempt++;

      try {
        // Verify main repository exists before creating worktree
        const validationResult4 = validateRepositoryWithMessage(
          sanitizedMainRepoPath,
          fs,
          "worktree creation"
        );
        if (!validationResult4.ok) {
          return validationResult4;
        }
        await log(
          `Creating worktree (attempt ${createAttempt}/${maxAttempts})...`
        );

        if (branchStatus.local) {
          // Use --detach to check out the commit of the branch without locking the branch ref
          await execFn("git", [
            "-C",
            sanitizedMainRepoPath,
            "worktree",
            "add",
            "--detach",
            sanitizedWorktreePath,
            sanitizedBranchName,
          ]);
        } else {
          await execFn("git", [
            "-C",
            sanitizedMainRepoPath,
            "worktree",
            "add",
            "-b",
            sanitizedBranchName,
            sanitizedWorktreePath,
          ]);
        }

        worktreeCreated = true;
        await log(`Successfully created worktree at ${sanitizedWorktreePath}`);

        // Post-creation verification: ensure directory exists and is accessible
        if (!fs.existsSync(sanitizedWorktreePath)) {
          await log(
            `WARNING: Worktree creation reported success but directory does not exist: ${sanitizedWorktreePath}`
          );
          worktreeCreated = false;
          continue; // Retry
        }

        // Verify it's a valid git repository by checking git status
        try {
          await execFn("git", [
            "-C",
            sanitizedWorktreePath,
            "rev-parse",
            "--git-dir",
          ]);
          await log(
            `Worktree directory verified and accessible: ${sanitizedWorktreePath}`
          );
        } catch (verifyError) {
          await log(
            `WARNING: Worktree directory exists but git verification failed: ${verifyError instanceof Error ? verifyError.message : String(verifyError)}`
          );
          // Still consider it created, but log the warning
        }
      } catch (createError) {
        const errorMessage =
          createError instanceof Error
            ? createError.message
            : String(createError);
        await log(`Worktree creation failed: ${errorMessage}`);

        // Strategy 1: Branch already exists error
        if (
          errorMessage.includes("already exists") ||
          errorMessage.includes("used by worktree")
        ) {
          try {
            await aggressiveCleanupForBranchExists(
              sanitizedMainRepoPath,
              sanitizedWorktreePath,
              sanitizedBranchName,
              sanitizedDefaultBranch,
              onLog,
              fs,
              execFn
            );
            continue; // Retry the loop
          } catch (cleanupError) {
            await log(
              `Aggressive cleanup failed: ${cleanupError instanceof Error ? cleanupError.message : String(cleanupError)}`
            );
          }
        }

        // Strategy 2: Worktree path issue
        if (
          errorMessage.includes("already a registered worktree") ||
          errorMessage.includes("is a missing worktree")
        ) {
          try {
            await repairStaleWorktreeReference(
              sanitizedMainRepoPath,
              sanitizedWorktreePath,
              onLog,
              fs,
              execFn
            );
            continue; // Retry the loop
          } catch (repairError) {
            await log(
              `Worktree repair failed: ${repairError instanceof Error ? repairError.message : String(repairError)}`
            );
            const validationResult5 = validateRepositoryWithMessage(
              sanitizedMainRepoPath,
              fs,
              "worktree repair"
            );
            if (!validationResult5.ok) {
              return validationResult5;
            }
          }
        }

        // If this is the last attempt, ask user if interactive mode is available
        if (createAttempt >= maxAttempts) {
          const userInterventionResult = await requestUserIntervention(
            sanitizedMainRepoPath,
            sanitizedWorktreePath,
            sanitizedBranchName,
            sanitizedDefaultBranch,
            jobId,
            errorMessage,
            maxAttempts,
            onLog,
            fs,
            execFn
          );
          if (userInterventionResult.success) {
            worktreeCreated = true;
            break;
          }
          return err(userInterventionResult.error!);
        }
      }
    }

    if (!worktreeCreated) {
      return err(new Error("Failed to create worktree after all attempts"));
    }

    // Configure Git user in worktree
    const { email: sanitizedGitEmail, name: sanitizedGitName } =
      sanitizeGitUserConfig();
    await execFn("git", [
      "-C",
      sanitizedWorktreePath,
      "config",
      "user.email",
      sanitizedGitEmail,
    ]);
    await execFn("git", [
      "-C",
      sanitizedWorktreePath,
      "config",
      "user.name",
      sanitizedGitName,
    ]);

    return ok(undefined);
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
};
