import {
	createPr,
	fetchNewWorkItems,
	postComment,
	updateWorkItem,
} from "@openfarm/azure-adapter";
import type { WorkItem } from "@openfarm/core/types/domain";
import type { AzureDevOpsConfig } from "@/lib/store";

export class AzureDevOpsService {
	private config: AzureDevOpsConfig | null = null;

	constructor(config?: AzureDevOpsConfig) {
		this.config = config || null;
	}

	updateConfig(config: AzureDevOpsConfig) {
		this.config = config;
	}

	private validateConfig(): boolean {
		if (!this.config) return false;
		return !!(
			this.config.connected &&
			this.config.orgUrl &&
			this.config.pat &&
			this.config.project &&
			this.config.repoId
		);
	}

	async getWorkItems(workItemTypes?: string[]): Promise<WorkItem[]> {
		if (!this.validateConfig()) {
			throw new Error("Azure DevOps not properly configured");
		}

		try {
			const result = await fetchNewWorkItems(
				{
					orgUrl: this.config!.orgUrl,
					pat: this.config!.pat,
					project: this.config!.project,
					repoId: this.config!.repoId,
				},
				workItemTypes,
			);

			if (!result.ok) {
				throw new Error(result.error?.message || "Failed to fetch work items");
			}

			return result.value;
		} catch (error) {
			console.error("Error fetching work items:", error);
			throw error;
		}
	}

	async updateWorkItemStatus(
		workItemId: string,
		status: string,
	): Promise<void> {
		if (!this.validateConfig()) {
			throw new Error("Azure DevOps not properly configured");
		}

		try {
			const result = await updateWorkItem(
				{
					orgUrl: this.config!.orgUrl,
					pat: this.config!.pat,
					project: this.config!.project,
					repoId: this.config!.repoId,
				},
				workItemId,
				{ state: status },
			);

			if (!result.ok) {
				throw new Error(result.error?.message || "Failed to update work item");
			}
		} catch (error) {
			console.error("Error updating work item:", error);
			throw error;
		}
	}

	async assignWorkItem(workItemId: string, assignee: string): Promise<void> {
		if (!this.validateConfig()) {
			throw new Error("Azure DevOps not properly configured");
		}

		try {
			const result = await updateWorkItem(
				{
					orgUrl: this.config!.orgUrl,
					pat: this.config!.pat,
					project: this.config!.project,
					repoId: this.config!.repoId,
				},
				workItemId,
				{ assignedTo: assignee },
			);

			if (!result.ok) {
				throw new Error(result.error?.message || "Failed to assign work item");
			}
		} catch (error) {
			console.error("Error assigning work item:", error);
			throw error;
		}
	}

	async createPullRequest(
		title: string,
		description: string,
		sourceBranch: string,
		targetBranch?: string,
	): Promise<string> {
		if (!this.validateConfig()) {
			throw new Error("Azure DevOps not properly configured");
		}

		try {
			const result = await createPr(
				{
					orgUrl: this.config!.orgUrl,
					pat: this.config!.pat,
					project: this.config!.project,
					repoId: this.config!.repoId,
				},
				title,
				description,
				sourceBranch,
				targetBranch,
			);

			if (!result.ok) {
				throw new Error(
					result.error?.message || "Failed to create pull request",
				);
			}

			return result.value;
		} catch (error) {
			console.error("Error creating pull request:", error);
			throw error;
		}
	}

	async addComment(workItemId: string, comment: string): Promise<void> {
		if (!this.validateConfig()) {
			throw new Error("Azure DevOps not properly configured");
		}

		try {
			const result = await postComment(
				{
					orgUrl: this.config!.orgUrl,
					pat: this.config!.pat,
					project: this.config!.project,
					repoId: this.config!.repoId,
				},
				workItemId,
				comment,
			);

			if (!result.ok) {
				throw new Error(result.error?.message || "Failed to add comment");
			}
		} catch (error) {
			console.error("Error adding comment:", error);
			throw error;
		}
	}

	async testConnection(): Promise<boolean> {
		if (!this.validateConfig()) {
			return false;
		}

		try {
			const workItems = await this.getWorkItems(["Bug"]);
			return Array.isArray(workItems);
		} catch (error) {
			console.error("Connection test failed:", error);
			return false;
		}
	}
}

// Global instance
let azureDevOpsService: AzureDevOpsService | null = null;

export function getAzureDevOpsService(
	config?: AzureDevOpsConfig,
): AzureDevOpsService {
	if (!azureDevOpsService || config) {
		azureDevOpsService = new AzureDevOpsService(config);
	}
	return azureDevOpsService;
}
