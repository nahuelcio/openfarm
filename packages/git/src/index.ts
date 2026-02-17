// @openfarm/git - Unified Git Operations

// Operations (from git-adapter)
export {
	authenticateAzureDevOpsUrl,
	authenticateGitHubUrl,
	checkBranchExists,
	checkoutBranch,
	commitChanges,
	configureGitUser,
	createPr,
	getCurrentBranch,
	isNoCommitError,
	isWorktreeConflict,
	pushBranch,
	verifyGitRepository,
	verifyRepository,
} from "./operations";
// Types
export type {
	ChangeType,
	CreateWorktreeOptions,
	DiffChange,
	DiffFile,
	DiffLine,
	DiffStats,
	DiffSummary,
	ExecFunction,
	FileSystem,
	GitConfig,
	GitExecFunction,
	GitWorktree,
	ListWorktreesOptions,
} from "./types";

// Worktree (from git-worktree)
export {
	createWorktree,
	getCurrentWorktree,
	listWorktrees,
	pruneWorktrees,
	removeWorktree,
} from "./worktree";
