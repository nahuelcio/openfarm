import { QuestionType } from "@openfarm/core/constants/enums";
import type { ExecFunction, FileSystem } from "@openfarm/core/types/runtime";
import { logger } from "@openfarm/logger";
import { askUser } from "../../../interaction/ask-user";
import { sanitizePath } from "../../../utils/git-config";

/**
 * Aggressive cleanup strategy when branch already exists error occurs
 */
export async function aggressiveCleanupForBranchExists(
  mainRepoPath: string,
  worktreePath: string,
  branchName: string,
  defaultBranch: string,
  onLog: ((message: string) => void | Promise<void>) | undefined,
  fs: FileSystem,
  execFn: ExecFunction
): Promise<void> {
  const log = async (message: string) => {
    if (onLog) {
      await onLog(message);
    }
    logger.info({ branchName, worktreePath }, message);
  };

  const sanitizedMainRepoPath = sanitizePath(mainRepoPath);
  const sanitizedWorktreePath = sanitizePath(worktreePath, mainRepoPath);
  const sanitizedBranchName = branchName;
  const sanitizedDefaultBranch = defaultBranch;

  await log(
    `Branch '${sanitizedBranchName}' still exists or used by worktree, attempting aggressive cleanup...`
  );

  // CRITICAL: Must remove worktree BEFORE deleting branch
  // Git won't let you delete a branch used by a worktree

  // Step 1: Find and remove any worktrees using this branch
  if (!fs.existsSync(sanitizedMainRepoPath)) {
    throw new Error(
      `Main repository does not exist before aggressive cleanup: ${sanitizedMainRepoPath}. Cannot continue.`
    );
  }
  try {
    const { stdout: worktreeList } = await execFn("git", [
      "-C",
      sanitizedMainRepoPath,
      "worktree",
      "list",
      "--porcelain",
    ]);
    const lines = worktreeList.split("\n");
    let currentWorktreePath = "";

    for (const line of lines) {
      if (line.startsWith("worktree ")) {
        currentWorktreePath = line.replace("worktree ", "");
      } else if (
        line.startsWith("branch ") &&
        line.includes(sanitizedBranchName)
      ) {
        // CRITICAL: Never delete the main repository, only actual worktrees
        // The main repository may also be using the branch, but it should never be deleted
        if (
          currentWorktreePath &&
          currentWorktreePath !== sanitizedMainRepoPath
        ) {
          // Found worktree (not main repo) using our branch, remove it
          await log(`Found worktree using branch at: ${currentWorktreePath}`);
          try {
            const sanitizedCurrentPath = sanitizePath(
              currentWorktreePath,
              sanitizedMainRepoPath
            );
            await execFn("git", [
              "-C",
              sanitizedMainRepoPath,
              "worktree",
              "remove",
              sanitizedCurrentPath,
              "--force",
            ]);
            await log(`Removed worktree: ${sanitizedCurrentPath}`);
          } catch {
            // Try filesystem removal
            if (fs.existsSync(currentWorktreePath)) {
              fs.rmSync(currentWorktreePath, {
                recursive: true,
                force: true,
              });
              await log(
                `Force removed worktree directory: ${currentWorktreePath}`
              );
            }
          }
        } else {
          // Main repository is using the branch - this is expected, just log it
          await log(
            `Main repository is using branch '${sanitizedBranchName}', this is expected and will be handled by checkout`
          );
        }
      }
    }
  } catch (wtListErr) {
    await log(`Worktree list failed: ${wtListErr}`);
    // Verify repo still exists after error
    if (!fs.existsSync(sanitizedMainRepoPath)) {
      throw new Error(
        `Main repository was deleted during worktree list: ${sanitizedMainRepoPath}. Cannot continue.`
      );
    }
  }

  // Step 2: Also remove our target worktree path if it exists
  if (!fs.existsSync(sanitizedMainRepoPath)) {
    throw new Error(
      `Main repository does not exist before removing target worktree: ${sanitizedMainRepoPath}. Cannot continue.`
    );
  }
  if (fs.existsSync(sanitizedWorktreePath)) {
    try {
      await execFn("git", [
        "-C",
        sanitizedMainRepoPath,
        "worktree",
        "remove",
        sanitizedWorktreePath,
        "--force",
      ]);
    } catch {
      fs.rmSync(sanitizedWorktreePath, {
        recursive: true,
        force: true,
      });
    }
    await log(`Removed target worktree path: ${sanitizedWorktreePath}`);
  }

  // Step 3: Prune worktree references
  if (!fs.existsSync(sanitizedMainRepoPath)) {
    throw new Error(
      `Main repository was deleted during cleanup: ${sanitizedMainRepoPath}. Cannot continue.`
    );
  }
  try {
    await execFn("git", ["-C", sanitizedMainRepoPath, "worktree", "prune"]);
    await log("Pruned worktree references");
  } catch (pruneError) {
    await log(
      `Worktree prune failed: ${pruneError instanceof Error ? pruneError.message : String(pruneError)}`
    );
    // Verify repository still exists after prune error
    if (!fs.existsSync(sanitizedMainRepoPath)) {
      throw new Error(
        `Main repository no longer exists after prune: ${sanitizedMainRepoPath}. Cannot continue.`
      );
    }
  }

  // Step 4: NOW we can safely delete the branch
  if (!fs.existsSync(sanitizedMainRepoPath)) {
    throw new Error(
      `Main repository does not exist before checkout: ${sanitizedMainRepoPath}. Cannot continue.`
    );
  }
  await execFn("git", [
    "-C",
    sanitizedMainRepoPath,
    "checkout",
    sanitizedDefaultBranch,
  ]).catch(() => {
    return execFn("git", [
      "-C",
      sanitizedMainRepoPath,
      "checkout",
      "main",
    ]).catch(() => {
      return execFn("git", [
        "-C",
        sanitizedMainRepoPath,
        "checkout",
        "master",
      ]).catch(() => {
        return execFn("git", ["-C", sanitizedMainRepoPath, "checkout", "HEAD"]);
      });
    });
  });

  try {
    await execFn("git", [
      "-C",
      sanitizedMainRepoPath,
      "branch",
      "-D",
      sanitizedBranchName,
    ]);
    await log(`Deleted local branch: ${sanitizedBranchName}`);
  } catch (branchDelErr) {
    await log(`Branch delete failed (may not exist): ${branchDelErr}`);
  }

  // Step 5: Try delete remote too
  if (!fs.existsSync(sanitizedMainRepoPath)) {
    throw new Error(
      `Main repository does not exist before remote deletion in cleanup: ${sanitizedMainRepoPath}. Cannot continue.`
    );
  }
  await execFn("git", [
    "-C",
    sanitizedMainRepoPath,
    "push",
    "origin",
    "--delete",
    sanitizedBranchName,
  ]).catch(() => {});
  await execFn("git", ["-C", sanitizedMainRepoPath, "fetch", "--prune"]);

  // Final verification before retry
  if (!fs.existsSync(sanitizedMainRepoPath)) {
    throw new Error(
      `Main repository was deleted during aggressive cleanup: ${sanitizedMainRepoPath}. Cannot continue.`
    );
  }

  await log("Aggressive cleanup completed, will retry...");
}

