/**
 * Azure DevOps types and interfaces.
 * Centralized types to avoid circular dependencies.
 */

import type { WorkItem } from "@openfarm/core/types/domain";
export type { WorkItem };

// Regex patterns at top level for performance
export const TRAILING_SLASH_REGEX = /\/$/;

// Types for Azure API responses
export interface AzureWorkItemFields {
	"System.Tags"?: string;
	"System.AssignedTo"?:
		| string
		| {
				displayName?: string;
				uniqueName?: string;
				imageUrl?: string;
				id?: string;
		  };
	"System.Id"?: number | string;
	"System.Title"?: string;
	"System.Description"?: string;
	"Microsoft.VSTS.Common.AcceptanceCriteria"?: string;
	"Microsoft.VSTS.Common.Priority"?: number; // Priority field from Azure (1-4 typically)
	"System.WorkItemType"?: string;
	"System.TeamProject"?: string;
	"System.State"?: string;
}

export interface AzureWorkItemApiResponse {
	id: number | string;
	fields?: AzureWorkItemFields;
}

export interface AzureWiqlWorkItem {
	id: number | string;
}

export interface AzureWiqlResponse {
	workItems: AzureWiqlWorkItem[];
}

export interface AzureRepositoryApiResponse {
	id: string;
	name: string;
	remoteUrl?: string;
	url?: string;
}

export interface AzureProjectApiResponse {
	id: string;
	name: string;
}

export interface AzurePullRequest {
	sourceRefName: string;
	targetRefName: string;
	status: string;
	url?: string;
}

export interface AzureConfig {
	orgUrl: string;
	project: string;
	pat: string;
	repoId?: string; // Needed for PR
}

export interface AzureRepository {
	id: string;
	name: string;
	url: string;
	project: string;
}

export interface AzureProject {
	id: string;
	name: string;
	description?: string;
}

export type FetchFunction = (
	input: string | Request,
	init?: RequestInit,
) => Promise<Response>;
