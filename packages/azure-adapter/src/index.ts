import type { Bug, WorkItem } from "@openfarm/core/types/domain";
import { logger } from "@openfarm/logger";
import { err, ok, type Result } from "@openfarm/result";
import { chunk } from "@openfarm/utils";
import { workItemCache } from "./cache";

// Regex patterns at top level for performance
const TRAILING_SLASH_REGEX = /\/$/;

// Types for Azure API responses
interface AzureWorkItemFields {
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

interface AzureWorkItemApiResponse {
  id: number | string;
  fields?: AzureWorkItemFields;
}

interface AzureWiqlWorkItem {
  id: number | string;
}

interface AzureWiqlResponse {
  workItems: AzureWiqlWorkItem[];
}

interface AzureRepositoryApiResponse {
  id: string;
  name: string;
  remoteUrl?: string;
  url?: string;
}

interface AzureProjectApiResponse {
  id: string;
  name: string;
}

interface AzurePullRequest {
  sourceRefName: string;
  targetRefName: string;
  status: string;
  url?: string;
}

interface AzureConfig {
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

export { AzurePlatformAdapter } from "./adapter";

import { defaultFetch, type FetchFunction } from "@openfarm/utils";

/**
 * Helper function to find existing PR by source and target branches
 */
const findExistingPr = async (
  config: AzureConfig,
  sourceRefName: string,
  targetRefName: string,
  fetchFn: FetchFunction = defaultFetch
): Promise<Result<string | null>> => {
  try {
    if (!config.repoId) {
      return err(new Error("Repository ID is required to find PR"));
    }

    const authHeader = `Basic ${Buffer.from(`:${config.pat}`).toString("base64")}`;
    // Normalize orgUrl: remove trailing slash
    const normalizedOrgUrl = config.orgUrl.replace(TRAILING_SLASH_REGEX, "");
    const sourceRef = `refs/heads/${sourceRefName}`;
    const searchUrl = `${normalizedOrgUrl}/${config.project}/_apis/git/repositories/${config.repoId}/pullrequests?searchCriteria.sourceRefName=${encodeURIComponent(sourceRef)}&searchCriteria.targetRefName=${encodeURIComponent(targetRefName)}&searchCriteria.status=active&api-version=6.0`;

    const response = await fetchFn(searchUrl, {
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      // If search fails, return null (PR might not exist)
      return ok(null);
    }

    const data = (await response.json()) as { value?: AzurePullRequest[] };
    const prs = data.value || [];

    // Find PR that matches both source and target exactly
    const matchingPr = (prs as AzurePullRequest[]).find(
      (pr) =>
        pr.sourceRefName === sourceRef &&
        pr.targetRefName === targetRefName &&
        pr.status === "active"
    );

    if (matchingPr?.url) {
      return ok(matchingPr.url);
    }

    return ok(null);
  } catch (_error) {
    // If search fails, return null (PR might not exist)
    return ok(null);
  }
};

/**
 * Helper to handle PR creation conflict errors
 */
const handlePrCreationConflict = async (
  config: AzureConfig,
  sourceRefName: string,
  targetRefName: string,
  errorText: string,
  fetchFn: FetchFunction
): Promise<Result<string> | null> => {
  try {
    const errorJson = JSON.parse(errorText);
    const isConflictError =
      errorJson.typeKey === "GitPullRequestExistsException" ||
      errorJson.message?.includes("active pull request");

    if (!isConflictError) {
      return null;
    }

    // PR was created between our check and creation attempt, find it now
    logger.info(
      { sourceRefName, targetRefName },
      "PR creation failed because PR already exists, searching for existing PR"
    );
    const existingPrResult = await findExistingPr(
      config,
      sourceRefName,
      targetRefName,
      fetchFn
    );
    if (existingPrResult.ok && existingPrResult.value) {
      logger.info(
        { prUrl: existingPrResult.value },
        "Found existing PR after creation conflict"
      );
      return ok(existingPrResult.value);
    }
  } catch (_parseError) {
    // Error text is not JSON, continue with original error
  }
  return null;
};

/**
 * Helper to check for existing PR before creation
 */
const checkExistingPr = async (
  config: AzureConfig,
  sourceRefName: string,
  targetRefName: string,
  fetchFn: FetchFunction
): Promise<Result<string | null>> => {
  const existingPrResult = await findExistingPr(
    config,
    sourceRefName,
    targetRefName,
    fetchFn
  );
  if (!existingPrResult.ok) {
    // If search failed, continue with creation attempt
    logger.warn(
      { error: existingPrResult.error },
      "Failed to search for existing PR, continuing with creation"
    );
    return ok(null);
  }
  if (existingPrResult.value) {
    // PR already exists, return its URL
    logger.info(
      { sourceRefName, targetRefName, prUrl: existingPrResult.value },
      "PR already exists, returning existing PR URL"
    );
    return ok(existingPrResult.value);
  }
  return ok(null);
};

/**
 * Updates a work item in Azure DevOps
 */
export const updateWorkItem = async (
  config: AzureConfig,
  workItemId: string,
  updates: {
    state?: string;
    priority?: number;
    assignedTo?: string;
  },
  fetchFn: FetchFunction = defaultFetch
): Promise<Result<void>> => {
  try {
    const authHeader = `Basic ${Buffer.from(`:${config.pat}`).toString("base64")}`;
    const normalizedOrgUrl = config.orgUrl.replace(TRAILING_SLASH_REGEX, "");
    const updateUrl = `${normalizedOrgUrl}/${config.project}/_apis/wit/workitems/${workItemId}?api-version=6.0`;

    // Build update operations
    const operations: Array<{
      op: string;
      path: string;
      value: string | number;
    }> = [];

    if (updates.state) {
      operations.push({
        op: "replace",
        path: "/fields/System.State",
        value: updates.state,
      });
    }

    if (updates.priority !== undefined) {
      operations.push({
        op: "replace",
        path: "/fields/Microsoft.VSTS.Common.Priority",
        value: updates.priority,
      });
    }

    if (updates.assignedTo) {
      operations.push({
        op: "replace",
        path: "/fields/System.AssignedTo",
        value: updates.assignedTo,
      });
    }

    if (operations.length === 0) {
      return ok(undefined); // No updates to apply
    }

    const response = await fetchFn(updateUrl, {
      method: "PATCH",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json-patch+json",
      },
      body: JSON.stringify(operations),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(
        {
          status: response.status,
          statusText: response.statusText,
          error: errorText.substring(0, 500),
          workItemId,
          updates,
        },
        "Failed to update work item in Azure DevOps"
      );
      return err(
        new Error(
          `Failed to update work item (${response.status}): ${response.statusText} - ${errorText.substring(0, 200)}`
        )
      );
    }

    // Invalidate cache for this work item
    workItemCache.invalidate({
      orgUrl: config.orgUrl,
      project: config.project,
      workItemIds: [workItemId],
    });

    logger.info(
      { workItemId, updates },
      "Successfully updated work item in Azure DevOps"
    );
    return ok(undefined);
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
};

export const createPr = async (
  config: AzureConfig,
  title: string,
  description: string,
  sourceRefName: string,
  targetRefName = "refs/heads/dev",
  fetchFn: FetchFunction = defaultFetch
): Promise<Result<string>> => {
  try {
    if (!config.repoId) {
      return err(new Error("Repository ID is required to create PR"));
    }

    // First, check if a PR already exists
    const existingPrCheck = await checkExistingPr(
      config,
      sourceRefName,
      targetRefName,
      fetchFn
    );
    if (!existingPrCheck.ok) {
      return existingPrCheck;
    }
    if (existingPrCheck.value) {
      return ok(existingPrCheck.value);
    }

    // No existing PR found, try to create one
    const authHeader = `Basic ${Buffer.from(`:${config.pat}`).toString("base64")}`;
    const url = `${config.orgUrl}/${config.project}/_apis/git/repositories/${config.repoId}/pullrequests?api-version=6.0`;

    const body = {
      sourceRefName: `refs/heads/${sourceRefName}`,
      targetRefName,
      title,
      description,
    };

    const response = await fetchFn(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();

      // Check if error is GitPullRequestExistsException
      const conflictResult = await handlePrCreationConflict(
        config,
        sourceRefName,
        targetRefName,
        errorText,
        fetchFn
      );
      if (conflictResult) {
        return conflictResult;
      }

      return err(
        new Error(`Failed to create PR: ${response.statusText} - ${errorText}`)
      );
    }

    const data = (await response.json()) as { url?: string };
    return ok(data.url || "");
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
};

export const processWorkItemBatch = async (
  config: AzureConfig,
  batchIds: string[],
  fetchFn: FetchFunction = defaultFetch,
  useCache = true
): Promise<Result<WorkItem[]>> => {
  try {
    // Check cache first
    if (useCache) {
      const cacheKey = {
        orgUrl: config.orgUrl,
        project: config.project,
        workItemIds: batchIds,
      };
      const cached = workItemCache.get(cacheKey);
      if (cached) {
        logger.info(
          {
            orgUrl: config.orgUrl,
            project: config.project,
            count: cached.length,
          },
          "Workitems retrieved from cache"
        );
        return ok(cached);
      }
    }

    const authHeader = `Basic ${Buffer.from(`:${config.pat}`).toString("base64")}`;
    const normalizedOrgUrl = config.orgUrl.replace(TRAILING_SLASH_REGEX, "");
    const idsParam = batchIds.join(",");
    const detailsUrl = `${normalizedOrgUrl}/${config.project}/_apis/wit/workitems?ids=${idsParam}&api-version=6.0`;

    const detailsResponse = await fetchFn(detailsUrl, {
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
    });

    if (!detailsResponse.ok) {
      const errorText = await detailsResponse.text();
      logger.error(
        {
          status: detailsResponse.status,
          statusText: detailsResponse.statusText,
          error: errorText.substring(0, 500),
          url: detailsUrl,
        },
        "Failed to fetch work item details"
      );
      return err(
        new Error(
          `Failed to fetch details (${detailsResponse.status}): ${detailsResponse.statusText} - ${errorText.substring(0, 200)}`
        )
      );
    }

    const detailsData = (await detailsResponse.json()) as {
      value?: unknown[];
    };

    // Handle both array and object responses
    const items = detailsData.value || detailsData;
    const batchItems = Array.isArray(items) ? items : [items];

    // Helper function to parse tags
    const parseTags = (tagsString: string | undefined): string[] => {
      if (!tagsString) {
        return [];
      }
      return tagsString
        .split(";")
        .map((t) => t.trim())
        .filter((t) => t.length > 0);
    };

    // Helper function to get assigned to value (backward compatibility)
    const getAssignedTo = (
      assignedToField:
        | string
        | {
            displayName?: string;
            uniqueName?: string;
            imageUrl?: string;
            id?: string;
          }
        | undefined
    ): string | undefined => {
      if (!assignedToField) {
        return undefined;
      }
      if (typeof assignedToField === "string") {
        return assignedToField;
      }
      return assignedToField.displayName || assignedToField.uniqueName || "";
    };

    // Helper function to extract full assignee structure
    const getAssignee = (
      assignedToField:
        | string
        | {
            displayName?: string;
            uniqueName?: string;
            imageUrl?: string;
            id?: string;
          }
        | undefined
    ): WorkItem["assignee"] | undefined => {
      if (!assignedToField) {
        return undefined;
      }
      if (typeof assignedToField === "string") {
        // If it's just a string, use it as name and generate a simple id
        return {
          id: assignedToField.toLowerCase().replace(/\s+/g, "-"),
          name: assignedToField,
        };
      }
      // Extract from Azure object structure
      const name =
        assignedToField.displayName || assignedToField.uniqueName || "";
      if (!name) {
        return undefined;
      }
      return {
        id:
          assignedToField.id ||
          assignedToField.uniqueName ||
          name.toLowerCase().replace(/\s+/g, "-"),
        name,
        avatarUrl: assignedToField.imageUrl,
      };
    };

    // Helper function to map Azure priority (1-4) to our priority levels
    const mapPriority = (azurePriority?: number): WorkItem["priority"] => {
      if (!azurePriority) {
        return "medium";
      }
      // Azure typically uses: 1=Critical, 2=High, 3=Medium, 4=Low
      if (azurePriority <= 1) {
        return "critical";
      }
      if (azurePriority === 2) {
        return "high";
      }
      if (azurePriority === 3) {
        return "medium";
      }
      return "low";
    };

    // Helper function to convert Azure work item to WorkItem
    const convertToWorkItem = (item: AzureWorkItemApiResponse): WorkItem => {
      const fields = item.fields || {};
      const tags = parseTags(fields["System.Tags"]);
      const assignedTo = getAssignedTo(fields["System.AssignedTo"]); // Keep for backward compatibility
      const assignee = getAssignee(fields["System.AssignedTo"]);
      const priority = mapPriority(fields["Microsoft.VSTS.Common.Priority"]);

      return {
        id: item.id?.toString() || fields["System.Id"]?.toString() || "unknown",
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
        assignedTo, // Keep for backward compatibility
        assignee,
        priority,
      };
    };

    const workItems: WorkItem[] = (
      batchItems as AzureWorkItemApiResponse[]
    ).map(convertToWorkItem);

    // Store in cache
    if (useCache) {
      workItemCache.set(
        {
          orgUrl: config.orgUrl,
          project: config.project,
          workItemIds: batchIds,
        },
        workItems
      );
    }

    return ok(workItems);
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
};

const buildWiqlQuery = (workItemTypes?: string[]): string => {
  let typeFilter = "";
  if (workItemTypes && workItemTypes.length > 0) {
    const typesList = workItemTypes.map((t) => `'${t}'`).join(", ");
    typeFilter = `[System.WorkItemType] IN (${typesList})`;
  } else {
    // If no types specified, get all work items
    typeFilter = `[System.WorkItemType] <> ''`;
  }

  // Try 'New' state first, but also support other common states
  return `SELECT [System.Id] FROM WorkItems WHERE ${typeFilter} AND [System.State] IN ('New', 'Active', 'To Do') ORDER BY [System.ChangedDate] DESC`;
};

export interface PaginationParams {
  limit?: number;
  skip?: number;
}

export interface PaginatedWorkItemsResult {
  workItems: WorkItem[];
  total: number;
  hasMore: boolean;
  skip: number;
  limit: number;
}

/**
 * Helper to check cache for work items
 */
function checkCacheForWorkItems(
  config: AzureConfig,
  workItemTypes: string[] | undefined,
  shouldUseCache: boolean
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
    logger.info(
      {
        orgUrl: config.orgUrl,
        project: config.project,
        types: workItemTypes,
        count: cached.length,
      },
      "Workitems query retrieved from cache"
    );
  }
  return cached || null;
}

/**
 * Helper to execute WIQL query
 */
async function executeWiqlQuery(
  config: AzureConfig,
  workItemTypes: string[] | undefined,
  fetchFn: FetchFunction
): Promise<Result<AzureWiqlResponse>> {
  const authHeader = `Basic ${Buffer.from(`:${config.pat}`).toString("base64")}`;
  const normalizedOrgUrl = config.orgUrl.replace(TRAILING_SLASH_REGEX, "");
  const wiqlUrl = `${normalizedOrgUrl}/${config.project}/_apis/wit/wiql?api-version=6.0`;
  const wiqlQuery = buildWiqlQuery(workItemTypes);

  const wiqlResponse = await fetchFn(wiqlUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader,
    },
    body: JSON.stringify({
      query: wiqlQuery,
    }),
  });

  if (!wiqlResponse.ok) {
    const errorText = await wiqlResponse.text();
    return err(
      new Error(
        `Failed to query WIQL (${wiqlResponse.status}): ${wiqlResponse.statusText} - ${errorText.substring(0, 200)}`
      )
    );
  }

  const wiqlData = (await wiqlResponse.json()) as AzureWiqlResponse;
  return ok(wiqlData);
}

/**
 * Helper to apply pagination to work item IDs
 */
function applyPaginationToIds(
  ids: (number | string)[],
  pagination: PaginationParams | undefined
): (number | string)[] {
  if (!pagination) {
    return ids;
  }

  const skip = pagination.skip || 0;
  const limit = pagination.limit || 50;
  const beforeCount = ids.length;
  const paginatedIds = ids.slice(skip, skip + limit);

  logger.info(
    {
      skip,
      limit,
      total: ids.length,
      pageCount: paginatedIds.length,
      skippedItems: beforeCount - paginatedIds.length,
    },
    "Applied pagination to workitems IDs - only processing page subset"
  );

  return paginatedIds;
}

/**
 * Helper to process work item batches
 */
async function processWorkItemBatches(
  config: AzureConfig,
  ids: (number | string)[],
  fetchFn: FetchFunction,
  shouldUseCache: boolean
): Promise<Result<WorkItem[]>> {
  const batchSize = 200;
  const batches = chunk(ids, batchSize);

  const batchResults = await Promise.all(
    batches.map((batchIds) =>
      processWorkItemBatch(
        config,
        batchIds.map((id) => String(id)),
        fetchFn,
        shouldUseCache
      )
    )
  );

  const errorResult = batchResults.find((result) => !result.ok);
  if (errorResult && !errorResult.ok) {
    return errorResult;
  }

  const allWorkItems: WorkItem[] = batchResults
    .filter((result): result is { ok: true; value: WorkItem[] } => result.ok)
    .flatMap((result) => result.value);

  return ok(allWorkItems);
}

/**
 * Helper to save work items to cache if needed
 */
function saveToCacheIfNeeded(
  config: AzureConfig,
  workItemTypes: string[] | undefined,
  allWorkItems: WorkItem[],
  shouldUseCache: boolean,
  pagination: PaginationParams | undefined
): void {
  if (shouldUseCache && !pagination) {
    workItemCache.set(
      {
        orgUrl: config.orgUrl,
        project: config.project,
        workItemTypes,
      },
      allWorkItems
    );
    logger.info(
      {
        orgUrl: config.orgUrl,
        project: config.project,
        count: allWorkItems.length,
      },
      "Workitems cached for future requests"
    );
  } else if (pagination) {
    logger.info(
      {
        orgUrl: config.orgUrl,
        project: config.project,
        pageCount: allWorkItems.length,
        skip: pagination.skip,
        limit: pagination.limit,
      },
      "Workitems retrieved with pagination (not cached)"
    );
  }
}

export const fetchNewWorkItems = async (
  config: AzureConfig,
  workItemTypes?: string[],
  fetchFn: FetchFunction = defaultFetch,
  useCache = true,
  pagination?: PaginationParams
): Promise<Result<WorkItem[]>> => {
  try {
    // IMPORTANT: When pagination is active, disable cache because:
    // 1. Cache stores ALL work items, not just the current page
    // 2. Using cache with pagination would load all items from cache and then slice, which defeats the purpose
    // 3. Pagination is meant to reduce memory/network usage, so we skip cache entirely
    const shouldUseCache = useCache && !pagination;

    // Check cache first for the full query result (only if no pagination)
    const cached = checkCacheForWorkItems(
      config,
      workItemTypes,
      shouldUseCache
    );
    if (cached) {
      return ok(cached);
    }

    // Execute WIQL query
    const wiqlResult = await executeWiqlQuery(config, workItemTypes, fetchFn);
    if (!wiqlResult.ok) {
      return wiqlResult;
    }

    let ids = wiqlResult.value.workItems.map((wi) => wi.id);
    ids = applyPaginationToIds(ids, pagination);

    // Process batches
    const batchResult = await processWorkItemBatches(
      config,
      ids,
      fetchFn,
      shouldUseCache
    );
    if (!batchResult.ok) {
      return batchResult;
    }

    // Save to cache if needed
    saveToCacheIfNeeded(
      config,
      workItemTypes,
      batchResult.value,
      shouldUseCache,
      pagination
    );

    return ok(batchResult.value);
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
};

// Backward compatibility: fetchNewBugs calls fetchNewWorkItems with Bug type
export const fetchNewBugs = async (
  config: AzureConfig,
  fetchFn: FetchFunction = defaultFetch,
  useCache = true
): Promise<Result<Bug[]>> => {
  const result = await fetchNewWorkItems(config, ["Bug"], fetchFn, useCache);
  if (!result.ok) {
    return result;
  }
  return ok(result.value);
};

export const fetchRepositories = async (
  orgUrl: string,
  project: string,
  pat: string,
  fetchFn: FetchFunction = defaultFetch
): Promise<Result<AzureRepository[]>> => {
  try {
    const authHeader = `Basic ${Buffer.from(`:${pat}`).toString("base64")}`;
    // Normalize orgUrl: remove trailing slash
    const normalizedOrgUrl = orgUrl.replace(TRAILING_SLASH_REGEX, "");
    const url = `${normalizedOrgUrl}/${project}/_apis/git/repositories?api-version=6.0`;

    const response = await fetchFn(url, {
      headers: {
        Authorization: authHeader,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return err(
        new Error(
          `Failed to fetch repositories: ${response.statusText} - ${errorText}`
        )
      );
    }

    const data = (await response.json()) as {
      value: AzureRepositoryApiResponse[];
    };
    const repositories: AzureRepository[] = data.value.map((repo) => ({
      id: repo.id,
      name: repo.name,
      url: repo.remoteUrl || repo.url || "",
      project,
    }));

    return ok(repositories);
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
};

export const getRepositoryUrl = (
  orgUrl: string,
  project: string,
  repoId: string
): string => {
  // Azure DevOps repository URL format
  return `${orgUrl}/${project}/_git/${repoId}`;
};

export interface AzureProject {
  id: string;
  name: string;
}

export const fetchProjects = async (
  orgUrl: string,
  pat: string,
  fetchFn: FetchFunction = defaultFetch
): Promise<Result<AzureProject[]>> => {
  try {
    const authHeader = `Basic ${Buffer.from(`:${pat}`).toString("base64")}`;
    // Normalize orgUrl: remove trailing slash
    const normalizedOrgUrl = orgUrl.replace(TRAILING_SLASH_REGEX, "");
    const url = `${normalizedOrgUrl}/_apis/projects?api-version=6.0`;

    const response = await fetchFn(url, {
      headers: {
        Authorization: authHeader,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return err(
        new Error(
          `Failed to fetch projects: ${response.statusText} - ${errorText.substring(0, 200)}`
        )
      );
    }

    const data = (await response.json()) as {
      value: AzureProjectApiResponse[];
    };
    const projects: AzureProject[] = data.value.map((project) => ({
      id: project.id,
      name: project.name,
    }));

    return ok(projects);
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
};

export const postComment = async (
  config: AzureConfig,
  workItemId: string,
  text: string,
  fetchFn: FetchFunction = defaultFetch
): Promise<Result<void>> => {
  try {
    const authHeader = `Basic ${Buffer.from(`:${config.pat}`).toString("base64")}`;
    const normalizedOrgUrl = config.orgUrl.replace(TRAILING_SLASH_REGEX, "");
    const url = `${normalizedOrgUrl}/${config.project}/_apis/wit/workitems/${workItemId}?api-version=6.0`;

    const body = [
      {
        op: "add",
        path: "/fields/System.History",
        value: text,
      },
    ];

    const response = await fetchFn(url, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json-patch+json",
        Authorization: authHeader,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return err(
        new Error(
          `Failed to post comment: ${response.statusText} - ${errorText}`
        )
      );
    }

    return ok(undefined);
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
};

// Re-export cache for external use
export { workItemCache } from "./cache";
