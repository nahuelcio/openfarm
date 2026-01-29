import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { promisify } from "node:util";
import { logger } from "@openfarm/logger";
import { err, ok, type Result } from "@openfarm/result";
import type {
  CreateWorktreeOptions,
  GitExecFunction,
  GitWorktree,
  ListWorktreesOptions,
} from "./types";

const execFileAsync = promisify(execFile);

/**
 * Default git execution function
 */
const defaultGitExec: GitExecFunction = async (
  args: string[],
  options?: { cwd?: string }
): Promise<{ stdout: string; stderr: string }> => {
  const result = await execFileAsync("git", args, options);
  return {
    stdout: result.stdout?.toString() || "",
    stderr: result.stderr?.toString() || "",
  };
};

/**
 * Lists all git worktrees in the repository
 */
export async function listWorktrees(
  repoPath: string,
  options: ListWorktreesOptions = {},
  gitExec: GitExecFunction = defaultGitExec
): Promise<Result<GitWorktree[]>> {
  try {
    const { stdout } = await gitExec(["worktree", "list", "--porcelain"], {
      cwd: repoPath,
    });

    const worktrees: GitWorktree[] = [];
    const lines = stdout.trim().split("\n").filter(line => line.trim() !== "");
    let currentWorktree: Partial<GitWorktree> = {};

    for (const line of lines) {
      if (line.startsWith("worktree ")) {
        // Save previous worktree if exists
        if (currentWorktree.path) {
          const exists = existsSync(currentWorktree.path);
          if (options.includeStale || exists) {
            worktrees.push({
              path: currentWorktree.path,
              branch: currentWorktree.branch || "",
              commit: currentWorktree.commit || "",
              isMain: currentWorktree.isMain || false,
              exists,
            });
          }
        }
        // Start new worktree
        currentWorktree = {
          path: line.substring("worktree ".length),
          isMain: false,
        };
      } else if (line.startsWith("HEAD ")) {
        currentWorktree.commit = line.substring("HEAD ".length);
      } else if (line.startsWith("branch ")) {
        currentWorktree.branch = line.substring("branch refs/heads/".length);
      } else if (line === "bare") {
        currentWorktree.isMain = true;
      }
    }

    // Add the last worktree
    if (currentWorktree.path) {
      const exists = existsSync(currentWorktree.path);
      if (options.includeStale || exists) {
        worktrees.push({
          path: currentWorktree.path,
          branch: currentWorktree.branch || "",
          commit: currentWorktree.commit || "",
          isMain: currentWorktree.isMain || false,
          exists,
        });
      }
    }

    return ok(worktrees);
  } catch (error) {
    logger.error({ error, repoPath }, "Failed to list worktrees");
    return err(
      error instanceof Error ? error : new Error("Failed to list worktrees")
    );
  }
}

/**
 * Creates a new git worktree
 */
export async function createWorktree(
  repoPath: string,
  options: CreateWorktreeOptions,
  gitExec: GitExecFunction = defaultGitExec
): Promise<Result<GitWorktree>> {
  try {
    const args = ["worktree", "add"];

    if (options.force) {
      args.push("--force");
    }

    if (options.createBranch) {
      args.push("-b", options.branch);
    }

    args.push(options.path);

    if (!options.createBranch) {
      args.push(options.branch);
    } else if (options.baseBranch) {
      args.push(options.baseBranch);
    }

    await gitExec(args, { cwd: repoPath });

    // Verify the worktree was created
    const worktreesResult = await listWorktrees(repoPath, { includeStale: true }, gitExec);
    if (!worktreesResult.ok) {
      return err(worktreesResult.error);
    }

    const createdWorktree = worktreesResult.value.find(
      (wt) => wt.path === options.path
    );

    if (!createdWorktree) {
      return err(new Error("Worktree was not created successfully"));
    }

    logger.info(
      { path: options.path, branch: options.branch },
      "Worktree created successfully"
    );

    return ok(createdWorktree);
  } catch (error) {
    logger.error({ error, options }, "Failed to create worktree");
    return err(
      error instanceof Error ? error : new Error("Failed to create worktree")
    );
  }
}

/**
 * Removes a git worktree
 */
export async function removeWorktree(
  repoPath: string,
  worktreePath: string,
  force = false,
  gitExec: GitExecFunction = defaultGitExec
): Promise<Result<void>> {
  try {
    const args = ["worktree", "remove"];

    if (force) {
      args.push("--force");
    }

    args.push(worktreePath);

    await gitExec(args, { cwd: repoPath });

    logger.info({ worktreePath }, "Worktree removed successfully");
    return ok(undefined);
  } catch (error) {
    logger.error({ error, worktreePath }, "Failed to remove worktree");
    return err(
      error instanceof Error ? error : new Error("Failed to remove worktree")
    );
  }
}

/**
 * Prunes stale worktree references
 */
export async function pruneWorktrees(
  repoPath: string,
  gitExec: GitExecFunction = defaultGitExec
): Promise<Result<void>> {
  try {
    await gitExec(["worktree", "prune"], { cwd: repoPath });
    logger.info({ repoPath }, "Worktrees pruned successfully");
    return ok(undefined);
  } catch (error) {
    logger.error({ error, repoPath }, "Failed to prune worktrees");
    return err(
      error instanceof Error ? error : new Error("Failed to prune worktrees")
    );
  }
}

/**
 * Gets the current worktree info for a given path
 */
export async function getCurrentWorktree(
  path: string,
  gitExec: GitExecFunction = defaultGitExec
): Promise<Result<GitWorktree | null>> {
  try {
    // Get the git directory to find the main repo
    const { stdout: gitDir } = await gitExec(["rev-parse", "--git-dir"], {
      cwd: path,
    });

    // Get the worktree path
    const { stdout: worktreePath } = await gitExec(
      ["rev-parse", "--show-toplevel"],
      { cwd: path }
    );

    // Get current branch
    const { stdout: branch } = await gitExec(
      ["rev-parse", "--abbrev-ref", "HEAD"],
      { cwd: path }
    );

    // Get current commit
    const { stdout: commit } = await gitExec(["rev-parse", "HEAD"], {
      cwd: path,
    });

    const isMain = gitDir.trim() === ".git";

    return ok({
      path: worktreePath.trim(),
      branch: branch.trim(),
      commit: commit.trim(),
      isMain,
      exists: true,
    });
  } catch (error) {
    // Not a git repository or other error
    return ok(null);
  }
}