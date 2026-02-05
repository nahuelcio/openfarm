/**
 * Prompt Executor
 *
 * Executes prompt-related actions for task-loop workflows:
 * - prompt.build: Build prompt from template and task data
 * - prompt.template: Apply template to variables
 */

import { StepAction } from "@openfarm/core/constants/actions";
import type { WorkItem } from "@openfarm/core/types";
import { err, ok, type Result } from "@openfarm/result";
import type { StepExecutionRequest } from "../types";

/**
 * Default prompt template
 */
const DEFAULT_TEMPLATE = `{title}

## Description
{description}

## Acceptance Criteria
{acceptanceCriteria}

## Instructions
You are an AI coding assistant working autonomously. Please implement the requirements above.
Make reasonable assumptions if information is missing. Do not ask clarifying questions.

{preInstructions}
`;

/**
 * Prompt templates
 */
const TEMPLATES: Record<string, string> = {
  default: DEFAULT_TEMPLATE,
  simple: `{title}

{description}

Acceptance Criteria:
{acceptanceCriteria}`,
  detailed: `# Task: {title}

## Overview
{description}

## Success Criteria
{acceptanceCriteria}

## Context
- Type: {workItemType}
- ID: {id}
- Project: {project}
- Priority: {priority}

## Additional Instructions
{preInstructions}

## Guidelines
1. Implement the requirements completely
2. Follow existing code patterns and conventions
3. Add tests if appropriate
4. Update documentation as needed
5. Ensure the code passes any existing linting/type checks

You are running in an automated environment. Do not ask questions. Proceed with implementation.`,
};

/**
 * Sanitize text by removing HTML tags
 */
function sanitize(text?: string): string {
  if (!text) {
    return "";
  }
  return text.replace(/<[^>]*>/g, "").trim();
}

/**
 * Replace placeholders in template with work item data
 */
function replacePlaceholders(template: string, workItem: WorkItem): string {
  return template
    .replace(/\{title\}/g, sanitize(workItem.title) || "Untitled Task")
    .replace(/\{description\}/g, sanitize(workItem.description) || "")
    .replace(
      /\{acceptanceCriteria\}/g,
      sanitize(workItem.acceptanceCriteria) || ""
    )
    .replace(/\{id\}/g, workItem.id || "")
    .replace(/\{workItemType\}/g, workItem.workItemType || "Task")
    .replace(/\{project\}/g, workItem.project || "")
    .replace(/\{priority\}/g, workItem.priority || "medium")
    .replace(/\{preInstructions\}/g, sanitize(workItem.preInstructions) || "")
    .replace(/\{tags\}/g, workItem.tags?.join(", ") || "")
    .replace(/\{state\}/g, workItem.state || "");
}

/**
 * Clean up template output
 */
function cleanup(text: string): string {
  return text
    .replace(/\n{3,}/g, "\n\n") // Remove extra blank lines
    .trim();
}

/**
 * Executes prompt.build action - builds prompt from template and task
 */
async function executePromptBuild(
  request: StepExecutionRequest
): Promise<Result<string>> {
  const { step, context, logger } = request;
  const config = step.config || {};

  const templateName = (config.template as string) || "default";
  const task = context.workflowVariables?.currentTask as WorkItem | undefined;

  if (!task) {
    return err(new Error("No current task found in context"));
  }

  await logger(`Building prompt using template: ${templateName}`);

  // Get template
  const template = TEMPLATES[templateName] || TEMPLATES.default;

  // Replace placeholders
  let prompt = replacePlaceholders(template, task);

  // Clean up
  prompt = cleanup(prompt);

  await logger(`Built prompt (${prompt.length} chars)`);
  return ok(prompt);
}

/**
 * Executes prompt.template action - applies template to variables
 */
async function executePromptTemplate(
  request: StepExecutionRequest
): Promise<Result<string>> {
  const { step, context, logger } = request;
  const config = step.config || {};

  const template = config.template as string;
  const variables = (config.variables as Record<string, string>) || {};

  if (!template) {
    return err(new Error("Template is required"));
  }

  await logger("Applying template to variables");

  // Replace variables in template
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    const placeholder = `{${key}}`;
    result = result.replace(new RegExp(placeholder, "g"), value);
  }

  // Also replace from context variables
  const contextVars = context.workflowVariables || {};
  for (const [key, value] of Object.entries(contextVars)) {
    const placeholder = `{${key}}`;
    if (typeof value === "string") {
      result = result.replace(new RegExp(placeholder, "g"), value);
    }
  }

  result = cleanup(result);

  await logger(`Applied template (${result.length} chars)`);
  return ok(result);
}

/**
 * Routes prompt actions to the appropriate executor
 */
export async function executePromptAction(
  request: StepExecutionRequest
): Promise<Result<string>> {
  const { step } = request;
  const action = step.action;

  if (action === StepAction.PROMPT_BUILD) {
    return executePromptBuild(request);
  }
  if (action === StepAction.PROMPT_TEMPLATE) {
    return executePromptTemplate(request);
  }

  return err(new Error(`Unknown prompt action: ${action}`));
}
