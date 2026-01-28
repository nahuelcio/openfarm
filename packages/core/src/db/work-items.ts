// Use any type to avoid importing from bun during bundling
type SQL = any;

// Type for database row results
interface WorkItemRow {
  id: string;
  title: string;
  description: string | null;
  acceptance_criteria: string | null;
  work_item_type: string;
  source: string;
  status: string;
  assigned_agent_id: string | null;
  pr_url: string | null;
  branch_name: string | null;
  project: string;
  repository_url: string | null;
  azure_repository_id: string | null;
  azure_repository_project: string | null;
  tags: string | null;
  state: string | null;
  assigned_to: string | null;
  assignee_id: string | null;
  assignee_name: string | null;
  assignee_avatar_url: string | null;
  priority: string | null;
  pre_instructions: string | null;
  original_work_item_id: string | null;
  workflow_id: string | null;
}

import { err, ok, type Result } from "@openfarm/result";
import type { WorkItem } from "../types";
import { parseJson, toJson } from "./utils";

/**
 * Retrieves all local work items from the database.
 * This is a pure function that receives the database instance.
 *
 * @param db - The SQL database instance
 * @returns Array of all work items
 *
 * @example
 * ```typescript
 * const workItems = await getLocalWorkItems(db);
 * console.log(`Found ${workItems.length} work items`);
 * ```
 */
export async function getLocalWorkItems(db: SQL): Promise<WorkItem[]> {
  const rows = (await db`SELECT * FROM local_work_items`) as WorkItemRow[];
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description || "",
    acceptanceCriteria: row.acceptance_criteria || "",
    workItemType: row.work_item_type,
    source: row.source as WorkItem["source"],
    status: row.status as WorkItem["status"],
    assignedAgentId: row.assigned_agent_id || undefined,
    prUrl: row.pr_url || undefined,
    branchName: row.branch_name || undefined,
    defaultBranch: row.branch_name || undefined,
    project: row.project,
    repositoryUrl: row.repository_url || undefined,
    azureRepositoryId: row.azure_repository_id || undefined,
    azureRepositoryProject: row.azure_repository_project || undefined,
    tags: parseJson<string[]>(row.tags) || undefined,
    state: row.state || undefined,
    assignedTo: row.assigned_to || undefined, // Keep for backward compatibility
    assignee:
      row.assignee_id && row.assignee_name
        ? {
            id: row.assignee_id,
            name: row.assignee_name,
            avatarUrl: row.assignee_avatar_url || undefined,
          }
        : undefined,
    priority: (row.priority as WorkItem["priority"]) || "medium",
    preInstructions: row.pre_instructions || undefined,
    originalWorkItemId: row.original_work_item_id || undefined,
    workflowId: row.workflow_id || undefined,
  }));
}

/**
 * Retrieves a single work item by ID.
 * This is a pure function that receives the database instance.
 *
 * @param db - The SQL database instance
 * @param workItemId - The ID of the work item to retrieve
 * @returns The work item if found, undefined otherwise
 *
 * @example
 * ```typescript
 * const workItem = await getLocalWorkItem(db, 'item-123');
 * if (workItem) {
 *   console.log(`Work item title: ${workItem.title}`);
 * }
 * ```
 */
export async function getLocalWorkItem(
  db: SQL,
  workItemId: string
): Promise<WorkItem | undefined> {
  const rows =
    (await db`SELECT * FROM local_work_items WHERE id = ${workItemId}`) as WorkItemRow[];
  const row = rows[0];
  if (!row) {
    return undefined;
  }

  return {
    id: row.id,
    title: row.title,
    description: row.description || "",
    acceptanceCriteria: row.acceptance_criteria || "",
    workItemType: row.work_item_type,
    source: row.source as WorkItem["source"],
    status: row.status as WorkItem["status"],
    assignedAgentId: row.assigned_agent_id || undefined,
    prUrl: row.pr_url || undefined,
    branchName: row.branch_name || undefined,
    defaultBranch: row.branch_name || undefined,
    project: row.project,
    repositoryUrl: row.repository_url || undefined,
    azureRepositoryId: row.azure_repository_id || undefined,
    azureRepositoryProject: row.azure_repository_project || undefined,
    tags: parseJson<string[]>(row.tags) || undefined,
    state: row.state || undefined,
    assignedTo: row.assigned_to || undefined, // Keep for backward compatibility
    assignee:
      row.assignee_id && row.assignee_name
        ? {
            id: row.assignee_id,
            name: row.assignee_name,
            avatarUrl: row.assignee_avatar_url || undefined,
          }
        : undefined,
    priority: (row.priority as WorkItem["priority"]) || "medium",
    preInstructions: row.pre_instructions || undefined,
    originalWorkItemId: row.original_work_item_id || undefined,
    workflowId: row.workflow_id || undefined,
  };
}

/**
 * Adds a new work item to the database.
 * This is a pure function that receives the database instance.
 *
 * @param db - The SQL database instance
 * @param workItem - The work item to add
 * @returns Result indicating success or failure
 *
 * @example
 * ```typescript
 * const result = await addLocalWorkItem(db, {
 *   id: 'item-123',
 *   title: 'Fix bug',
 *   workItemType: 'Bug',
 *   source: 'local',
 *   status: 'open',
 *   project: 'my-project'
 * });
 * ```
 */
