/**
 * @openfarm/git-worktree
 * 
 * Git worktree utilities for OpenFarm - manage multiple working trees efficiently
 */

export type {
  GitWorktree,
  CreateWorktreeOptions,
  ListWorktreesOptions,
  GitExecFunction,
} from "./types";

export {
  listWorktrees,
  createWorktree,
  removeWorktree,
  pruneWorktrees,
  getCurrentWorktree,
} from "./worktree";