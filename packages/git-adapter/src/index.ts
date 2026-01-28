export type { GitConfig } from "@openfarm/core/types/git";

import type { GitConfig } from "@openfarm/core/types/git";
import { err, ok, type Result } from "@openfarm/result";

/**
 * File system interface for dependency injection
 */
export interface FileSystem {
  existsSync: (path: string) => boolean;
}

/**
 * Exec interface for dependency injection
 */
export type ExecFunction = (
  command: string
) => Promise<{ stdout: string; stderr: string }>;

// Regex patterns at top level for performance
const AUTHENTICATED_URL_REGEX = /^https:\/\/([^@/]+)@/;
const HTTPS_PREFIX_REGEX = /^https:\/\//;
const WORKTREE_PATH_REGEX = /^(.*)-wt-[^/]+$/;

/**
 * Helper function to authenticate Azure DevOps URLs with PAT
 */
export const authenticateAzureDevOpsUrl = (
  url: string,
  pat?: string
): string => {
  if (!pat) {
    return url;
  }

  // Check if URL is already authenticated (has format https://something@host/path)
  const urlMatch = url.match(AUTHENTICATED_URL_REGEX);
  if (urlMatch) {
    // URL already has authentication, return as-is
    return url;
  }

  // Check if URL is Azure DevOps (dev.azure.com or visualstudio.com)
  const isAzureDevOps =
    url.includes("dev.azure.com") || url.includes("visualstudio.com");

  if (!isAzureDevOps) {
    return url;
  }

  // Insert PAT into URL: https://host/path -> https://<PAT>@host/path
  // Azure DevOps accepts PAT as username (without password) or as username:password
  try {
    const urlObj = new URL(url);
    // For Azure DevOps, use PAT as username (most common format)
    urlObj.username = pat;
    urlObj.password = ""; // No password needed
    return urlObj.toString();
  } catch (_e) {
    // If URL parsing fails, try manual replacement
    // Format: https://host/path -> https://PAT@host/path
    const encodedPat = encodeURIComponent(pat);
    return url.replace(HTTPS_PREFIX_REGEX, `https://${encodedPat}@`);
  }
};

/**
 * Helper function to authenticate GitHub URLs with token
 */
