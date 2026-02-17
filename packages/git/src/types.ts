// Git Types - Consolidated from git-adapter, git-worktree, and git-diff

export type { GitConfig } from "@openfarm/core/types/git";

// Worktree types (from git-worktree)
export interface GitWorktree {
	path: string;
	branch: string;
	commit: string;
	isMain: boolean;
	exists: boolean;
}

export interface CreateWorktreeOptions {
	path: string;
	branch: string;
	createBranch?: boolean;
	baseBranch?: string;
	force?: boolean;
}

export interface ListWorktreesOptions {
	includeStale?: boolean;
}

export type GitExecFunction = (
	args: string[],
	options?: { cwd?: string },
) => Promise<{ stdout: string; stderr: string }>;

// Diff types (from git-diff)
export type ChangeType =
	| "added"
	| "modified"
	| "deleted"
	| "renamed"
	| "copied";

export interface DiffLine {
	type: "added" | "removed" | "context";
	content: string;
	lineNumber?: number;
	oldLineNumber?: number;
	newLineNumber?: number;
}

export interface DiffFile {
	path: string;
	oldPath?: string;
	changeType: ChangeType;
	additions: number;
	deletions: number;
	lines: DiffLine[];
	isBinary: boolean;
	isNew: boolean;
	isDeleted: boolean;
	isRenamed: boolean;
}

export interface DiffChange {
	files: DiffFile[];
	totalAdditions: number;
	totalDeletions: number;
	totalFiles: number;
}

export interface DiffSummary {
	filesChanged: number;
	insertions: number;
	deletions: number;
	fileTypes: Record<string, number>;
	largestFiles: Array<{
		path: string;
		changes: number;
	}>;
}

export interface DiffStats {
	additions: number;
	deletions: number;
	changes: number;
	files: number;
	binaryFiles: number;
}

// Git operations types (from git-adapter)
export interface FileSystem {
	existsSync: (path: string) => boolean;
}

export type ExecFunction = (
	command: string,
) => Promise<{ stdout: string; stderr: string }>;
