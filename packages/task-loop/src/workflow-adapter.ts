/**
 * Workflow Adapter
 *
 * DEPRECATED: This module is deprecated. Use @openfarm/workflow-executor instead.
 */

import type { WorkItem } from "@openfarm/core/types";
import type { TaskLoopConfig, TaskLoopLogger } from "./types";

export interface WorkflowSetupOptions {
	workItem: WorkItem;
	config: TaskLoopConfig;
	workspace: string;
	logger?: TaskLoopLogger;
	signal?: AbortSignal;
}

export interface WorkflowSetupResult {
	success: boolean;
	branchName?: string;
	worktreePath?: string;
	error?: string;
}

export async function executeGitSetup(
	_options: WorkflowSetupOptions,
): Promise<WorkflowSetupResult> {
	return {
		success: false,
		error:
			"Workflow setup deprecated. Use @openfarm/workflow-executor instead.",
	};
}

export async function cleanupGitSetup(
	_workspace: string,
	_branchName: string,
	_worktreePath: string,
	_logger?: TaskLoopLogger,
): Promise<void> {
	// Deprecated
}

export async function getAvailableWorkflows(): Promise<
	Array<{ id: string; name: string; description?: string }>
> {
	return [];
}
