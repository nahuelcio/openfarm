import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

/**
 * Gets the current git hash (short form) of the workspace
 * Returns null if not a git repository or on error
 */
export async function getCurrentGitHash(
  workspace: string
): Promise<string | null> {
  try {
    const { stdout } = await execAsync("git rev-parse --short HEAD", {
      cwd: workspace,
    });
    return stdout.trim();
  } catch {
    return null;
  }
}

/**
 * Gets the full git hash of the workspace
 * Returns null if not a git repository or on error
 */
export async function getCurrentGitHashFull(
  workspace: string
): Promise<string | null> {
  try {
    const { stdout } = await execAsync("git rev-parse HEAD", {
      cwd: workspace,
    });
    return stdout.trim();
  } catch {
    return null;
  }
}

/**
 * Checks if the workspace has uncommitted changes
 */
export async function hasUncommittedChanges(
  workspace: string
): Promise<boolean> {
  try {
    const { stdout } = await execAsync("git status --porcelain", {
      cwd: workspace,
    });
    return stdout.trim().length > 0;
  } catch {
    return false;
  }
}
