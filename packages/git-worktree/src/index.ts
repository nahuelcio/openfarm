/**
 * @openfarm/git-worktree
 *
 * Git worktree utilities for OpenFarm - manage multiple working trees efficiently
 */

export type {
  CreateWorktreeOptions,
  GitExecFunction,
  GitWorktree,
  ListWorktreesOptions,
} from "./types";

export {
  createWorktree,
  getCurrentWorktree,
  listWorktrees,
  pruneWorktrees,
  removeWorktree,
} from "./worktree";