export async function addLocalWorkItem(
  db: SQL,
  workItem: WorkItem
): Promise<Result<void>> {
  try {
    await db`
            INSERT INTO local_work_items (
                id, title, description, acceptance_criteria, work_item_type, source,
                status, assigned_agent_id, pr_url, branch_name, project, repository_url,
                azure_repository_id, azure_repository_project, tags, state, assigned_to,
                assignee_id, assignee_name, assignee_avatar_url, priority, pre_instructions, original_work_item_id, workflow_id
            ) VALUES (
                ${workItem.id}, ${workItem.title}, ${workItem.description || null}, 
                ${workItem.acceptanceCriteria || null}, ${workItem.workItemType}, ${workItem.source},
                ${workItem.status}, ${workItem.assignedAgentId || null}, ${workItem.prUrl || null}, 
                ${workItem.branchName || workItem.defaultBranch || null}, ${workItem.project}, ${workItem.repositoryUrl || null},
                ${workItem.azureRepositoryId || null}, ${workItem.azureRepositoryProject || null}, 
                ${toJson(workItem.tags)}, ${workItem.state || null}, ${workItem.assignedTo || null},
                ${workItem.assignee?.id || null}, ${workItem.assignee?.name || null}, ${workItem.assignee?.avatarUrl || null},
                ${workItem.priority || "medium"}, ${workItem.preInstructions || null}, ${workItem.originalWorkItemId || null},
                ${workItem.workflowId || null}
            )
        `;

    return ok(undefined);
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Updates an existing work item in the database.
 * Uses an updater function pattern for immutability.
 * This is a pure function that receives the database instance.
 *
 * @param db - The SQL database instance
 * @param workItemId - The ID of the work item to update
 * @param updater - Function that receives the current item and returns the updated item
 * @returns Result indicating success or failure
 *
 * @example
 * ```typescript
 * const result = await updateLocalWorkItem(db, 'item-123', (item) => ({
 *   ...item,
 *   status: 'completed'
 * }));
 * ```
 */
/**
 * Helper to validate work item exists before update
 */
async function validateWorkItemExists(
  db: SQL,
  workItemId: string
): Promise<Result<WorkItem>> {
  const currentItem = await getLocalWorkItem(db, workItemId);
  if (!currentItem) {
    return err(new Error(`Work item not found: ${workItemId}`));
  }
  return ok(currentItem);
}

/**
 * Helper to execute work item update
 */
async function executeWorkItemUpdate(
  db: SQL,
  workItemId: string,
  updatedItem: WorkItem
): Promise<void> {
  await db`
    UPDATE local_work_items SET
      title = ${updatedItem.title}, 
      description = ${updatedItem.description || null}, 
      acceptance_criteria = ${updatedItem.acceptanceCriteria || null}, 
      work_item_type = ${updatedItem.workItemType},
      source = ${updatedItem.source}, 
      status = ${updatedItem.status}, 
      assigned_agent_id = ${updatedItem.assignedAgentId || null}, 
      pr_url = ${updatedItem.prUrl || null}, 
      branch_name = ${updatedItem.branchName || updatedItem.defaultBranch || null},
      project = ${updatedItem.project}, 
      repository_url = ${updatedItem.repositoryUrl || null}, 
      azure_repository_id = ${updatedItem.azureRepositoryId || null},
      azure_repository_project = ${updatedItem.azureRepositoryProject || null}, 
      tags = ${toJson(updatedItem.tags)}, 
      state = ${updatedItem.state || null}, 
      assigned_to = ${updatedItem.assignedTo || null},
      assignee_id = ${updatedItem.assignee?.id || null},
      assignee_name = ${updatedItem.assignee?.name || null},
      assignee_avatar_url = ${updatedItem.assignee?.avatarUrl || null},
      priority = ${updatedItem.priority || "medium"},
      pre_instructions = ${updatedItem.preInstructions || null}, 
      original_work_item_id = ${updatedItem.originalWorkItemId || null},
      workflow_id = ${updatedItem.workflowId || null}
    WHERE id = ${workItemId}
  `;
}

export async function updateLocalWorkItem(
  db: SQL,
  workItemId: string,
  updater: (item: WorkItem) => WorkItem
): Promise<Result<void>> {
  try {
    const validationResult = await validateWorkItemExists(db, workItemId);
    if (!validationResult.ok) {
      return err(validationResult.error);
    }

    const updatedItem = updater(validationResult.value);
    await executeWorkItemUpdate(db, workItemId, updatedItem);

    return ok(undefined);
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Deletes a work item from the database.
 * This is a pure function that receives the database instance.
 *
 * @param db - The SQL database instance
 * @param workItemId - The ID of the work item to delete
 * @returns Result indicating success or failure
 *
 * @example
 * ```typescript
 * const result = await deleteLocalWorkItem(db, 'item-123');
 * if (result.ok) {
 *   console.log('Work item deleted successfully');
 * }
 * ```
 */
export async function deleteLocalWorkItem(
  db: SQL,
  workItemId: string
): Promise<Result<void>> {
  try {
    await db`DELETE FROM workflow_executions WHERE work_item_id = ${workItemId}`;
    await db`DELETE FROM work_item_transitions WHERE work_item_id = ${workItemId}`;
    await db`DELETE FROM notifications WHERE work_item_id = ${workItemId}`;
    await db`DELETE FROM local_work_items WHERE id = ${workItemId}`;

    return ok(undefined);
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
}

export { getLocalWorkItem as getWorkItem };
