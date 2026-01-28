import type { ExecFunction } from "@openfarm/core/types/runtime";
import { removeWorktree } from "../git/worktree";

/**
 * Cleans up repository worktree after execution.
 * This function performs I/O operations (git commands, filesystem operations) but receives all dependencies explicitly,
 * making it testable through dependency injection. The function is deterministic given the same inputs.
 *
 * @param mainRepoPath - Path to main repository
 * @param worktreePath - Path to worktree
 * @param execAsync - Exec function for running commands
 * @param log - Optional logging function
 *
 * @example
 * ```typescript
 * await cleanupRepository(mainRepoPath, worktreePath, execAsync, log);
 * ```
 */
export async function cleanupRepository(
  mainRepoPath: string,
  worktreePath: string,
  execAsync?: ExecFunction,
  log?: (message: string) => Promise<void>
): Promise<void> {
  try {
    if (execAsync) {
      await removeWorktree(mainRepoPath, worktreePath, undefined, execAsync);
      if (log) {
        await log(`Cleaned up worktree: ${worktreePath}`);
      }
    }
  } catch (cleanupError) {
    if (log) {
      await log(`Warning: Failed to cleanup worktree: ${cleanupError}`);
    }
  }
}
