import type { PlanManager } from "./plan-manager";
import type { Plan, PlanStatus } from "./types";

export interface WorkflowOptions {
	autoApprove?: boolean;
	requireAllResolved?: boolean;
	maxUnresolvedAnnotations?: number;
	reviewers?: string[];
}

export interface WorkflowResult {
	approved: boolean;
	status: PlanStatus | "error";
	message: string;
	feedback?: string;
}

export class PlanReviewWorkflow {
	private planManager: PlanManager;
	private options: Required<WorkflowOptions>;

	constructor(planManager: PlanManager, options: WorkflowOptions = {}) {
		this.planManager = planManager;
		this.options = {
			autoApprove: false,
			requireAllResolved: true,
			maxUnresolvedAnnotations: 0,
			reviewers: ["default-reviewer"],
			...options,
		};
	}

	async reviewPlan(planId: string, reviewer: string): Promise<WorkflowResult> {
		const plan = this.planManager.getPlan(planId);
		if (!plan) {
			return {
				approved: false,
				status: "error",
				message: "Plan not found",
			};
		}

		// Create or update review
		const _review = this.planManager.createReview(planId, reviewer);

		// Check if plan can be auto-approved
		if (this.options.autoApprove) {
			const autoApprovalResult = this.checkAutoApproval(planId);
			if (autoApprovalResult.approved) {
				await this.planManager.approvePlan(planId, reviewer);
				return autoApprovalResult;
			}
		}

		return {
			approved: false,
			status: "in-review",
			message: "Plan submitted for review",
		};
	}

	async approvePlan(planId: string, reviewer: string): Promise<WorkflowResult> {
		const plan = this.planManager.getPlan(planId);
		if (!plan) {
			return {
				approved: false,
				status: "error",
				message: "Plan not found",
			};
		}

		// Check approval criteria
		const criteriaCheck = this.checkApprovalCriteria(planId);
		if (!criteriaCheck.approved) {
			return criteriaCheck;
		}

		// Approve the plan
		const _approvedPlan = await this.planManager.approvePlan(planId, reviewer);

		return {
			approved: true,
			status: "approved",
			message: "Plan approved successfully",
		};
	}

	async rejectPlan(
		planId: string,
		reviewer: string,
		feedback: string,
	): Promise<WorkflowResult> {
		const plan = this.planManager.getPlan(planId);
		if (!plan) {
			return {
				approved: false,
				status: "error",
				message: "Plan not found",
			};
		}

		const _rejectedPlan = await this.planManager.rejectPlan(
			planId,
			reviewer,
			feedback,
		);

		return {
			approved: false,
			status: "rejected",
			message: "Plan rejected",
			feedback,
		};
	}

	checkAutoApproval(planId: string): WorkflowResult {
		const annotations = this.planManager
			.getAnnotationManager()
			.getAnnotationsForPlan(planId);
		const unresolvedAnnotations = annotations.filter((a) => !a.resolved);

		if (unresolvedAnnotations.length === 0) {
			return {
				approved: true,
				status: "approved",
				message: "Plan auto-approved (no unresolved annotations)",
			};
		}

		if (unresolvedAnnotations.length <= this.options.maxUnresolvedAnnotations) {
			return {
				approved: true,
				status: "approved",
				message: `Plan auto-approved (${unresolvedAnnotations.length} unresolved annotations within limit)`,
			};
		}

		return {
			approved: false,
			status: "in-review",
			message: `Plan requires review (${unresolvedAnnotations.length} unresolved annotations)`,
		};
	}

	checkApprovalCriteria(planId: string): WorkflowResult {
		const plan = this.planManager.getPlan(planId);
		if (!plan) {
			return {
				approved: false,
				status: "error",
				message: "Plan not found",
			};
		}

		const annotations = this.planManager
			.getAnnotationManager()
			.getAnnotationsForPlan(planId);
		const unresolvedAnnotations = annotations.filter((a) => !a.resolved);

		// Check if all annotations must be resolved
		if (this.options.requireAllResolved && unresolvedAnnotations.length > 0) {
			return {
				approved: false,
				status: "in-review",
				message: `Cannot approve: ${unresolvedAnnotations.length} unresolved annotations`,
				feedback: "Resolve all annotations before approval",
			};
		}

		// Check unresolved annotation limit
		if (unresolvedAnnotations.length > this.options.maxUnresolvedAnnotations) {
			return {
				approved: false,
				status: "in-review",
				message: `Cannot approve: ${unresolvedAnnotations.length} unresolved annotations exceeds limit of ${this.options.maxUnresolvedAnnotations}`,
				feedback: `Reduce unresolved annotations to ${this.options.maxUnresolvedAnnotations} or fewer`,
			};
		}

		// Check plan completeness
		if (plan.steps.length === 0) {
			return {
				approved: false,
				status: "in-review",
				message: "Plan has no steps",
				feedback: "Add implementation steps to the plan",
			};
		}

		// Check for missing descriptions
		const stepsWithoutDescriptions = plan.steps.filter(
			(step) => !step.description.trim(),
		);
		if (stepsWithoutDescriptions.length > 0) {
			return {
				approved: false,
				status: "in-review",
				message: `${stepsWithoutDescriptions.length} steps missing descriptions`,
				feedback: "Add descriptions to all steps",
			};
		}

		return {
			approved: true,
			status: "approved",
			message: "Plan meets all approval criteria",
		};
	}

