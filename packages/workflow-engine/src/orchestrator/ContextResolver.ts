/**
 * Context Resolver
 *
 * Orchestrates workflow context setup including:
 * - Workflow inheritance resolution
 * - Agent configuration lookup
 * - Workflow variable and parameter resolution
 * - Branch name determination
 *
 * Framework-agnostic: depends only on core types and injected logger
 */

import {
  getAgentConfigurations,
  getDb,
  getWorkflow,
  getWorkItem,
} from "@openfarm/core/db";
import type { AgentConfig, WorkItem } from "@openfarm/core/types/domain";
import type { Workflow } from "@openfarm/core/types/workflow";
import type { WorkflowLogger } from "../types";

export interface ContextSetupResult {
  workflow: Workflow;
  workItem: WorkItem;
  agentConfiguration: ReturnType<
    typeof import("@openfarm/core/db").findAgentConfiguration
  > | null;
  resolvedWorkflowVariables: Record<string, unknown>;
  branchName: string;
}

/**
 * Setup workflow context for execution
 *
 * Handles:
 * - Loading workflow and workItem from database
 * - Validating workflow is not abstract
 * - Resolving workflow inheritance chain
 * - Finding matching agent configuration
 * - Evaluating workflow variables and parameter defaults
 * - Determining execution branch name
 *
 * @param workflowId - Workflow to execute
 * @param workItemId - Work item for context
 * @param agentConfig - Agent configuration (for reference, lookup via DB)
 * @param logger - Logger for progress tracking
 * @param providedWorkItem - Optional pre-loaded workItem (for testing/chat sessions)
 */
export async function setupWorkflowContext(
  workflowId: string,
  workItemId: string,
  _agentConfig: AgentConfig,
  logger: WorkflowLogger,
  providedWorkItem?: WorkItem
): Promise<ContextSetupResult> {
  const db = await getDb();

  // Load or use provided workItem
  const workItem =
    providedWorkItem || (await getWorkItem(db as any, workItemId));
  if (!workItem) {
    throw new Error(`WorkItem ${workItemId} not found`);
  }

  // Load workflow
  let workflow = await getWorkflow(db as any, workflowId);
  if (!workflow) {
    throw new Error(`Workflow ${workflowId} not found`);
  }

  // Validate workflow is not abstract
  if (workflow.abstract) {
    throw new Error(
      `Cannot execute abstract workflow '${workflowId}' directly. Abstract workflows can only be used via inheritance ('extends').`
    );
  }

  // Resolve workflow inheritance if present
  if (workflow.extends) {
    await logger.info(
      `Workflow '${workflow.id}' extends '${workflow.extends}', resolving inheritance...`
    );
    await logger.info(
      `WorkItem data: id=${workItem.id}, title="${workItem.title}"`
    );
    await logger.debug(
      `WorkItem description: ${workItem.description?.substring(0, 100)}...`
    );
    await logger.debug(
      `WorkItem acceptanceCriteria: ${workItem.acceptanceCriteria?.substring(0, 100)}...`
    );

    const { resolveWorkflowInheritance } = await import(
      "@openfarm/core/workflow-dsl"
    );
    const { getWorkflows: coreGetWorkflows } = await import(
      "@openfarm/core/db"
    );
    const allWorkflows = await coreGetWorkflows(db as any);

    workflow = await resolveWorkflowInheritance(
      workflow,
      {
        workItem,
        stepResults: [],
        execution: undefined,
        variables: {},
      },
      {
        db: db as any,
        allWorkflows,
      }
    );

    await logger.debug(
      "Workflow inheritance resolved. Checking resolved workflow..."
    );

    // Log resolved workflow steps to verify expressions were evaluated
    for (const step of workflow.steps) {
      if (step.prompt) {
        const promptPreview = step.prompt.substring(0, 150);
        await logger.debug(
          `Step '${step.id}' prompt preview: ${promptPreview}...`
        );
        if (step.prompt.includes("${")) {
          await logger.error(
            `Step '${step.id}' prompt still contains unevaluated \${...} expressions!`
          );
        }
      }
    }
  }

  // Find matching agent configuration
  const configs = await getAgentConfigurations(db as any);
  const { findAgentConfiguration } = await import("@openfarm/core/db");
  const agentConfiguration = findAgentConfiguration(
    configs,
    workItem.project,
    workItem.azureRepositoryId,
    workItem.repositoryUrl
  );

  // Resolve workflow-level variables and parameters
  const resolvedWorkflowVariables: Record<string, unknown> = {};
  if (workflow.variables || workflow.parameters) {
    const { buildExpressionContext, evaluateExpression } = await import(
      "@openfarm/core/workflow-dsl"
    );
    const expressionContext = buildExpressionContext(
      workItem,
      [],
      undefined,
      {}
    );

    // Evaluate workflow variables
    if (workflow.variables) {
      await logger.debug(
        `Resolving ${Object.keys(workflow.variables).length} workflow variables: ${Object.keys(workflow.variables).join(", ")}`
      );
      for (const [key, value] of Object.entries(workflow.variables)) {
        if (typeof value === "string" && value.includes("${")) {
          resolvedWorkflowVariables[key] = evaluateExpression(
            value,
            expressionContext
          );
        } else {
          resolvedWorkflowVariables[key] = value;
        }
      }
    }

    // Evaluate parameter defaults
    if (workflow.parameters) {
      for (const [key, param] of Object.entries(workflow.parameters)) {
        if (
          param.default !== undefined &&
          !(key in resolvedWorkflowVariables)
        ) {
          if (
            typeof param.default === "string" &&
            param.default.includes("${")
          ) {
            resolvedWorkflowVariables[key] = evaluateExpression(
              param.default,
              expressionContext
            );
          } else {
            resolvedWorkflowVariables[key] = param.default;
          }
        }
      }
    }

    await logger.debug(
      `Resolved ${Object.keys(resolvedWorkflowVariables).length} workflow variables`
    );
  }

  // Determine execution branch
  const branchName =
    workItem.branchName ||
    workItem.defaultBranch ||
    agentConfiguration?.defaultBranch ||
    "main";

  if (workItem.branchName) {
    await logger.debug(`Using branch from workItem: ${workItem.branchName}`);
  } else if (workItem.defaultBranch) {
    await logger.debug(
      `Using defaultBranch from workItem: ${workItem.defaultBranch}`
    );
  } else {
    await logger.debug(`Using default branch: ${branchName}`);
  }

  return {
    workflow,
    workItem,
    agentConfiguration,
    resolvedWorkflowVariables,
    branchName,
  };
}
