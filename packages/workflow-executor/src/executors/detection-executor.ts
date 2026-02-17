/**
 * Detection Executor
 *
 * Executes detection-related actions for task-loop workflows:
 * - detection.check_completion: Check if task is complete
 * - detection.analyze_output: Analyze agent output
 */

import { StepAction } from "@openfarm/core/constants/actions";
import { err, ok, type Result } from "@openfarm/result";
import type { StepExecutionRequest } from "../types";

/**
 * Default completion markers
 */
const DEFAULT_COMPLETION_MARKERS = [
	"task completed",
	"done",
	"finished",
	"completed successfully",
	"changes applied",
	"implemented",
	"✓",
	"✅",
	"success",
	"all requirements met",
];

/**
 * Default failure markers
 */
const DEFAULT_FAILURE_MARKERS = [
	"failed",
	"error",
	"unable to",
	"cannot",
	"unable to complete",
	"task failed",
	"❌",
	"✗",
	"not possible",
	"insufficient information",
];

/**
 * Fatal error patterns (should not retry)
 */
const FATAL_ERROR_PATTERNS = [
	"permission denied",
	"not found",
	"does not exist",
	"invalid",
	"unauthorized",
	"authentication failed",
	"repository not found",
];

/**
 * Completion detection result
 */
interface CompletionResult {
	completed: boolean;
	confidence: number;
	reason: string;
	shouldRetry: boolean;
}

/**
 * Check if error is fatal (should not retry)
 */
function isFatalError(error: string): boolean {
	const lowerError = error.toLowerCase();
	return FATAL_ERROR_PATTERNS.some((pattern) => lowerError.includes(pattern));
}

/**
 * Executes detection.check_completion action - checks if task is complete
 */
async function executeDetectionCheckCompletion(
	request: StepExecutionRequest,
): Promise<Result<CompletionResult>> {
	const { step, context, logger } = request;
	const config = step.config || {};

	const output = (config.output as string) || "";
	const error = (config.error as string) || "";
	const success = (config.success as boolean) ?? true;
	const strategy = (config.strategy as string) || "heuristic";

	const completionMarkers =
		(config.completionMarkers as string[]) || DEFAULT_COMPLETION_MARKERS;
	const failureMarkers =
		(config.failureMarkers as string[]) || DEFAULT_FAILURE_MARKERS;

	await logger(`Checking completion using strategy: ${strategy}`);

	const outputLower = output.toLowerCase();
	const errorLower = error.toLowerCase();

	// Check for failure markers first
	for (const marker of failureMarkers) {
		if (
			outputLower.includes(marker.toLowerCase()) ||
			errorLower.includes(marker.toLowerCase())
		) {
			const result: CompletionResult = {
				completed: false,
				confidence: 0.8,
				reason: `Failure marker detected: "${marker}"`,
				shouldRetry: !isFatalError(output + error),
			};
			await logger(`Task failed: ${result.reason}`);
			return ok(result);
		}
	}

	// Check for success markers
	for (const marker of completionMarkers) {
		if (outputLower.includes(marker.toLowerCase())) {
			const result: CompletionResult = {
				completed: true,
				confidence: 0.7,
				reason: `Completion marker detected: "${marker}"`,
				shouldRetry: false,
			};
			await logger(`Task completed: ${result.reason}`);
			return ok(result);
		}
	}

	// If no explicit markers, check for success result
	if (success) {
		// Check if there are file changes
		const changes = context.workflowVariables?.changes as
			| {
					filesModified?: string[];
					filesCreated?: string[];
					filesDeleted?: string[];
			  }
			| undefined;

		const hasChanges =
			(changes?.filesModified?.length || 0) > 0 ||
			(changes?.filesCreated?.length || 0) > 0 ||
			(changes?.filesDeleted?.length || 0) > 0;

		if (hasChanges) {
			const result: CompletionResult = {
				completed: true,
				confidence: 0.6,
				reason: "Task succeeded with file changes",
				shouldRetry: false,
			};
			await logger(`Task completed: ${result.reason}`);
			return ok(result);
		}

		// Success but no changes
		const result: CompletionResult = {
			completed: true,
			confidence: 0.4,
			reason: "Task succeeded but no file changes detected",
			shouldRetry: false,
		};
		await logger(`Task completed: ${result.reason}`);
		return ok(result);
	}

	// Failed with no clear markers
	const result: CompletionResult = {
		completed: false,
		confidence: 0.5,
		reason: error || "Task failed without specific error",
		shouldRetry: true,
	};
	await logger(`Task failed: ${result.reason}`);
	return ok(result);
}

/**
 * Executes detection.analyze_output action - analyzes agent output
 */
async function executeDetectionAnalyzeOutput(
	request: StepExecutionRequest,
): Promise<Result<{ summary: string; hasErrors: boolean }>> {
	const { step, logger } = request;
	const config = step.config || {};

	const output = (config.output as string) || "";

	await logger("Analyzing output...");

	// Simple analysis: check for error keywords
	const hasErrors =
		output.toLowerCase().includes("error") ||
		output.toLowerCase().includes("failed") ||
		output.toLowerCase().includes("❌");

	// Generate summary (first 200 chars)
	const summary = output.length > 200 ? `${output.slice(0, 200)}...` : output;

	await logger(
		`Analysis complete: ${hasErrors ? "errors found" : "no errors"}`,
	);

	return ok({ summary, hasErrors });
}

/**
 * Routes detection actions to the appropriate executor
 */
export async function executeDetectionAction(
	request: StepExecutionRequest,
): Promise<Result<unknown>> {
	const { step } = request;
	const action = step.action;

	if (action === StepAction.DETECTION_CHECK_COMPLETION) {
		return executeDetectionCheckCompletion(request);
	}
	if (action === StepAction.DETECTION_ANALYZE_OUTPUT) {
		return executeDetectionAnalyzeOutput(request);
	}

	return err(new Error(`Unknown detection action: ${action}`));
}