	async requestChanges(
		planId: string,
		reviewer: string,
		changes: string[],
	): Promise<WorkflowResult> {
		const plan = this.planManager.getPlan(planId);
		if (!plan) {
			return {
				approved: false,
				status: "error",
				message: "Plan not found",
			};
		}

		// Create annotations for each requested change
		const annotationManager = this.planManager.getAnnotationManager();

		changes.forEach((change, index) => {
			annotationManager.createAnnotation({
				type: "comment",
				planId,
				content: `Requested change ${index + 1}: ${change}`,
				author: reviewer,
			});
		});

		// Update plan status to indicate changes requested
		await this.planManager.updatePlanStatus(planId, "in-review");

		return {
			approved: false,
			status: "in-review",
			message: `Requested ${changes.length} changes`,
			feedback: changes.join("\n"),
		};
	}

	getWorkflowSummary(planId: string): {
		plan: Plan | null;
		reviewStatus: string;
		annotationSummary: {
			total: number;
			resolved: number;
			unresolved: number;
			byType: Record<string, number>;
		};
		approvalCriteria: {
			canAutoApprove: boolean;
			meetsCriteria: boolean;
			blockingIssues: string[];
		};
	} {
		const plan = this.planManager.getPlan(planId);
		const review = this.planManager.getReview(planId);
		const annotations = this.planManager
			.getAnnotationManager()
			.getAnnotationsForPlan(planId);

		const annotationSummary = {
			total: annotations.length,
			resolved: annotations.filter((a) => a.resolved).length,
			unresolved: annotations.filter((a) => !a.resolved).length,
			byType: annotations.reduce(
				(acc, a) => {
					acc[a.type] = (acc[a.type] || 0) + 1;
					return acc;
				},
				{} as Record<string, number>,
			),
		};

		const approvalCriteria = this.checkApprovalCriteria(planId);
		const autoApproval = this.checkAutoApproval(planId);

		return {
			plan,
			reviewStatus: review?.status || "none",
			annotationSummary,
			approvalCriteria: {
				canAutoApprove: autoApproval.approved,
				meetsCriteria: approvalCriteria.approved,
				blockingIssues: approvalCriteria.approved
					? []
					: [approvalCriteria.message],
			},
		};
	}

	async processAgentFeedback(
		planId: string,
		agentId: string,
		feedback: string,
	): Promise<WorkflowResult> {
		const plan = this.planManager.getPlan(planId);
		if (!plan) {
			return {
				approved: false,
				status: "error",
				message: "Plan not found",
			};
		}

		// Parse agent feedback for annotations or plan updates
		const annotationManager = this.planManager.getAnnotationManager();

		// Try to extract annotations from feedback
		const annotations = this.extractAnnotationsFromFeedback(
			feedback,
			planId,
			agentId,
		);

		for (const annotation of annotations) {
			annotationManager.createAnnotation(annotation);
		}

		// Check if feedback indicates plan should be updated
		if (feedback.includes("update plan") || feedback.includes("modify plan")) {
			// Extract updated plan content if present
			const updatedPlan = this.extractPlanFromFeedback(feedback);
			if (updatedPlan) {
				await this.planManager.updatePlan(planId, updatedPlan);
			}
		}

		return {
			approved: false,
			status: "in-review",
			message: `Processed agent feedback: ${annotations.length} annotations created`,
		};
	}

	private extractAnnotationsFromFeedback(
		feedback: string,
		planId: string,
		author: string,
	): any[] {
		const annotations: any[] = [];

		// Simple pattern matching for common annotation patterns
		const patterns = [
			/delete[:\s]+(.+)/gi,
			/insert[:\s]+(.+)/gi,
			/replace[:\s]+(.+)/gi,
			/comment[:\s]+(.+)/gi,
		];

		patterns.forEach((pattern) => {
			let match;
			const regex = new RegExp(pattern);
			while (true) {
				match = regex.exec(feedback);
				if (match === null) break;

				const type = pattern.source.split("[")[1].split("]")[0];
				annotations.push({
					type,
					planId,
					content: match[1].trim(),
					author,
				});
			}
		});

		return annotations;
	}

	private extractPlanFromFeedback(feedback: string): Partial<Plan> | null {
		// Try to extract updated plan content from feedback
		// This is a simplified implementation - in practice, you'd use more sophisticated parsing
		const planMatch = feedback.match(/updated plan[:\s]*([\s\S]*?)(?=\n\n|$)/i);
		if (planMatch) {
			try {
				// This would need proper plan parsing logic
				return {
					description: planMatch[1].trim(),
					updatedAt: new Date(),
				};
			} catch {
				return null;
			}
		}

		return null;
	}
}
