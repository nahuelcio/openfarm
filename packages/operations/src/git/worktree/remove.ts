import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { ExecFunction, FileSystem } from "@openfarm/core/types/runtime";
import { defaultFileSystem } from "@openfarm/core/types/runtime";
import { logger } from "@openfarm/logger";
import { sanitizePath } from "@openfarm/runner-utils/utils/git-config";

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

/**
 * Helper function to remove a worktree
 * Refactored to receive dependencies as parameters
 */
export const removeWorktree = async (
  mainRepoPath: string,
  worktreePath: string,
  fs: FileSystem = defaultFileSystem,
  execFn: ExecFunction = defaultExecFn
): Promise<void> => {
  try {
    const sanitizedMainRepoPath = sanitizePath(mainRepoPath);
    const sanitizedWorktreePath = sanitizePath(worktreePath, mainRepoPath);

    if (fs.existsSync(sanitizedWorktreePath)) {
      // Try to remove worktree properly
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
        // If git worktree remove fails, try manual cleanup
        try {
          fs.rmSync(sanitizedWorktreePath, { recursive: true, force: true });
        } catch {
          // Ignore cleanup errors
        }
      }
    }
  } catch (error) {
    // Ignore cleanup errors
    logger.warn({ worktreePath, error }, "Failed to remove worktree");
  }
};