export const authenticateGitHubUrl = (url: string, token?: string): string => {
  if (!token) {
    return url;
  }

  // Check if URL is already authenticated
  const urlMatch = url.match(AUTHENTICATED_URL_REGEX);
  if (urlMatch) {
    // URL already has authentication, return as-is
    return url;
  }

  // Check if URL is GitHub
  const isGitHub = url.includes("github.com");
  if (!isGitHub) {
    return url;
  }

  // Insert token into URL: https://github.com/owner/repo.git -> https://x-access-token:TOKEN@github.com/owner/repo.git
  try {
    const urlObj = new URL(url);
    urlObj.username = "x-access-token";
    urlObj.password = token;
    return urlObj.toString();
  } catch (_e) {
    // If URL parsing fails, try manual replacement
    return url.replace(/^https:\/\//, `https://x-access-token:${token}@`);
  }
};

const buildGitConfigCommands = (
  repoPath: string,
  gitEmail: string,
  gitName: string
): string[] => {
  return [
    `git -C ${repoPath} config user.email "${gitEmail}"`,
    `git -C ${repoPath} config user.name "${gitName}"`,
  ];
};

export const checkoutBranch = async (
  config: GitConfig,
  branchName: string,
  defaultBranch = "main",
  fs: FileSystem = { existsSync: require("node:fs").existsSync },
  execFn: ExecFunction = require("node:util").promisify(
    require("node:child_process").exec
  )
): Promise<Result<void>> => {
  // Verify repository directory exists
  if (!fs.existsSync(config.repoPath)) {
    // Try to determine if this is a worktree issue
    const worktreeMatch = config.repoPath.match(WORKTREE_PATH_REGEX);
    let diagnosticInfo = "";

    if (worktreeMatch) {
      const potentialMainRepoPath = worktreeMatch[1];
      if (potentialMainRepoPath && fs.existsSync(potentialMainRepoPath)) {
        try {
          // Check if worktree is still registered
          const { stdout } = await execFn(
            `git -C ${potentialMainRepoPath} worktree list --porcelain`
          );
          if (stdout.includes(config.repoPath)) {
            diagnosticInfo = ` Worktree is registered in main repo at ${potentialMainRepoPath} but directory is missing.`;
          } else {
            diagnosticInfo = ` Worktree directory missing and not registered in main repo at ${potentialMainRepoPath}.`;
          }
        } catch (checkError) {
          diagnosticInfo = ` Unable to check worktree status from main repo: ${checkError instanceof Error ? checkError.message : String(checkError)}.`;
        }
      } else if (potentialMainRepoPath) {
        diagnosticInfo = ` Main repository path ${potentialMainRepoPath} also does not exist.`;
      }
    }

    return err(
      new Error(
        `Repository directory does not exist: ${config.repoPath}.${diagnosticInfo}`
      )
    );
  }

  // Verify it's actually a git repository by checking for .git directory or gitdir
  try {
    await execFn(`git -C ${config.repoPath} rev-parse --git-dir`);
  } catch (gitCheckError) {
    const errorMsg =
      gitCheckError instanceof Error
        ? gitCheckError.message
        : String(gitCheckError);
    // If error mentions "not a git repository", provide better error message
    if (
      errorMsg.includes("not a git") ||
      errorMsg.includes("No such file or directory")
    ) {
      return err(
        new Error(
          `Path exists but is not a valid git repository: ${config.repoPath}. Error: ${errorMsg}`
        )
      );
    }
    // For other errors, continue - might be a worktree issue that's OK
  }

  try {
    // Ensure Git user is configured
    const gitEmail = config.gitUserEmail || "minions-farm@automated.local";
    const gitName = config.gitUserName || "Minions Farm Agent";

    const configCommands = buildGitConfigCommands(
      config.repoPath,
      gitEmail,
      gitName
    );
    await Promise.all(
      configCommands.map((cmd) =>
        execFn(cmd).catch(() => {
          // Ignore git config errors - they're not critical
        })
      )
    );

    // Check current branch - if already on target, skip checkout
    try {
      const { stdout: currentBranch } = await execFn(
        `git -C ${config.repoPath} rev-parse --abbrev-ref HEAD`
      );
      if (currentBranch.trim() === branchName) {
        // Already on the target branch, just try to pull latest
        await execFn(
          `git -C ${config.repoPath} pull origin ${branchName}`
        ).catch(() => {
          // Ignore pull errors when already on target branch
        });
        return ok(undefined);
      }
    } catch {
      // Ignore - continue with checkout
    }

    // If branchName is the default branch (main/master/dev), just check it out
    if (
      branchName === defaultBranch ||
      branchName === "main" ||
      branchName === "master"
    ) {
      try {
        await execFn(`git -C ${config.repoPath} checkout ${branchName}`);
        await execFn(
          `git -C ${config.repoPath} pull origin ${branchName}`
        ).catch(() => {
          // Ignore pull errors after checkout
        });
        return ok(undefined);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);

        // Handle worktree conflict: branch is already checked out elsewhere
        if (
          errorMsg.includes("already used by worktree") ||
          errorMsg.includes("is checked out at")
        ) {
          // For worktree conflicts, we can still work - just skip the checkout
          // The worktree was created with its own branch, use that instead
          console.warn(
            `[git-adapter] Branch '${branchName}' is used by another worktree, staying on current branch`
          );
          return ok(undefined);
        }

        return err(
          new Error(`Failed to checkout branch ${branchName}: ${errorMsg}`)
        );
      }
    }

    // For other branches, ensure we're on default branch first (ignore worktree errors)
    try {
      await execFn(`git -C ${config.repoPath} checkout ${defaultBranch}`).catch(
        (checkoutError) => {
          const errorStr = String(checkoutError);
          // Ignore worktree conflicts
          if (
            errorStr.includes("already used by worktree") ||
            errorStr.includes("is checked out at")
          ) {
            return; // Continue with current branch
          }
          // If defaultBranch doesn't exist, try main as fallback
          return execFn(`git -C ${config.repoPath} checkout main`).catch(
            (mainError) => {
              const mainErrorStr = String(mainError);
              if (
                mainErrorStr.includes("already used by worktree") ||
                mainErrorStr.includes("is checked out at")
              ) {
                return;
              }
              // If main doesn't exist, try master
              return execFn(`git -C ${config.repoPath} checkout master`).catch(
                () => {
                  // Ignore checkout errors for fallback branches
                }
              );
            }
          );
        }
      );
    } catch {
      // If all fail, continue with current branch
    }

    // Fetch latest changes (ignore errors)
    await execFn(
      `git -C ${config.repoPath} fetch origin ${defaultBranch}`
    ).catch(() => {
      // Ignore fetch errors
    });
    await execFn(
      `git -C ${config.repoPath} pull origin ${defaultBranch}`
    ).catch(() => {
      // Try main or master as fallback (ignore all errors)
      return execFn(`git -C ${config.repoPath} pull origin main`).catch(() => {
        return execFn(`git -C ${config.repoPath} pull origin master`).catch(
          () => {
            // Ignore pull errors for fallback branches
          }
        );
      });
    });

    // Check if branch already exists locally
    try {
      const { stdout } = await execFn(
        `git -C ${config.repoPath} branch --list ${branchName}`
      );
      if (stdout.trim()) {
        // Branch exists, try to check it out
        try {
          await execFn(`git -C ${config.repoPath} checkout ${branchName}`);
          // Try to pull latest changes from origin
          await execFn(
            `git -C ${config.repoPath} pull origin ${branchName}`
          ).catch(() => {
            // Ignore pull errors after checkout
          });
          return ok(undefined);
        } catch (checkoutError) {
          const errorStr = String(checkoutError);
          // If it's a worktree conflict, that's OK - we're probably already on the right branch
          if (
            errorStr.includes("already used by worktree") ||
            errorStr.includes("is checked out at")
          ) {
            return ok(undefined);
          }
          throw checkoutError;
        }
      }
    } catch {
      // Continue to create branch
    }

    // Now create new branch from current position
    // Verify directory still exists before creating branch (defensive check)
    if (!fs.existsSync(config.repoPath)) {
      return err(
        new Error(
          `Repository directory disappeared before creating branch ${branchName}: ${config.repoPath}`
        )
      );
    }

    try {
      await execFn(`git -C ${config.repoPath} checkout -b ${branchName}`);
      return ok(undefined);
    } catch (createError) {
      // Verify directory still exists after error
      if (!fs.existsSync(config.repoPath)) {
        return err(
          new Error(
            `Repository directory disappeared during branch creation: ${config.repoPath}. Original error: ${createError instanceof Error ? createError.message : String(createError)}`
          )
        );
      }

      const errorStr = String(createError);
      // If branch already exists, just check it out
      if (errorStr.includes("already exists")) {
        try {
          await execFn(`git -C ${config.repoPath} checkout ${branchName}`);
          return ok(undefined);
        } catch (checkoutError2) {
          const checkoutErrorStr = String(checkoutError2);
          if (
            checkoutErrorStr.includes("already used by worktree") ||
            checkoutErrorStr.includes("is checked out at")
          ) {
            return ok(undefined); // That's fine, we're on some branch
          }
          throw checkoutError2;
        }
      }
      throw createError;
    }
  } catch (error) {
    // Final fallback: try checking out existing branch
    try {
      await execFn(`git -C ${config.repoPath} checkout ${branchName}`);
      return ok(undefined);
    } catch (e) {
      const eStr = String(e);
      // If worktree conflict, return OK
      if (
        eStr.includes("already used by worktree") ||
        eStr.includes("is checked out at")
      ) {
        console.warn(
          `[git-adapter] Branch '${branchName}' is used by another worktree, continuing anyway`
        );
        return ok(undefined);
      }
      const errorMsg = error instanceof Error ? error.message : String(error);
      return err(
        new Error(`Failed to checkout branch ${branchName}: ${errorMsg}`)
      );
    }
  }
};

