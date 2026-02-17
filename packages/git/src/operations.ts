import { err, ok, type Result } from "@openfarm/result";
import type { ExecFunction, FileSystem, GitConfig } from "./types";

// Regex patterns at top level for performance
const AUTHENTICATED_URL_REGEX = /^https:\/\/([^@/]+)@/;
const HTTPS_PREFIX_REGEX = /^https:\/\//;

// Error message patterns
const WORKTREE_CONFLICT_PATTERNS = [
	"already used by worktree",
	"is checked out at",
];
const NO_COMMIT_ERRORS = ["nothing to commit", "nothing added to commit"];

// Default git user configuration
const DEFAULT_GIT_EMAIL = "minions-farm@automated.local";
const DEFAULT_GIT_NAME = "Minions Farm Agent";

/**
 * Helper function to authenticate Azure DevOps URLs with PAT
 */
export const authenticateAzureDevOpsUrl = (
	url: string,
	pat?: string,
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

/**
 * Check if an error message indicates a worktree conflict
 */
export function isWorktreeConflict(error: unknown): boolean {
	const errorMsg = String(error);
	return WORKTREE_CONFLICT_PATTERNS.some((pattern) =>
		errorMsg.includes(pattern),
	);
}

/**
 * Check if an error message indicates no changes to commit
 */
export function isNoCommitError(errorMsg: string): boolean {
	return NO_COMMIT_ERRORS.some((msg) => errorMsg.includes(msg));
}

/**
 * Build git config commands for setting user email and name
 */
function buildGitConfigCommands(
	repoPath: string,
	gitEmail: string,
	gitName: string,
): string[] {
	return [
		`git -C ${repoPath} config user.email "${gitEmail}"`,
		`git -C ${repoPath} config user.name "${gitName}"`,
	];
}

/**
 * Verify repository directory exists
 */
export function verifyRepository(
	config: GitConfig,
	fs: FileSystem,
): Result<void> {
	if (!fs.existsSync(config.repoPath)) {
		return err(
			new Error(`Repository directory does not exist: ${config.repoPath}`),
		);
	}
	return ok(undefined);
}

/**
 * Verify it's a git repository by checking for .git directory
 */
export async function verifyGitRepository(
	config: GitConfig,
	execFn: ExecFunction,
): Promise<Result<void>> {
	try {
		await execFn(`git -C ${config.repoPath} rev-parse --git-dir`);
		return ok(undefined);
	} catch (error) {
		const errorMsg = error instanceof Error ? error.message : String(error);
		if (
			errorMsg.includes("not a git") ||
			errorMsg.includes("No such file or directory")
		) {
			return err(
				new Error(
					`Path exists but is not a valid git repository: ${config.repoPath}. Error: ${errorMsg}`,
				),
			);
		}
		// For other errors, continue - might be a worktree issue that's OK
		return ok(undefined);
	}
}

/**
 * Handle worktree conflict errors
 */
export function handleWorktreeConflict(
	branchName: string,
	error: Error,
): Result<void> {
	if (isWorktreeConflict(error)) {
		console.warn(
			`[git-adapter] Branch '${branchName}' is used by another worktree, staying on current branch`,
		);
		return ok(undefined);
	}
	return err(error);
}

/**
 * Get the current branch name
 */
export async function getCurrentBranch(
	config: GitConfig,
	execFn: ExecFunction,
): Promise<string> {
	try {
		const { stdout } = await execFn(
			`git -C ${config.repoPath} rev-parse --abbrev-ref HEAD`,
		);
		return stdout.trim();
	} catch {
		return "";
	}
}

/**
 * Check if a branch exists locally
 */
export async function checkBranchExists(
	config: GitConfig,
	branchName: string,
	execFn: ExecFunction,
): Promise<boolean> {
	try {
		const { stdout } = await execFn(
			`git -C ${config.repoPath} branch --list ${branchName}`,
		);
		return stdout.trim().length > 0;
	} catch {
		return false;
	}
}

/**
 * Configure git user email and name
 */
export async function configureGitUser(
	config: GitConfig,
	execFn: ExecFunction,
): Promise<void> {
	const gitEmail = config.gitUserEmail || DEFAULT_GIT_EMAIL;
	const gitName = config.gitUserName || DEFAULT_GIT_NAME;

	const configCommands = buildGitConfigCommands(
		config.repoPath,
		gitEmail,
		gitName,
	);
	await Promise.all(
		configCommands.map((cmd) =>
			execFn(cmd).catch(() => {
				// Ignore git config errors - they're not critical
			}),
		),
	);
}

/**
 * Check if branch name is a default branch
 */
export function isDefaultBranch(
	branchName: string,
	defaultBranch: string,
): boolean {
	return (
		branchName === defaultBranch ||
		branchName === "main" ||
		branchName === "master"
	);
}

/**
 * Pull latest changes from origin for a branch
 */
export async function pullBranch(
	config: GitConfig,
	branchName: string,
	execFn: ExecFunction,
): Promise<void> {
	await execFn(`git -C ${config.repoPath} pull origin ${branchName}`).catch(
		() => {
			// Ignore pull errors
		},
	);
}

/**
 * Checkout a default branch (main/master/dev)
 */
export async function checkoutDefaultBranch(
	config: GitConfig,
	branchName: string,
	execFn: ExecFunction,
): Promise<Result<void>> {
	try {
		await execFn(`git -C ${config.repoPath} checkout ${branchName}`);
		await pullBranch(config, branchName, execFn);
		return ok(undefined);
	} catch (error) {
		return err(error instanceof Error ? error : new Error(String(error)));
	}
}

/**
 * Switch to default branch with fallback to main/master
 */
export async function switchToDefaultBranch(
	config: GitConfig,
	defaultBranch: string,
	execFn: ExecFunction,
): Promise<Result<void>> {
	const branchesToTry = [defaultBranch, "main", "master"];

	for (const branch of branchesToTry) {
		try {
			await execFn(`git -C ${config.repoPath} checkout ${branch}`);
			return ok(undefined);
		} catch {
			// If it's a worktree conflict, skip to next branch
			// If branch doesn't exist or other errors, also skip to next branch
		}
	}

	// If all fail, return ok to continue with current branch
	return ok(undefined);
}

/**
 * Fetch and pull from origin
 */
export async function fetchAndPull(
	config: GitConfig,
	branchName: string,
	execFn: ExecFunction,
): Promise<void> {
	// Fetch latest changes (ignore errors)
	await execFn(`git -C ${config.repoPath} fetch origin ${branchName}`).catch(
		() => {
			// Ignore fetch errors
		},
	);

	// Pull with fallback branches
	const branchesToTry = [branchName, "main", "master"];
	for (const branch of branchesToTry) {
		try {
			await execFn(`git -C ${config.repoPath} pull origin ${branch}`);
			return;
		} catch {
			// Try next branch
		}
	}
}

/**
 * Checkout an existing branch
 */
export async function checkoutExistingBranch(
	config: GitConfig,
	branchName: string,
	execFn: ExecFunction,
): Promise<Result<void>> {
	try {
		await execFn(`git -C ${config.repoPath} checkout ${branchName}`);
		await pullBranch(config, branchName, execFn);
		return ok(undefined);
	} catch (error) {
		const errorStr = String(error);
		if (isWorktreeConflict(errorStr)) {
			return ok(undefined);
		}
		return err(error instanceof Error ? error : new Error(String(error)));
	}
}

/**
 * Create a branch with specified name
 */
export async function createBranch(
	config: GitConfig,
	branchName: string,
	execFn: ExecFunction,
): Promise<Result<void>> {
	try {
		await execFn(`git -C ${config.repoPath} checkout -b ${branchName}`);
		return ok(undefined);
	} catch (error) {
		const errorStr = String(error);
		// If branch already exists, just check it out
		if (errorStr.includes("already exists")) {
			return checkoutExistingBranch(config, branchName, execFn);
		}
		if (isWorktreeConflict(errorStr)) {
			return ok(undefined);
		}
		return err(error instanceof Error ? error : new Error(String(error)));
	}
}

/**
 * Checkout a branch with options-based configuration
 */
async function checkoutBranchWithOptions(
	config: GitConfig,
	branchName: string,
	options?: { defaultBranch?: string; skipConfigure?: boolean },
): Promise<Result<void>> {
	const fs = require("node:fs") as { existsSync: (path: string) => boolean };
	const execFn = require("node:util").promisify(
		require("node:child_process").exec,
	) as ExecFunction;

	// Step 1: Verify repository
	const verifyResult = verifyRepository(config, { existsSync: fs.existsSync });
	if (!verifyResult.ok) {
		return verifyResult;
	}

	const gitVerifyResult = await verifyGitRepository(config, execFn);
	if (!gitVerifyResult.ok) {
		return gitVerifyResult;
	}

	// Step 2: Configure git
	if (!options?.skipConfigure) {
		await configureGitUser(config, execFn);
	}

	// Step 3: Check if already on target branch
	const currentBranch = await getCurrentBranch(config, execFn);
	if (currentBranch === branchName) {
		await pullBranch(config, branchName, execFn);
		return ok(undefined);
	}

	const defaultBranch = options?.defaultBranch ?? "main";

	// Step 4: Try default branch first
	if (isDefaultBranch(branchName, defaultBranch)) {
		const result = await checkoutDefaultBranch(config, branchName, execFn);
		if (result.ok) {
			return result;
		}
		const conflictResult = handleWorktreeConflict(
			branchName,
			result.error as Error,
		);
		if (conflictResult.ok) {
			return conflictResult;
		}
	}

	// Step 5: Checkout from default branch
	const switchResult = await switchToDefaultBranch(
		config,
		defaultBranch,
		execFn,
	);
	if (!switchResult.ok) {
		const conflictResult = handleWorktreeConflict(
			defaultBranch,
			switchResult.error as Error,
		);
		if (conflictResult.ok) {
			return conflictResult;
		}
	}

	// Step 6: Fetch and pull
	await fetchAndPull(config, defaultBranch, execFn);

	// Step 7: Create or checkout branch
	const branchExists = await checkBranchExists(config, branchName, execFn);
	if (branchExists) {
		return checkoutExistingBranch(config, branchName, execFn);
	}
	return createBranch(config, branchName, execFn);
}

export async function checkoutBranch(
	config: GitConfig,
	branchName: string,
	options?: { defaultBranch?: string; skipConfigure?: boolean },
): Promise<Result<void>> {
	return checkoutBranchWithOptions(config, branchName, options);
}

export const commitChanges = async (
	config: GitConfig,
	message: string,
	fs: FileSystem = { existsSync: require("node:fs").existsSync },
	execFn: ExecFunction = require("node:util").promisify(
		require("node:child_process").exec,
	),
): Promise<Result<void>> => {
	// Verify repository directory exists
	const verifyResult = verifyRepository(config, fs);
	if (!verifyResult.ok) {
		return verifyResult;
	}

	try {
		// Ensure Git user is configured
		await configureGitUser(config, execFn);

		// Check if there are any changes to commit
		try {
			// Check for unstaged changes
			const { stdout: statusOutput } = await execFn(
				`git -C ${config.repoPath} status --porcelain`,
			);
			if (!statusOutput.trim()) {
				// No changes detected, return error to indicate nothing to commit
				return err(
					new Error(
						"No changes detected in the repository. Nothing to commit.",
					),
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
				`git -C ${config.repoPath} diff --cached --quiet && echo "no changes" || echo "has changes"`,
			);
			if (diffOutput.trim() === "no changes") {
				// No changes to commit after staging
				return err(
					new Error(
						"No changes to commit after staging. All changes were already committed or there are no file modifications.",
					),
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
			if (isNoCommitError(errorMsg)) {
				// Return error to indicate no changes were committed
				return err(
					new Error(
						"Git commit failed: No changes to commit. The repository has no staged changes to commit.",
					),
				);
			}

			// For other errors, return the error
			return err(new Error(`Failed to commit changes: ${errorMsg}`));
		}
	} catch (error) {
		const errorMsg = error instanceof Error ? error.message : String(error);

		// Check if error is because there's nothing to commit
		if (isNoCommitError(errorMsg)) {
			return err(
				new Error(
					"Git commit failed: No changes to commit. The repository has no staged changes to commit.",
				),
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
		require("node:child_process").exec,
	),
	force = true,
): Promise<Result<void>> => {
	// Verify repository directory exists
	const verifyResult = verifyRepository(config, fs);
	if (!verifyResult.ok) {
		return verifyResult;
	}

	try {
		// Ensure Git user is configured
		await configureGitUser(config, execFn);

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
					config.pat,
				);
			}

			if (authenticatedUrl !== config.repoUrl) {
				const escapedUrl = authenticatedUrl.replace(/'/g, "'\\''");
				await execFn(
					`git -C ${config.repoPath} remote set-url origin '${escapedUrl}'`,
				);
			}
		}

		const forceFlag = force ? " --force" : "";
		await execFn(
			`git -C ${config.repoPath} push -u origin ${branchName}${forceFlag}`,
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
	branchName: string,
): Promise<Result<string>> => {
	// PR creation is handled by the Azure Adapter for Azure DevOps repositories.
	// This is a placeholder for other git providers.
	return ok(`PR for ${branchName} created (simulated)`);
};
