/**
 * Represents a git worktree
 */
export interface GitWorktree {
  /** Absolute path to the worktree directory */
  path: string;
  /** Branch name checked out in this worktree */
  branch: string;
  /** Git commit hash */
  commit: string;
  /** Whether this is the main worktree (bare repository) */
  isMain: boolean;
  /** Whether the worktree directory exists on disk */
  exists: boolean;
}

/**
 * Options for creating a new worktree
 */
export interface CreateWorktreeOptions {
  /** Path where the new worktree should be created */
  path: string;
  /** Branch name for the new worktree */
  branch: string;
  /** Whether to create a new branch (default: false) */
  createBranch?: boolean;
  /** Base branch/commit to create the new branch from */
  baseBranch?: string;
  /** Force creation even if path exists */
  force?: boolean;
}

/**
 * Options for listing worktrees
 */
export interface ListWorktreesOptions {
  /** Include worktrees that don't exist on disk */
  includeStale?: boolean;
}

/**
 * Git execution function type
 */
export type GitExecFunction = (
  args: string[],
  options?: { cwd?: string }
) => Promise<{ stdout: string; stderr: string }>;