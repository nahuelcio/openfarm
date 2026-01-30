import type { FileSystem } from "@openfarm/core/types/runtime";
import { defaultFileSystem } from "@openfarm/core/types/runtime";
import {
  sanitizeBranchName,
  sanitizeGitConfig,
  sanitizePath,
} from "@openfarm/runner-utils/utils/git-config";

/**
 * Validates that the main repository exists before any operations
 */
export function validateMainRepository(
  mainRepoPath: string,
  fs: FileSystem = defaultFileSystem
): { valid: boolean; error?: Error } {
  const sanitizedMainRepoPath = sanitizePath(mainRepoPath);
  if (!fs.existsSync(sanitizedMainRepoPath)) {
    return {
      valid: false,
      error: new Error(
        `Main repository does not exist: ${sanitizedMainRepoPath}. Cannot continue.`
      ),
    };
  }
  return { valid: true };
}

/**
 * Sanitizes all inputs for worktree operations
 */
export function sanitizeWorktreeInputs(
  mainRepoPath: string,
  worktreePath: string,
  branchName: string,
  defaultBranch: string
): {
  sanitizedMainRepoPath: string;
  sanitizedWorktreePath: string;
  sanitizedBranchName: string;
  sanitizedDefaultBranch: string;
} {
  return {
    sanitizedMainRepoPath: sanitizePath(mainRepoPath),
    sanitizedWorktreePath: sanitizePath(worktreePath, mainRepoPath),
    sanitizedBranchName: sanitizeBranchName(branchName),
    sanitizedDefaultBranch: sanitizeBranchName(defaultBranch),
  };
}

/**
 * Sanitizes Git configuration values
 */
export function sanitizeGitUserConfig(): {
  email: string;
  name: string;
} {
  const gitEmail = process.env.GIT_USER_EMAIL || "minions-farm@automated.local";
  const gitName = process.env.GIT_USER_NAME || "Minions Farm Agent";
  return {
    email: sanitizeGitConfig(gitEmail, "email"),
    name: sanitizeGitConfig(gitName, "name"),
  };
}
