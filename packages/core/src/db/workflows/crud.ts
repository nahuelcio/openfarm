// Use any type to avoid importing from bun during bundling
type SQL = any;

import { err, ok, type Result } from "@openfarm/result";
import type { Workflow, WorkflowParameter, WorkflowStep } from "../../types";
import { parseJson, toJson } from "../utils";
import type { WorkflowRow } from "./types";

/**
 * Retrieves all workflows from the database.
 * This is a pure function that receives the database instance.
 *
 * @param db - The SQL database instance
 * @returns Array of all workflows
 *
 * @example
 * ```typescript
 * const workflows = await getWorkflows(db);
 * console.log(`Found ${workflows.length} workflows`);
 * ```
 */
export async function getWorkflows(db: SQL): Promise<Workflow[]> {
  try {
    const rows = await db`SELECT * FROM workflows`;
    // Bun SQL returns an array directly
    if (!Array.isArray(rows)) {
      console.error(
        "[DB] getWorkflows: rows is not an array:",
        typeof rows,
        rows
      );
      return [];
    }
    return rows.map((row: WorkflowRow) => ({
      id: row.id,
      name: row.name,
      description: row.description || undefined,
      steps: parseJson<WorkflowStep[]>(row.steps) || [],
      variables: parseJson<Record<string, unknown>>(row.variables) || undefined,
      parameters:
        parseJson<Record<string, WorkflowParameter>>(row.parameters) ||
        undefined,
      extends: row.extends || undefined,
      abstract: row.abstract === 1 ? true : undefined,
      reusable: row.reusable === 1 ? true : undefined,
      metadata: parseJson<Record<string, unknown>>(row.metadata) || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  } catch (error) {
    console.error("[DB] Error in getWorkflows:", error);
    return [];
  }
}

/**
 * Retrieves a single workflow by ID.
 * This is a pure function that receives the database instance.
 *
 * @param db - The SQL database instance
 * @param workflowId - The ID of the workflow to retrieve
 * @returns The workflow if found, undefined otherwise
 *
 * @example
 * ```typescript
 * const workflow = await getWorkflow(db, 'workflow-123');
 * if (workflow) {
 *   console.log(`Workflow name: ${workflow.name}`);
 * }
 * ```
 */
export async function getWorkflow(
  db: SQL,
  workflowId: string
): Promise<Workflow | undefined> {
  const rows =
    (await db`SELECT * FROM workflows WHERE id = ${workflowId}`) as WorkflowRow[];
  const row = rows[0];
  if (!row) {
    return undefined;
  }

  return {
    id: row.id,
    name: row.name,
    description: row.description || undefined,
    steps: parseJson<WorkflowStep[]>(row.steps) || [],
    variables: parseJson<Record<string, unknown>>(row.variables) || undefined,
    parameters:
      parseJson<Record<string, WorkflowParameter>>(row.parameters) || undefined,
    extends: row.extends || undefined,
    abstract: row.abstract === 1 ? true : undefined,
    reusable: row.reusable === 1 ? true : undefined,
    metadata: parseJson<Record<string, unknown>>(row.metadata) || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Adds a new workflow to the database.
 * This is a pure function that receives the database instance.
 *
 * @param db - The SQL database instance
 * @param workflow - The workflow to add
 * @returns Result indicating success or failure
 *
 * @example
 * ```typescript
 * const result = await addWorkflow(db, {
 *   id: 'workflow-123',
 *   name: 'Fix Bug Workflow',
 *   steps: [],
 *   createdAt: new Date().toISOString(),
 *   updatedAt: new Date().toISOString()
 * });
 * ```
 */
export async function addWorkflow(
  db: SQL,
  workflow: Workflow
): Promise<Result<void>> {
  try {
    await db`
            INSERT INTO workflows (id, name, description, steps, variables, parameters, extends, abstract, reusable, metadata, created_at, updated_at)
            VALUES (
              ${workflow.id}, 
              ${workflow.name}, 
              ${workflow.description || null}, 
              ${toJson(workflow.steps)},
              ${workflow.variables ? toJson(workflow.variables) : null},
              ${workflow.parameters ? toJson(workflow.parameters) : null},
              ${workflow.extends || null},
              ${workflow.abstract ? 1 : null},
              ${workflow.reusable ? 1 : null},
              ${workflow.metadata ? toJson(workflow.metadata) : null},
              ${workflow.createdAt}, 
              ${workflow.updatedAt}
            )
        `;

    return ok(undefined);
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Updates an existing workflow in the database.
 * Uses an updater function pattern for immutability.
 * This is a pure function that receives the database instance.
 *
 * @param db - The SQL database instance
 * @param workflowId - The ID of the workflow to update
 * @param updater - Function that receives the current workflow and returns the updated workflow
 * @returns Result indicating success or failure
 *
 * @example
 * ```typescript
 * const result = await updateWorkflow(db, 'workflow-123', (workflow) => ({
 *   ...workflow,
 *   name: 'Updated Workflow Name',
 *   updatedAt: new Date().toISOString()
 * }));
 * ```
 */
export async function updateWorkflow(
  db: SQL,
  workflowId: string,
  updater: (workflow: Workflow) => Workflow
): Promise<Result<void>> {
  try {
    const currentWorkflow = await getWorkflow(db, workflowId);
    if (!currentWorkflow) {
      return err(new Error(`Workflow not found: ${workflowId}`));
    }

    const updatedWorkflow = updater(currentWorkflow);

    await db`
            UPDATE workflows SET
                name = ${updatedWorkflow.name}, 
                description = ${updatedWorkflow.description || null}, 
                steps = ${toJson(updatedWorkflow.steps)},
                variables = ${updatedWorkflow.variables ? toJson(updatedWorkflow.variables) : null},
                parameters = ${updatedWorkflow.parameters ? toJson(updatedWorkflow.parameters) : null},
                extends = ${updatedWorkflow.extends || null},
                abstract = ${updatedWorkflow.abstract ? 1 : null},
                reusable = ${updatedWorkflow.reusable ? 1 : null},
                metadata = ${updatedWorkflow.metadata ? toJson(updatedWorkflow.metadata) : null},
                updated_at = ${updatedWorkflow.updatedAt}
            WHERE id = ${workflowId}
        `;

    return ok(undefined);
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Deletes a workflow from the database.
 * This is a pure function that receives the database instance.
 *
 * @param db - The SQL database instance
 * @param workflowId - The ID of the workflow to delete
 * @returns Result indicating success or failure
 *
 * @example
 * ```typescript
 * const result = await deleteWorkflow(db, 'workflow-123');
 * if (result.ok) {
 *   console.log('Workflow deleted successfully');
 * }
 * ```
 */
export async function deleteWorkflow(
  db: SQL,
  workflowId: string
): Promise<Result<void>> {
  try {
    await db`DELETE FROM workflows WHERE id = ${workflowId}`;
    return ok(undefined);
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Deletes all workflows from the database.
 * This is a pure function that receives the database instance.
 *
 * @param db - The SQL database instance
 * @returns Result indicating success or failure and the count of deleted workflows
 *
 * @example
 * ```typescript
 * const result = await deleteAllWorkflows(db);
 * if (result.ok) {
 *   console.log(`Deleted ${result.value} workflows`);
 * }
 * ```
 */
export async function deleteAllWorkflows(db: SQL): Promise<Result<number>> {
  try {
    const workflows = await getWorkflows(db);
    const deletedCount = workflows.length;
    await db`DELETE FROM workflows`;
    return ok(deletedCount);
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
}
