/**
 * Azure DevOps query and caching utilities.
 * Extracted from azure-adapter to reduce complexity.
 */

import { logger } from "@openfarm/logger";
import { err, ok, type Result } from "@openfarm/result";
import { workItemCache } from "../cache";
import type {
	AzureConfig,
	AzureWiqlResponse,
	FetchFunction,
	WorkItem,
} from "../types";
import { TRAILING_SLASH_REGEX } from "../types";

/**
 * Helper function to build WIQL query for work items
 */
export function buildWiqlQuery(workItemTypes?: string[]): string {
	const typeFilter =
		workItemTypes && workItemTypes.length > 0
			? `AND [System.WorkItemType] IN (${workItemTypes.map((type) => `'${type}'`).join(", ")})`
			: "";

	return `SELECT [System.Id], [System.Title] FROM WorkItems WHERE [System.State] <> 'Closed' AND [System.State] <> 'Removed' ${typeFilter} ORDER BY [System.ChangedDate] DESC`;
}

/**
 * Helper to check cache for work items
 */
export function checkCacheForWorkItems(
	config: AzureConfig,
	workItemTypes: string[] | undefined,
	shouldUseCache: boolean,
): WorkItem[] | null {
	if (!shouldUseCache) {
		return null;
	}
	const cacheKey = {
		orgUrl: config.orgUrl,
		project: config.project,
		workItemTypes,
	};
	const cached = workItemCache.get(cacheKey);
	if (cached) {
		logger().info(
			{
				orgUrl: config.orgUrl,
				project: config.project,
				types: workItemTypes,
				count: cached.length,
			},
			"Workitems query retrieved from cache",
		);
	}
	return cached || null;
}

/**
 * Helper to execute WIQL query
 */
export async function executeWiqlQuery(
	config: AzureConfig,
	workItemTypes: string[] | undefined,
	fetchFn: FetchFunction,
): Promise<Result<AzureWiqlResponse>> {
	const authHeader = `Basic ${Buffer.from(`:${config.pat}`).toString("base64")}`;
	const normalizedOrgUrl = config.orgUrl.replace(TRAILING_SLASH_REGEX, "");
	const wiqlUrl = `${normalizedOrgUrl}/${config.project}/_apis/wit/wiql?api-version=6.0`;
	const wiqlQuery = buildWiqlQuery(workItemTypes);

	const wiqlResponse = await fetchFn(wiqlUrl, {
		method: "POST",
		headers: {
			Authorization: authHeader,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({ query: wiqlQuery }),
	});

	if (!wiqlResponse.ok) {
		const errorBody = await wiqlResponse.text().catch(() => "Unknown error");
		return err(
			new Error(
				`Azure WIQL query failed: ${wiqlResponse.status} - ${errorBody}`,
			),
		);
	}

	try {
		const data = await wiqlResponse.json();
		return ok(data as AzureWiqlResponse);
	} catch (error) {
		return err(
			new Error(
				`Failed to parse WIQL response: ${error instanceof Error ? error.message : String(error)}`,
			),
		);
	}
}

/**
 * Helper to apply pagination to ID arrays
 */
export function applyPaginationToIds(
	ids: (string | number)[],
	pagination?: { offset?: number; limit?: number },
): (string | number)[] {
	if (!pagination) return ids;

	const offset = pagination.offset || 0;
	const limit = pagination.limit || 50;

	return ids.slice(offset, offset + limit);
}

/**
 * Helper to save results to cache if needed
 */
export function saveToCacheIfNeeded(
	config: AzureConfig,
	workItemTypes: string[] | undefined,
	workItems: WorkItem[],
	shouldUseCache: boolean,
): void {
	if (!shouldUseCache) return;

	const cacheKey = {
		orgUrl: config.orgUrl,
		project: config.project,
		workItemTypes,
	};

	workItemCache.set(cacheKey, workItems);
	logger().info(
		{
			orgUrl: config.orgUrl,
			project: config.project,
			types: workItemTypes,
			count: workItems.length,
		},
		"Workitems cached",
	);
}
