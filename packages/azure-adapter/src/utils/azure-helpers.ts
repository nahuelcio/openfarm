/**
 * Azure DevOps API utilities and helpers.
 * Extracted from azure-adapter to reduce complexity and improve reusability.
 */

import type {
	AzureWorkItemApiResponse,
	AzureWorkItemFields,
	WorkItem,
} from "../types";

/**
 * Helper function to parse tags
 */
export function parseTags(tags?: string): string[] {
	if (!tags) return [];
	return tags
		.split(";")
		.map((tag) => tag.trim())
		.filter(Boolean);
}

/**
 * Helper function to get assigned to value (backward compatibility)
 */
export function getAssignedToValue(
	assignedTo?: AzureWorkItemFields["System.AssignedTo"],
): string {
	if (!assignedTo) return "";
	if (typeof assignedTo === "string") return assignedTo;
	return assignedTo.displayName || assignedTo.uniqueName || "";
}

/**
 * Helper function to extract full assignee structure
 */
export function extractAssignee(
	assignedTo?: AzureWorkItemFields["System.AssignedTo"],
) {
	if (!assignedTo) return undefined;
	if (typeof assignedTo === "string") {
		return {
			id: assignedTo,
			name: assignedTo,
			avatarUrl: undefined,
		};
	}
	return {
		id: assignedTo.id || assignedTo.uniqueName || "",
		name: assignedTo.displayName || assignedTo.uniqueName || "",
		avatarUrl: assignedTo.imageUrl,
	};
}

/**
 * Helper function to map Azure priority (1-4) to our priority levels
 */
export function mapAzurePriority(
	azurePriority?: number,
): "low" | "medium" | "high" | "critical" {
	if (!azurePriority) return "medium";
	if (azurePriority === 1) return "critical";
	if (azurePriority === 2) return "high";
	if (azurePriority === 3) return "medium";
	if (azurePriority === 4) return "low";
	return "medium";
}

/**
 * Helper function to convert Azure work item to WorkItem
 */
export function convertToWorkItem(
	data: AzureWorkItemApiResponse,
	config: { project: string },
): WorkItem {
	const fields = data.fields || {};
	const tags = parseTags(fields["System.Tags"]);
	const assignee = extractAssignee(fields["System.AssignedTo"]);
	const priority = mapAzurePriority(fields["Microsoft.VSTS.Common.Priority"]);

	return {
		id: data.id.toString(),
		title: fields["System.Title"] || "Untitled",
		description: fields["System.Description"] || "",
		acceptanceCriteria:
			fields["Microsoft.VSTS.Common.AcceptanceCriteria"] || "",
		workItemType: fields["System.WorkItemType"] || "Unknown",
		source: "azure-devops",
		status: "new",
		project: fields["System.TeamProject"] || config.project,
		tags,
		state: fields["System.State"] || "Unknown",
		assignee,
		priority,
	};
}
