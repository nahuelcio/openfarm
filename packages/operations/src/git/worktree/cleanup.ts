import type { ExecFunction, FileSystem } from "@openfarm/core/types/runtime";
import { sanitizePath } from "@openfarm/runner-utils/utils/git-config";

/**
 * Prunes stale worktree references
 */
export async function pruneWorktrees(
  mainRepoPath: string,
  execFn: ExecFunction
): Promise<void> {
  try {
    await execFn("git", ["-C", mainRepoPath, "worktree", "prune"]);
  } catch {
    // Ignore prune errors
  }
}

/**
 * Removes an existing worktree directory using multiple strategies
 */
export async function cleanupExistingWorktree(
  mainRepoPath: string,
  worktreePath: string,
  checkWorktreeInUse: ((path: string) => Promise<boolean>) | undefined,
  onLog: ((message: string) => void | Promise<void>) | undefined,
  fs: FileSystem,
  execFn: ExecFunction
): Promise<{ cleaned: boolean; error?: Error }> {
  const log = async (message: string) => {
    if (onLog) {
      await onLog(message);
    }
  };

  const sanitizedMainRepoPath = sanitizePath(mainRepoPath);
  const sanitizedWorktreePath = sanitizePath(worktreePath, mainRepoPath);

  // Check if worktree directory exists
  if (!fs.existsSync(sanitizedWorktreePath)) {
    return { cleaned: true };
  }

  // First, check if worktree is actively being used by another execution
  if (checkWorktreeInUse) {
    const isInUse = await checkWorktreeInUse(sanitizedWorktreePath);
    if (isInUse) {
      await log(
        `Worktree at ${sanitizedWorktreePath} is actively in use by another execution, skipping cleanup`
      );
      return {
        cleaned: false,
        error: new Error(
          `Worktree is currently in use by another workflow execution: ${sanitizedWorktreePath}`
        ),
      };
    }
  }

  await log(
    `Worktree directory exists at ${sanitizedWorktreePath}, cleaning up...`
  );

  // Try multiple cleanup strategies in order
  let cleaned = false;

  // Strategy 1: Git worktree remove
  try {
    await execFn("git", [
      "-C",
      sanitizedMainRepoPath,
      "worktree",
      "remove",
      sanitizedWorktreePath,
      "--force",
    ]);
    await log("Removed existing worktree via git command");
    cleaned = true;
  } catch (error) {
    await log(
      `Git worktree remove failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  // Strategy 2: Manual filesystem removal + prune
  if (!cleaned) {
    try {
      fs.rmSync(sanitizedWorktreePath, { recursive: true, force: true });
      await execFn("git", ["-C", sanitizedMainRepoPath, "worktree", "prune"]);
      await log("Manually removed worktree and pruned references");
      cleaned = true;
    } catch (error) {
      await log(
        `Manual cleanup failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  // Strategy 3: Force unlock and retry
  if (!cleaned && fs.existsSync(sanitizedWorktreePath)) {
    try {
      // Try to unlock the worktree
      await execFn("git", [
        "-C",
        sanitizedMainRepoPath,
        "worktree",
        "unlock",
        sanitizedWorktreePath,
      ]).catch(() => {});
      // Try removal again
      await execFn("git", [
        "-C",
        sanitizedMainRepoPath,
        "worktree",
        "remove",
        sanitizedWorktreePath,
        "--force",
      ]);
      await log("Unlocked and removed worktree");
      cleaned = true;
    } catch (error) {
      await log(
        `Unlock and remove failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  // Final check: if directory still exists, try one more time with sudo-like force
  if (fs.existsSync(sanitizedWorktreePath)) {
    await log(
      "WARNING: Worktree directory still exists after cleanup attempts, forcing removal..."
    );
    try {
      fs.rmSync(sanitizedWorktreePath, {
        recursive: true,
        force: true,
      });
      await execFn("git", ["-C", sanitizedMainRepoPath, "worktree", "prune"]);
    } catch {
      // Last resort - continue anyway and let git worktree add handle it
      await log(
        "Could not remove worktree directory, will attempt creation anyway"
      );
    }
  }

  return { cleaned: true };
}

/**
 * Removes stale worktree references from the worktree list
 */
export async function removeStaleWorktreeReferences(
  mainRepoPath: string,
  worktreePath: string,
  execFn: ExecFunction
): Promise<void> {
  try {
    const { stdout: worktreeList } = await execFn("git", [
      "-C",
      mainRepoPath,
      "worktree",
      "list",
      "--porcelain",
    ]);
    if (worktreeList.includes(worktreePath)) {
      await execFn("git", ["-C", mainRepoPath, "worktree", "prune"]);
    }
  } catch {
    // Ignore list/prune errors
  }
}
