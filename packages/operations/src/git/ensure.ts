import type { AgentConfig } from "@openfarm/core/types/domain";
import type { ExecFunction, FileSystem } from "@openfarm/core/types/runtime";
import { logger } from "@openfarm/logger";
import { err, ok, type Result } from "@openfarm/result";
import {
  escapeUrl,
  getGitConfig,
  sanitizeGitConfig,
  sanitizePath,
} from "../../utils/git-config";

/**
 * Helper function to ensure main repository exists (for worktrees)
 * Refactored to receive dependencies as parameters
 * Made fault-tolerant: git fetch errors are logged but don't fail the operation
 */
export const ensureMainRepo = async (
  mainRepoPath: string,
  authenticatedUrl: string,
  config: AgentConfig,
  fs: FileSystem,
  execFn: ExecFunction
): Promise<Result<void>> => {
  try {
    // Sanitize paths
    const sanitizedMainRepoPath = sanitizePath(mainRepoPath);
    const escapedUrl = escapeUrl(authenticatedUrl);

    if (fs.existsSync(sanitizedMainRepoPath)) {
      // Repository exists, try to update it (non-critical operations)

      // Update remote URL (ignore errors)
      try {
        await execFn("git", [
          "-C",
          sanitizedMainRepoPath,
          "remote",
          "set-url",
          "origin",
          escapedUrl,
        ]);
      } catch {
        // Ignore - remote URL might already be correct
      }

      // Fetch latest (ignore errors - repo might be offline or have network issues)
      try {
        await execFn("git", [
          "-C",
          sanitizedMainRepoPath,
          "fetch",
          "origin",
          "--prune",
        ]);
      } catch (fetchError) {
        logger.warn(
          { mainRepoPath: sanitizedMainRepoPath, error: fetchError },
          "Failed to fetch from origin, continuing with existing local state"
        );
        // Continue anyway - we can work with existing local state
      }

      // Try to pull latest changes (non-critical)
      try {
        await execFn("git", [
          "-C",
          sanitizedMainRepoPath,
          "pull",
          "origin",
          "--rebase=false",
        ]).catch(() => {
          // If pull fails (e.g., merge conflicts), reset to origin
          return execFn("git", [
            "-C",
            sanitizedMainRepoPath,
            "reset",
            "--hard",
            "origin/HEAD",
          ]).catch(() => {
            // Ignore reset errors
          });
        });
      } catch {
        // Ignore pull errors - local state is fine
      }

      return ok(undefined);
    }
    // Clone main repository
    try {
      await execFn("git", ["clone", escapedUrl, sanitizedMainRepoPath]);
    } catch (cloneError) {
      // If clone fails, try with --single-branch for faster clone
      logger.warn(
        { mainRepoPath: sanitizedMainRepoPath, error: cloneError },
        "Full clone failed, trying single-branch clone"
      );
      try {
        await execFn("git", [
          "clone",
          "--single-branch",
          escapedUrl,
          sanitizedMainRepoPath,
        ]);
      } catch (singleBranchError) {
        return err(
          new Error(
            `Failed to clone repository: ${singleBranchError instanceof Error ? singleBranchError.message : String(singleBranchError)}`
          )
        );
      }
    }

    // Configure Git user (non-critical, continue on failure)
    const gitConfig = getGitConfig(config);
    try {
      const sanitizedEmail = sanitizeGitConfig(gitConfig.email, "email");
      const sanitizedName = sanitizeGitConfig(gitConfig.name, "name");
      await execFn("git", [
        "-C",
        sanitizedMainRepoPath,
        "config",
        "user.email",
        sanitizedEmail,
      ]);
      await execFn("git", [
        "-C",
        sanitizedMainRepoPath,
        "config",
        "user.name",
        sanitizedName,
      ]);
    } catch (configError) {
      logger.warn(
        { mainRepoPath: sanitizedMainRepoPath, error: configError },
        "Failed to configure git user, continuing anyway"
      );
    }

    return ok(undefined);
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
};
