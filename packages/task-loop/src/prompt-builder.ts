/**
 * Prompt Builder
 *
 * Builds prompts for AI agents from WorkItem data.
 * Supports customizable templates and context injection.
 */

import type { WorkItem } from "@openfarm/core";
import type { PromptBuilderConfig, TaskLoopTask } from "./types";

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
 * Simple template for quick tasks
 */
const SIMPLE_TEMPLATE = `{title}

{description}

Acceptance Criteria:
{acceptanceCriteria}
`;

/**
 * Detailed template with context
 */
const DETAILED_TEMPLATE = `# Task: {title}

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

You are running in an automated environment. Do not ask questions. Proceed with implementation.
`;

/**
 * Template presets
 */
export const PROMPT_TEMPLATES: Record<string, string> = {
  default: DEFAULT_TEMPLATE,
  simple: SIMPLE_TEMPLATE,
  detailed: DETAILED_TEMPLATE,
};

/**
 * Builds prompts from WorkItem data
 */
export class PromptBuilder {
  private readonly template: string;

  constructor(private readonly config: PromptBuilderConfig = {}) {
    this.template = this.resolveTemplate();
  }

  /**
   * Build a prompt from a task
   */
  build(task: TaskLoopTask): string {
    const workItem = task as WorkItem;

    let prompt = this.template;

    // Replace basic placeholders
    prompt = this.replaceBasicPlaceholders(prompt, workItem);

    // Handle conditional sections
    prompt = this.handleConditionals(prompt, workItem);

    // Clean up empty lines and whitespace
    prompt = this.cleanup(prompt);

    return prompt;
  }

  /**
   * Build a prompt with additional context from previous tasks
   */
  buildWithContext(
    task: TaskLoopTask,
    context: {
      previousResults?: Array<{ taskId: string; result: string }>;
      projectContext?: string;
    }
  ): string {
    let prompt = this.build(task);

    // Add previous task results if configured
    if (this.config.includeContext && context.previousResults?.length) {
      const contextSection = this.buildContextSection(context.previousResults);
      prompt += `\n\n## Previous Task Results\n${contextSection}`;
    }

    // Add project context if provided
    if (context.projectContext) {
      prompt += `\n\n## Project Context\n${context.projectContext}`;
    }

    // Add custom context if provided
    if (this.config.customContext) {
      prompt += `\n\n## Additional Context\n${this.config.customContext}`;
    }

    return prompt;
  }

  /**
   * Resolve template from config or use default
   */
  private resolveTemplate(): string {
    if (this.config.template) {
      // Check if it's a preset name
      if (PROMPT_TEMPLATES[this.config.template]) {
        return PROMPT_TEMPLATES[this.config.template];
      }
      // Use as custom template
      return this.config.template;
    }
    return DEFAULT_TEMPLATE;
  }

  /**
   * Replace basic placeholders with work item data
   */
  private replaceBasicPlaceholders(
    template: string,
    workItem: WorkItem
  ): string {
    const sanitize = (text?: string): string => {
      if (!text) {
        return "";
      }
      // Remove HTML tags
      return text.replace(/<[^>]*>/g, "").trim();
    };

    return template
      .replace(/\{title\}/g, sanitize(workItem.title) || "Untitled Task")
      .replace(/\{description\}/g, sanitize(workItem.description) || "")
      .replace(
        /\{acceptanceCriteria\}/g,
        this.config.includeAcceptanceCriteria !== false
          ? sanitize(workItem.acceptanceCriteria) || ""
          : ""
      )
      .replace(/\{id\}/g, workItem.id || "")
      .replace(/\{workItemType\}/g, workItem.workItemType || "Task")
      .replace(/\{project\}/g, workItem.project || "")
      .replace(/\{priority\}/g, workItem.priority || "medium")
      .replace(
        /\{preInstructions\}/g,
        this.config.includePreInstructions !== false
          ? sanitize(workItem.preInstructions) || ""
          : ""
      )
      .replace(/\{tags\}/g, workItem.tags?.join(", ") || "")
      .replace(/\{state\}/g, workItem.state || "");
  }

  /**
   * Handle conditional sections in template
   * Format: {{#if field}}content{{/if}}
   */
  private handleConditionals(template: string, workItem: WorkItem): string {
    let result = template;

    // Handle {{#if field}}...{{/if}}
    const ifPattern = /\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g;
    result = result.replace(ifPattern, (match, field, content) => {
      const value = workItem[field as keyof WorkItem];
      if (
        value &&
        value !== "" &&
        !(Array.isArray(value) && value.length === 0)
      ) {
        return content;
      }
      return "";
    });

    // Handle {{#unless field}}...{{/unless}}
    const unlessPattern = /\{\{#unless\s+(\w+)\}\}([\s\S]*?)\{\{\/unless\}\}/g;
    result = result.replace(unlessPattern, (match, field, content) => {
      const value = workItem[field as keyof WorkItem];
      if (
        !value ||
        value === "" ||
        (Array.isArray(value) && value.length === 0)
      ) {
        return content;
      }
      return "";
    });

    return result;
  }

  /**
   * Build context section from previous task results
   */
  private buildContextSection(
    previousResults: Array<{ taskId: string; result: string }>
  ): string {
    return previousResults
      .map((r, i) => `### Task ${i + 1} (${r.taskId})\n${r.result}`)
      .join("\n\n");
  }

  /**
   * Clean up template output
   */
  private cleanup(text: string): string {
    return text
      .replace(/\n{3,}/g, "\n\n") // Remove extra blank lines
      .trim();
  }
}

/**
 * Create a default prompt builder
 */
export function createDefaultPromptBuilder(): PromptBuilder {
  return new PromptBuilder({
    includeAcceptanceCriteria: true,
    includePreInstructions: true,
    includeContext: false,
  });
}

/**
 * Create a prompt builder for a specific template preset
 */
export function createPromptBuilder(
  preset: "default" | "simple" | "detailed" | (string & {}),
  options?: Omit<PromptBuilderConfig, "template">
): PromptBuilder {
  return new PromptBuilder({
    template: preset,
    ...options,
  });
}
