import * as fs from "node:fs";
import * as path from "node:path";
import type { Workflow } from "../../types/workflow";
import { convertJSONToWorkflow, convertYAMLToWorkflow } from "../converter";

/**
 * Loads a workflow from file (YAML or JSON)
 */
export async function loadWorkflowFromFile(
  workflowId: string,
  workflowFilesPath: string
): Promise<Workflow | undefined> {
  // Try YAML first
  const yamlPath = path.join(workflowFilesPath, `${workflowId}.yaml`);
  if (fs.existsSync(yamlPath)) {
    try {
      const yamlContent = fs.readFileSync(yamlPath, "utf-8");
      return await convertYAMLToWorkflow(yamlContent);
    } catch (error) {
      console.warn(`Failed to load YAML workflow from ${yamlPath}:`, error);
    }
  }

  // Try YML
  const ymlPath = path.join(workflowFilesPath, `${workflowId}.yml`);
  if (fs.existsSync(ymlPath)) {
    try {
      const yamlContent = fs.readFileSync(ymlPath, "utf-8");
      return await convertYAMLToWorkflow(yamlContent);
    } catch (error) {
      console.warn(`Failed to load YAML workflow from ${ymlPath}:`, error);
    }
  }

  // Try JSON
  const jsonPath = path.join(workflowFilesPath, `${workflowId}-workflow.json`);
  if (fs.existsSync(jsonPath)) {
    try {
      const jsonContent = fs.readFileSync(jsonPath, "utf-8");
      const jsonWorkflow = JSON.parse(jsonContent);
      return convertJSONToWorkflow(jsonWorkflow);
    } catch (error) {
      console.warn(`Failed to load JSON workflow from ${jsonPath}:`, error);
    }
  }

  return undefined;
}

/**
 * Loads a workflow from the database
 */
export async function loadWorkflowFromDatabase(
  db: unknown,
  workflowId: string
): Promise<Workflow | undefined> {
  try {
    const { getWorkflow } = await import("../../db/workflows");
    return await getWorkflow(db, workflowId);
  } catch (error) {
    console.warn(
      `Failed to lookup workflow '${workflowId}' in database:`,
      error
    );
    return undefined;
  }
}

/**
 * Finds a workflow by ID from multiple sources
 */
export async function findWorkflow(
  workflowId: string,
  options: {
    allWorkflows?: Workflow[];
    db?: unknown;
    workflowFilesPath?: string;
  }
): Promise<Workflow | undefined> {
  const { allWorkflows, db, workflowFilesPath } = options;

  // 1. Check pre-loaded workflows cache
  if (allWorkflows) {
    const found = allWorkflows.find((w) => w.id === workflowId);
    if (found) {
      return found;
    }
  }

  // 2. Check database
  if (db) {
    const found = await loadWorkflowFromDatabase(db, workflowId);
    if (found) {
      return found;
    }
  }

  // 3. Check workflow files
  if (workflowFilesPath) {
    const found = await loadWorkflowFromFile(workflowId, workflowFilesPath);
    if (found) {
      return found;
    }
  }

  return undefined;
}
