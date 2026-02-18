/**
 * Workflow Executor Simplificado
 *
 * ANTES: 6,813 líneas, 15+ archivos, factories, adapters, event sourcing
 * DESPUÉS: ~200 líneas, 1 archivo, funciones puras
 */

import { OpenFarm, spawnWithStreaming } from "@openfarm/sdk";
import type { Result } from "@openfarm/result";
import { err, ok } from "@openfarm/result";

// ============================================================================
// TIPOS MÍNIMOS
// ============================================================================

export interface Workflow {
	id: string;
	name: string;
	steps: WorkflowStep[];
}

export interface WorkflowStep {
	id: string;
	type: "agent" | "git" | "command" | "platform" | "human";
	action: string;
	config?: Record<string, unknown>;
	continueOnError?: boolean;
}

export interface WorkflowContext {
	repoPath: string;
	branchName: string;
	workItemId?: string;
	jobId?: string;
	[key: string]: unknown;
}

export interface StepResult {
	stepId: string;
	success: boolean;
	output?: string;
	error?: string;
	duration: number;
}

export interface WorkflowResult {
	success: boolean;
	results: StepResult[];
	duration: number;
	error?: string;
}

export type StepExecutor = (
	step: WorkflowStep,
	context: WorkflowContext,
	previousResults: StepResult[],
) => Promise<Result<StepResult>>;

// ============================================================================
// EJECUTOR CENTRAL (una sola función, no una clase)
// ============================================================================

export async function executeWorkflow(
	workflow: Workflow,
	context: WorkflowContext,
	executors: Record<string, StepExecutor>,
	onStepStart?: (step: WorkflowStep) => void,
	onStepComplete?: (step: WorkflowStep, result: StepResult) => void,
): Promise<WorkflowResult> {
	const start = Date.now();
	const results: StepResult[] = [];

	for (const step of workflow.steps) {
		onStepStart?.(step);
		const stepStart = Date.now();

		try {
			const executor = executors[step.type];
			if (!executor) {
				throw new Error(`No executor for step type: ${step.type}`);
			}

			const result = await executor(step, context, results);

			if (result.ok) {
				results.push(result.value);
				onStepComplete?.(step, result.value);

				if (!result.value.success && !step.continueOnError) {
					return {
						success: false,
						results,
						duration: Date.now() - start,
						error: `Step ${step.id} failed: ${result.value.error}`,
					};
				}
			} else {
				const errorResult: StepResult = {
					stepId: step.id,
					success: false,
					error: result.error.message,
					duration: Date.now() - stepStart,
				};
				results.push(errorResult);
				onStepComplete?.(step, errorResult);

				if (!step.continueOnError) {
					return {
						success: false,
						results,
						duration: Date.now() - start,
						error: `Step ${step.id} failed: ${result.error.message}`,
					};
				}
			}
		} catch (error) {
			const errorResult: StepResult = {
				stepId: step.id,
				success: false,
				error: error instanceof Error ? error.message : String(error),
				duration: Date.now() - stepStart,
			};
			results.push(errorResult);
			onStepComplete?.(step, errorResult);

			if (!step.continueOnError) {
				return {
					success: false,
					results,
					duration: Date.now() - start,
					error: `Step ${step.id} failed: ${errorResult.error}`,
				};
			}
		}
	}

	return {
		success: results.every((r) => r.success),
		results,
		duration: Date.now() - start,
	};
}

// ============================================================================
// EJECUTORES ESPECÍFICOS (una función por tipo, ~20 líneas cada una)
// ============================================================================

export const agentExecutor: StepExecutor = async (step, context, previousResults) => {
	const start = Date.now();
	const config = step.config || {};
	const provider = (config.provider as string) || "claude";
	const model = config.model as string | undefined;
	const task = config.instruction as string;

	if (!task) {
		return err(new Error("No instruction provided for agent step"));
	}

	try {
		const openFarm = new OpenFarm({ defaultProvider: provider });
		const result = await openFarm.execute({
			task,
			workspace: context.repoPath,
			model,
		});

		return ok({
			stepId: step.id,
			success: result.success,
			output: result.output,
			error: result.error,
			duration: result.duration ?? Date.now() - start,
		});
	} catch (error) {
		return err(error instanceof Error ? error : new Error(String(error)));
	}
};

