/**
 * Utility functions for building agent instructions.
 * Extracted from agent-executor.ts to reduce complexity.
 */

import type { ActionableWorkflowStep, WorkflowStep } from "@openfarm/core/types";
import type { AgentAuthorConfig, AgentCodeConfig } from "../executors/validation";
import type { StepExecutionRequest } from "../types";
import { replaceWorkItemExpressions, replaceStepResultsExpressions, type WorkItemExpressions, type StepResult } from "./expression-replacer";

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
 * Cleans up instruction text by removing unresolved expressions
 * and fixing formatting issues.
 */
export function cleanupInstruction(text: string): string {
  let result = text;

  // Remove any remaining ${...} expressions that couldn't be resolved
  result = result.replace(/\$\{[^}]+\}/g, "");

  // Remove literal "undefined" and "null" strings
  result = result.replace(/\bundefined\b/g, "");
  result = result.replace(/\bnull\b/g, "");

  // Clean up extra whitespace
  result = result.replace(/\s+/g, " ");
  result = result.replace(/\n\s*\n\s*\n/g, "\n\n"); // Remove excessive line breaks

  return result.trim();
}

/**
 * Builds agent instruction from step configuration and work item data.
 */
export function buildAgentInstruction(
  step: ActionableWorkflowStep | WorkflowStep,
  config: AgentCodeConfig | AgentAuthorConfig,
  workItem: WorkItemExpressions,
  stepResults: StepResult[] = []
): string {
  const replaceVariables = (text: string): string => {
    // Replace workItem expressions
    let result = replaceWorkItemExpressions(text, workItem);

    // Replace step results expressions
    result = replaceStepResultsExpressions(result, stepResults);

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
