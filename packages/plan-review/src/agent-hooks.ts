// Types from agent-system (inline to avoid circular dependencies)
export interface AgentExecuteOptions {
	cwd?: string;
	timeout?: number;
	env?: Record<string, string>;
	flags?: string[];
	model?: string;
	contextFiles?: string[];
	onStdout?: (data: string) => void;
	onStderr?: (data: string) => void;
	onStart?: (executionId: string) => void;
	onEnd?: (result: AgentExecutionResult) => void;
	onChanges?: (changes: any) => void;
	onLog?: (message: string) => void;
	subagentTracing?: boolean;
}

export interface AgentExecutionResult {
	executionId: string;
	status: "completed" | "failed" | "interrupted" | "timeout";
	exitCode?: number;
	stdout: string;
	stderr: string;
	durationMs: number;
	error?: string;
	changes?: any;
	cost?: { inputTokens?: number; outputTokens?: number; totalUSD?: number };
}

import type { PlanManager } from "./plan-manager";
import { PlanParser } from "./plan-parser";
import type { Plan, PlanStatus } from "./types";

export interface PlanReviewHookOptions {
	planManager: PlanManager;
	autoExtract?: boolean;
	onPlanCreated?: (plan: Plan) => void;
	onPlanUpdated?: (plan: Plan) => void;
	onPlanReviewed?: (planId: string, status: PlanStatus) => void;
}

export class AgentPlanReviewHook {
	private planManager: PlanManager;
	private options: Required<Omit<PlanReviewHookOptions, "planManager">>;
	private activePlans: Map<string, Plan> = new Map();

	constructor(options: PlanReviewHookOptions) {
		this.planManager = options.planManager;
		this.options = {
			autoExtract: true,
			onPlanCreated: () => {},
			onPlanUpdated: () => {},
			onPlanReviewed: () => {},
			...options,
		};
	}

	createExecuteHook(
		agentId?: string,
	): (prompt: string, options?: AgentExecuteOptions) => AgentExecuteOptions {
		return (prompt: string, options?: AgentExecuteOptions) => {
			const hookOptions = this.enhanceOptions(prompt, options, agentId);

			// Set up hooks for plan extraction and review
			const enhancedOptions = {
				...hookOptions,
				onStdout: this.createStdoutHook(options?.onStdout),
				onEnd: this.createEndHook(options?.onEnd, agentId),
			};

			return enhancedOptions;
		};
	}

	private enhanceOptions(
		prompt: string,
		options?: AgentExecuteOptions,
		agentId?: string,
	): AgentExecuteOptions {
		const enhanced = { ...options };

		// Check if this prompt might contain a plan
		if (this.options.autoExtract && this.isPlanPrompt(prompt)) {
			enhanced.onLog = (message: string) => {
				options?.onLog?.(message);
				console.log(
					"[PlanReviewHook] Plan detected in prompt, monitoring output...",
				);
			};
		}

		return enhanced;
	}

	private createStdoutHook(
		originalHook?: (data: string) => void,
	): (data: string) => void {
		let buffer = "";

		return (data: string) => {
			originalHook?.(data);

			if (this.options.autoExtract) {
				buffer += data;

				// Try to extract plan from accumulated output
				const plan = PlanParser.extractPlanFromAgentOutput(buffer);
				if (plan && !this.activePlans.has(plan.id)) {
					this.activePlans.set(plan.id, plan);
					this.options.onPlanCreated(plan);
				}
			}
		};
	}

	private createEndHook(
		originalHook?: (result: AgentExecutionResult) => void,
		agentId?: string,
	): (result: AgentExecutionResult) => void {
		return (result: AgentExecutionResult) => {
			originalHook?.(result);

			if (this.options.autoExtract && result.stdout) {
				// Final attempt to extract plan from complete output
				const plan = PlanParser.extractPlanFromAgentOutput(result.stdout);
				if (plan) {
					// Update plan with execution metadata
					plan.metadata = {
						...plan.metadata,
						executionId: result.executionId,
						exitCode: result.exitCode,
						duration: result.durationMs,
						agentId,
						completedAt: new Date().toISOString(),
					};

					this.planManager.updatePlan(plan.id, plan);
					this.options.onPlanUpdated(plan);
				}
			}

			// Clear active plans for this execution
			this.cleanupExecution(result.executionId);
		};
	}