export const gitExecutor: StepExecutor = async (step, context) => {
	const start = Date.now();

	const config = step.config || {};
	const action = step.action;

	let args: string[] = [];
	const command = "git";

	switch (action) {
		case "clone":
			args = ["clone", config.url as string, context.repoPath];
			break;
		case "checkout":
			args = ["checkout", config.branch as string];
			break;
		case "commit":
			args = ["commit", "-m", config.message as string];
			break;
		case "push":
			args = ["push", "origin", config.branch as string];
			break;
		case "pull":
			args = ["pull"];
			break;
		default:
			return err(new Error(`Unknown git action: ${action}`));
	}

	try {
		const result = await spawnWithStreaming(command, args, {
			cwd: context.repoPath,
			timeout: 300_000,
		});

		return ok({
			stepId: step.id,
			success: result.exitCode === 0,
			output: result.stdout,
			error: result.stderr || undefined,
			duration: Date.now() - start,
		});
	} catch (error) {
		return err(error instanceof Error ? error : new Error(String(error)));
	}
};

export const commandExecutor: StepExecutor = async (step, context) => {
	const start = Date.now();

	const config = step.config || {};
	const command = config.command as string;
	const args = (config.args as string[]) || [];

	if (!command) {
		return err(new Error("No command provided"));
	}

	try {
		const result = await spawnWithStreaming(command, args, {
			cwd: context.repoPath,
			timeout: (config.timeout as number) ?? 300_000,
			env: config.env as Record<string, string>,
		});

		return ok({
			stepId: step.id,
			success: result.exitCode === 0,
			output: result.stdout,
			error: result.stderr || undefined,
			duration: Date.now() - start,
		});
	} catch (error) {
		return err(error instanceof Error ? error : new Error(String(error)));
	}
};

export const platformExecutor: StepExecutor = async (step, context) => {
	const start = Date.now();
	const config = step.config || {};

	// Placeholder para acciones de plataforma (GitHub, Azure, etc.)
	// En el futuro esto se conecta a los adapters
	console.log(`[Platform] ${step.action}`, { context, config });

	return ok({
		stepId: step.id,
		success: true,
		output: `Platform action ${step.action} executed`,
		duration: Date.now() - start,
	});
};

export const humanExecutor: StepExecutor = async (step) => {
	const start = Date.now();

	// Placeholder para aprobaciones humanas
	// En el futuro esto se conecta al sistema de aprobaciones
	console.log(`[Human Approval Required] ${step.config?.prompt || "Approval needed"}`);

	return ok({
		stepId: step.id,
		success: true,
		output: "Human approval placeholder",
		duration: Date.now() - start,
	});
};

// ============================================================================
// FACTORY: Ejecutores por defecto
// ============================================================================

export function createDefaultExecutors(): Record<string, StepExecutor> {
	return {
		agent: agentExecutor,
		git: gitExecutor,
		command: commandExecutor,
		platform: platformExecutor,
		human: humanExecutor,
	};
}

// ============================================================================
// USO SIMPLE
// ============================================================================

export class WorkflowExecutor {
	private executors: Record<string, StepExecutor>;

	constructor(executors?: Record<string, StepExecutor>) {
		this.executors = executors ?? createDefaultExecutors();
	}

	async execute(
		workflow: Workflow,
		context: WorkflowContext,
		onStepStart?: (step: WorkflowStep) => void,
		onStepComplete?: (step: WorkflowStep, result: StepResult) => void,
	): Promise<WorkflowResult> {
		return executeWorkflow(workflow, context, this.executors, onStepStart, onStepComplete);
	}

	registerExecutor(type: string, executor: StepExecutor): void {
		this.executors[type] = executor;
	}
}