/**
 * Repair strategy for stale worktree references
 */
export async function repairStaleWorktreeReference(
  mainRepoPath: string,
  worktreePath: string,
  onLog: ((message: string) => void | Promise<void>) | undefined,
  fs: FileSystem,
  execFn: ExecFunction
): Promise<void> {
  const log = async (message: string) => {
    if (onLog) {
      await onLog(message);
    }
  };

  const sanitizedMainRepoPath = sanitizePath(mainRepoPath);
  const sanitizedWorktreePath = sanitizePath(worktreePath, mainRepoPath);

  await log("Stale worktree reference detected, attempting repair...");

  // Verify main repository exists before repair
  if (!fs.existsSync(sanitizedMainRepoPath)) {
    throw new Error(
      `Main repository does not exist before worktree repair: ${sanitizedMainRepoPath}. Cannot continue.`
    );
  }

  // Prune stale worktrees
  await execFn("git", ["-C", sanitizedMainRepoPath, "worktree", "prune"]);

  // Verify main repository still exists after prune
  if (!fs.existsSync(sanitizedMainRepoPath)) {
    throw new Error(
      `Main repository was deleted during worktree repair: ${sanitizedMainRepoPath}. Cannot continue.`
    );
  }

  // Try to remove the path forcefully
  if (fs.existsSync(sanitizedWorktreePath)) {
    fs.rmSync(sanitizedWorktreePath, {
      recursive: true,
      force: true,
    });
  }

  await log("Worktree repair completed, will retry...");
}