	private isPlanPrompt(prompt: string): boolean {
		const planKeywords = [
			"plan",
			"implementation plan",
			"steps",
			"approach",
			"strategy",
			"roadmap",
			"outline",
			"breakdown",
			"implementation steps",
			"development plan",
		];

		const lowerPrompt = prompt.toLowerCase();
		return planKeywords.some((keyword) => lowerPrompt.includes(keyword));
	}

	private cleanupExecution(executionId: string): void {
		// Remove plans that were created during this execution
		for (const [planId, plan] of this.activePlans) {
			if (plan.metadata?.executionId === executionId) {
				this.activePlans.delete(planId);
			}
		}
	}

	// Method to manually trigger plan review for a given execution
	async triggerPlanReview(
		executionId: string,
		reviewer: string,
		autoApprove: boolean = false,
	): Promise<Plan | null> {
		// Find plan associated with this execution
		const plans = this.planManager.getAllPlans();
		const plan = plans.find((p) => p.metadata?.executionId === executionId);

		if (!plan) {
			return null;
		}

		// Create review
		const _review = this.planManager.createReview(plan.id, reviewer);

		if (autoApprove) {
			this.planManager.approvePlan(plan.id, reviewer);
			this.options.onPlanReviewed(plan.id, "approved");
		} else {
			this.options.onPlanReviewed(plan.id, "in-review");
		}

		return plan;
	}

	// Method to get plans that need review
	getPendingPlans(): Plan[] {
		return this.planManager.getPlansByStatus("pending");
	}

	// Method to get plans currently in review
	getPlansInReview(): Plan[] {
		return this.planManager.getPlansByStatus("in-review");
	}

	// Method to approve a plan
	approvePlan(planId: string, reviewer: string): Plan | null {
		const plan = this.planManager.approvePlan(planId, reviewer);
		if (plan) {
			this.options.onPlanReviewed(planId, "approved");
		}
		return plan;
	}

	// Method to reject a plan with feedback
	rejectPlan(planId: string, reviewer: string, feedback: string): Plan | null {
		const plan = this.planManager.rejectPlan(planId, reviewer, feedback);
		if (plan) {
			this.options.onPlanReviewed(planId, "rejected");
		}
		return plan;
	}

	// Get plan statistics
	getStatistics() {
		return this.planManager.getPlanStatistics();
	}

	// Search plans
	searchPlans(query: string): Plan[] {
		return this.planManager.searchPlans(query);
	}

	// Export plan for external review
	exportPlan(planId: string): string | null {
		return this.planManager.exportPlan(planId);
	}

	// Import reviewed plan
	importPlan(data: string): Plan | null {
		const plan = this.planManager.importPlan(data);
		if (plan) {
			this.options.onPlanUpdated(plan);
		}
		return plan;
	}

	dispose(): void {
		this.activePlans.clear();
		this.planManager.close();
	}
}

// Factory function to create agent hooks
export function createPlanReviewHook(
	options: PlanReviewHookOptions,
): AgentPlanReviewHook {
	return new AgentPlanReviewHook(options);
}

// Integration helper for agent plugins
export function integratePlanReviewHook(
	agentPlugin: any,
	planManager: PlanManager,
	options?: Partial<PlanReviewHookOptions>,
): any {
	const hook = createPlanReviewHook({ planManager, ...options });

	// Wrap the execute method
	const originalExecute = agentPlugin.execute.bind(agentPlugin);

	agentPlugin.execute = (prompt: string, options?: AgentExecuteOptions) => {
		const enhancedOptions = hook.createExecuteHook(agentPlugin.meta.id)(
			prompt,
			options,
		);
		return originalExecute(prompt, enhancedOptions);
	};

	// Add plan review methods to the plugin
	agentPlugin.getPendingPlans = () => hook.getPendingPlans();
	agentPlugin.getPlansInReview = () => hook.getPlansInReview();
	agentPlugin.approvePlan = (planId: string, reviewer: string) =>
		hook.approvePlan(planId, reviewer);
	agentPlugin.rejectPlan = (
		planId: string,
		reviewer: string,
		feedback: string,
	) => hook.rejectPlan(planId, reviewer, feedback);
	agentPlugin.exportPlan = (planId: string) => hook.exportPlan(planId);
	agentPlugin.importPlan = (data: string) => hook.importPlan(data);

	// Store hook reference for cleanup
	(agentPlugin as any)._planReviewHook = hook;

	return agentPlugin;
}
