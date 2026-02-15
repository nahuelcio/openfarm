/**
 * Utility functions for replacing expressions in workflow templates.
 * Shared utilities to avoid code duplication between packages.
 */

import type {
  ActionableWorkflowStep,
  WorkflowStep,
} from "@openfarm/core/types";
import type {
  AgentAuthorConfig,
  AgentCodeConfig,
} from "../engines/workflow/executors/validation";

export interface WorkItemExpressions {
  title: string;
  description?: string;
  acceptanceCriteria?: string;
  id?: string;
  workItemType?: string;
  project?: string;
  mode?: string;
  preInstructions?: string;
  repositoryUrl?: string;
  branchName?: string;
  defaultBranch?: string;
  chatMessages?: string;
  sessionId?: string;
}

/**
 * Replaces workItem expressions in template strings.
 * Handles common patterns like ${workItem.title}, ${workItem.description}, etc.
 * Also handles ternary expressions like ${workItem.description ? `...` : ''}
 */
export function replaceWorkItemExpressions(
  text: string,
  workItem: WorkItemExpressions
): string {
  let result = text;

  // Direct replacements for simple expressions
  const simpleReplacements: Array<keyof WorkItemExpressions> = [
    'title', 'description', 'acceptanceCriteria', 'id', 'workItemType',
    'project', 'mode', 'preInstructions', 'repositoryUrl', 'branchName',
    'defaultBranch', 'chatMessages', 'sessionId'
  ];

  for (const prop of simpleReplacements) {
    const pattern = new RegExp(`\\$\\{workItem\\.${prop}\\}`, 'g');
    result = result.replace(pattern, workItem[prop] || "");
  }

  // Handle mode-specific ternary expressions
  result = replaceModeTernaries(result, workItem);
  
  // Handle preInstructions with default
  result = result.replace(
    /\$\{workItem\.preInstructions\|\|`.*?`\}/g,
    workItem.preInstructions || ""
  );

  // Handle description and acceptance criteria ternaries
  result = replaceDescriptionTernaries(result, workItem);
  result = replaceAcceptanceCriteriaTernaries(result, workItem);

  // Handle generic ternary expressions
  result = replaceGenericTernaries(result, workItem);

  return result;
}

function replaceModeTernaries(text: string, workItem: WorkItemExpressions): string {
  const currentMode = workItem.mode || "investigate";
  const isReadOnly = currentMode === "investigate" || currentMode === "review";

  // Complex mode ternary: ${workItem.mode ? `...` : `...`}
  const complexModeTernaryPattern = /\$\{workItem\.mode\?\s*`([^`]+)`\s*:\s*`([^`]+)`\}/g;
  return text.replace(complexModeTernaryPattern, (match, readOnlyMode, editMode) => {
    return isReadOnly ? readOnlyMode : editMode;
  });
}

function replaceDescriptionTernaries(text: string, workItem: WorkItemExpressions): string {
  const descriptionTernaryPattern = /\$\{workItem\.description\?\s*`([^`]+)`\s*:\s*`([^`]+)`\}/g;
  return text.replace(descriptionTernaryPattern, (match, hasDescription, noDescription) => {
    return workItem.description ? hasDescription : noDescription;
  });
}

function replaceAcceptanceCriteriaTernaries(text: string, workItem: WorkItemExpressions): string {
  const acceptanceTernaryPattern = /\$\{workItem\.acceptanceCriteria\?\s*`([^`]+)`\s*:\s*`([^`]+)`\}/g;
  return text.replace(acceptanceTernaryPattern, (match, hasCriteria, noCriteria) => {
    return workItem.acceptanceCriteria ? hasCriteria : noCriteria;
  });
}

function replaceGenericTernaries(text: string, workItem: WorkItemExpressions): string {
  const genericTernaryPattern = /\$\{workItem\.(\w+)\?\s*`([^`]+)`\s*:\s*`([^`]+)`\}/g;
  return text.replace(genericTernaryPattern, (match, prop, hasValue, noValue) => {
    const value = workItem[prop as keyof WorkItemExpressions];
    return value ? hasValue : noValue;
  });
}

/**
 * Sanitizes text content by removing potentially harmful characters.
 */
export function sanitize(text?: string): string {
  if (!text) return "";
  
  return text
    .replace(/[\x00-\x1F\x7F]/g, "") // Remove control characters
    .replace(/[\uFFFE\uFFFF]/g, "") // Remove BOM characters
    .trim();
}

/**
 * Builds agent instruction from step configuration and work item data.
 */
export function buildAgentInstruction(
  step: ActionableWorkflowStep | WorkflowStep,
  config: AgentCodeConfig | AgentAuthorConfig,
  workItem: WorkItemExpressions,
  stepResults: Array<{ stepId: string; result?: string }> = []
): string {
  const replaceVariables = (text: string): string => {
    // Replace workItem expressions
    let result = replaceWorkItemExpressions(text, workItem);

    // Replace step results expressions
    for (const stepResult of stepResults) {
      if (stepResult.result) {
        // Format without $: {stepResults.research.result}
        const placeholder = new RegExp(
          `\\{${stepResult.stepId}\\.result\\}`,
          "g"
        );
        result = result.replace(placeholder, stepResult.result);
        // Format with $: ${stepResults.research.result} or ${stepResults.research?.result}
        const placeholderWithDollar = new RegExp(
          `\\$\\{stepResults\\.${stepResult.stepId}(\\?\\.)?\\.result\\}`,
          "g"
        );
        result = result.replace(placeholderWithDollar, stepResult.result);
      }
    }

    // Replace common template variables
    result = result.replace(/{title}/g, workItem.title || "");
    result = result.replace(/{description}/g, sanitize(workItem.description));
    result = result.replace(/{acceptanceCriteria}/g, sanitize(workItem.acceptanceCriteria));
    result = result.replace(/{preInstructions}/g, sanitize(workItem.preInstructions));

    return result;
  };

  // Use step prompt if provided, otherwise use config prompt, otherwise build from work item
  if (typeof config.prompt === "string") {
    return replaceVariables(config.prompt);
  }

  // Build instruction from work item
  const sanitizedDescription = sanitize(workItem.description);
  const sanitizedAcceptanceCriteria = sanitize(workItem.acceptanceCriteria);
  
  return `${workItem.title}\n\n${sanitizedDescription}\n\nAcceptance Criteria:\n${sanitizedAcceptanceCriteria}\n\nIMPORTANT: You are running in a headless automation environment. Do NOT ask clarifying questions. Do NOT ask for user input. You must attempt to implement the changes based on the information provided. If information is missing, make reasonable assumptions.`;
}