export const commitChanges = async (
  config: GitConfig,
  message: string,
  fs: FileSystem = { existsSync: require("node:fs").existsSync },
  execFn: ExecFunction = require("node:util").promisify(
    require("node:child_process").exec
  )
): Promise<Result<void>> => {
  // Verify repository directory exists
  if (!fs.existsSync(config.repoPath)) {
    return err(
      new Error(`Repository directory does not exist: ${config.repoPath}`)
    );
  }

  try {
    // Ensure Git user is configured
    const gitEmail = config.gitUserEmail || "minions-farm@automated.local";
    const gitName = config.gitUserName || "Minions Farm Agent";

    const configCommands = buildGitConfigCommands(
      config.repoPath,
      gitEmail,
      gitName
    );
    await Promise.all(
      configCommands.map((cmd) =>
        execFn(cmd).catch(() => {
          // Ignore git config errors - they're not critical
        })
      )
    );

    // Check if there are any changes to commit
    try {
      // Check for unstaged changes
      const { stdout: statusOutput } = await execFn(
        `git -C ${config.repoPath} status --porcelain`
      );
      if (!statusOutput.trim()) {
        // No changes detected, return error to indicate nothing to commit
        return err(
          new Error("No changes detected in the repository. Nothing to commit.")
        );
      }
    } catch (_statusError) {
      // If status check fails, continue anyway and let commit fail with a better error
    }

    // Stage all changes
    await execFn(`git -C ${config.repoPath} add .`);

    // Check if there are staged changes after adding
    try {
      const { stdout: diffOutput } = await execFn(
        `git -C ${config.repoPath} diff --cached --quiet && echo "no changes" || echo "has changes"`
      );
      if (diffOutput.trim() === "no changes") {
        // No changes to commit after staging
        return err(
          new Error(
            "No changes to commit after staging. All changes were already committed or there are no file modifications."
          )
        );
      }
    } catch {
      // Continue with commit attempt
    }

    // Escape message for shell command
    const escapedMessage = message.replace(/"/g, '\\"');

    try {
      await execFn(`git -C ${config.repoPath} commit -m "${escapedMessage}"`);
      return ok(undefined);
    } catch (commitError) {
      const errorMsg =
        commitError instanceof Error
          ? commitError.message
          : String(commitError);

      // Check if error is because there's nothing to commit
      if (
        errorMsg.includes("nothing to commit") ||
        errorMsg.includes("nothing added to commit")
      ) {
        // Return error to indicate no changes were committed
        return err(
          new Error(
            "Git commit failed: No changes to commit. The repository has no staged changes to commit."
          )
        );
      }

      // For other errors, return the error
      return err(new Error(`Failed to commit changes: ${errorMsg}`));
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);

    // Check if error is because there's nothing to commit
    if (
      errorMsg.includes("nothing to commit") ||
      errorMsg.includes("nothing added to commit")
    ) {
      return err(
        new Error(
          "Git commit failed: No changes to commit. The repository has no staged changes to commit."
        )
      );
    }

    return err(new Error(`Failed to commit changes: ${errorMsg}`));
  }
};

export const pushBranch = async (
  config: GitConfig,
  branchName: string,
  fs: FileSystem = { existsSync: require("node:fs").existsSync },
  execFn: ExecFunction = require("node:util").promisify(
    require("node:child_process").exec
  ),
  force = true
): Promise<Result<void>> => {
  // Verify repository directory exists
  if (!fs.existsSync(config.repoPath)) {
    return err(
      new Error(`Repository directory does not exist: ${config.repoPath}`)
    );
  }

  try {
    // Ensure Git user is configured
    const gitEmail = config.gitUserEmail || "minions-farm@automated.local";
    const gitName = config.gitUserName || "Minions Farm Agent";

    const configCommands = buildGitConfigCommands(
      config.repoPath,
      gitEmail,
      gitName
    );
    await Promise.all(
      configCommands.map((cmd) =>
        execFn(cmd).catch(() => {
          // Ignore git config errors - they're not critical
        })
      )
    );

    // Authenticate remote URL before pushing (for both Azure DevOps and GitHub)
    let authenticatedUrl = config.repoUrl;
    if (config.pat) {
      // Check if it's GitHub or Azure DevOps
      const isGitHub = config.repoUrl?.includes("github.com");
      if (isGitHub) {
        authenticatedUrl = authenticateGitHubUrl(config.repoUrl, config.pat);
      } else {
        authenticatedUrl = authenticateAzureDevOpsUrl(
          config.repoUrl,
          config.pat
        );
      }

      if (authenticatedUrl !== config.repoUrl) {
        const escapedUrl = authenticatedUrl.replace(/'/g, "'\\''");
        await execFn(
          `git -C ${config.repoPath} remote set-url origin '${escapedUrl}'`
        );
      }
    }

    const forceFlag = force ? " --force" : "";
    await execFn(
      `git -C ${config.repoPath} push -u origin ${branchName}${forceFlag}`
    );
    return ok(undefined);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return err(new Error(`Failed to push branch ${branchName}: ${errorMsg}`));
  }
};

export const createPr = async (
  _config: GitConfig,
  _title: string,
  _body: string,
  branchName: string
): Promise<Result<string>> => {
  // PR creation is handled by the Azure Adapter for Azure DevOps repositories.
  // This is a placeholder for other git providers.
  return ok(`PR for ${branchName} created (simulated)`);
};