/**
 * User intervention strategy when all automatic attempts fail
 */
export async function requestUserIntervention(
  mainRepoPath: string,
  worktreePath: string,
  branchName: string,
  defaultBranch: string,
  jobId: string | undefined,
  errorMessage: string,
  maxAttempts: number,
  onLog: ((message: string) => void | Promise<void>) | undefined,
  fs: FileSystem,
  execFn: ExecFunction
): Promise<{ success: boolean; error?: Error }> {
  const log = async (message: string) => {
    if (onLog) {
      await onLog(message);
    }
  };

  const sanitizedMainRepoPath = sanitizePath(mainRepoPath);
  const sanitizedWorktreePath = sanitizePath(worktreePath, mainRepoPath);
  const sanitizedBranchName = branchName;
  const _sanitizedDefaultBranch = defaultBranch;

  if (!jobId) {
    return {
      success: false,
      error: new Error(
        `Failed to create worktree after ${maxAttempts} attempts: ${errorMessage}`
      ),
    };
  }

  await log("All automatic attempts failed. Requesting user intervention...");

  const userAnswer = await askUser({
    jobId,
    question: `Could not create worktree for branch '${sanitizedBranchName}' after ${maxAttempts} attempts. Error: ${errorMessage}

Do you want to force deletion and try one more time?`,
    type: QuestionType.CONFIRMATION,
    smart: true,
    context:
      "Worktree creation failed multiple times. This may require manual intervention or additional permissions.",
  });

  if (userAnswer.toLowerCase() !== "yes") {
    return {
      success: false,
      error: new Error("User declined to force worktree creation"),
    };
  }

  try {
    // Verify main repository exists before final attempt
    if (!fs.existsSync(sanitizedMainRepoPath)) {
      return {
        success: false,
        error: new Error(
          `Main repository does not exist before final attempt: ${sanitizedMainRepoPath}. Cannot continue.`
        ),
      };
    }
    // One final aggressive attempt
    await execFn("git", [
      "-C",
      sanitizedMainRepoPath,
      "branch",
      "-D",
      sanitizedBranchName,
    ]).catch(() => {});
    await execFn("git", [
      "-C",
      sanitizedMainRepoPath,
      "push",
      "origin",
      "--delete",
      sanitizedBranchName,
    ]).catch(() => {});
    await execFn("git", ["-C", sanitizedMainRepoPath, "worktree", "prune"]);
    if (fs.existsSync(sanitizedWorktreePath)) {
      fs.rmSync(sanitizedWorktreePath, {
        recursive: true,
        force: true,
      });
    }

    // Verify main repository still exists before creating worktree
    if (!fs.existsSync(sanitizedMainRepoPath)) {
      return {
        success: false,
        error: new Error(
          `Main repository was deleted during final cleanup: ${sanitizedMainRepoPath}. Cannot continue.`
        ),
      };
    }
    await execFn("git", [
      "-C",
      sanitizedMainRepoPath,
      "worktree",
      "add",
      "-b",
      sanitizedBranchName,
      sanitizedWorktreePath,
    ]);
    await log("Successfully created worktree after user intervention");
    return { success: true };
  } catch (finalError) {
    return {
      success: false,
      error: new Error(
        `Failed to create worktree even after user intervention: ${finalError instanceof Error ? finalError.message : String(finalError)}`
      ),
    };
  }
}
