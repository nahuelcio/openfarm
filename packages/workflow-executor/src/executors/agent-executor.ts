import { DEFAULT_FALLBACK_LLM_MODEL, SYSTEM_PROMPTS } from "@openfarm/config";
import { OpenCodeConfigService } from "@openfarm/core";
import { StepAction } from "@openfarm/core/constants/actions";
import { WorkflowPlanStatus } from "@openfarm/core/constants/status";
import { getWorkflowExecution } from "@openfarm/core/db";
import type {
  ActionableWorkflowStep,
  WorkflowStep,
} from "@openfarm/core/types";
import type { CodingEngine } from "@openfarm/core/types/adapters";
import { err, ok, type Result } from "@openfarm/result";
import { llmService } from "@openfarm/runner-utils/llm";
import type { StepExecutionRequest } from "../types";
import {
  type AgentAuthorConfig,
  type AgentCodeConfig,
  validateConfig,
} from "./validation";

/**
 * Replaces workItem expressions directly without complex parsing.
 * Handles common patterns like ${workItem.title}, ${workItem.description}, etc.
 * Also handles ternary expressions like ${workItem.description ? `...` : ''} by
 * evaluating them directly.
 */
function replaceWorkItemExpressions(
  text: string,
  workItem: {
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
): string {
  let result = text;

  // Direct replacements for simple expressions
  result = result.replace(/\$\{workItem\.title\}/g, workItem.title || "");
  result = result.replace(
    /\$\{workItem\.description\}/g,
    workItem.description || ""
  );
  result = result.replace(
    /\$\{workItem\.acceptanceCriteria\}/g,
    workItem.acceptanceCriteria || ""
  );
  result = result.replace(/\$\{workItem\.id\}/g, workItem.id || "");
  result = result.replace(
    /\$\{workItem\.workItemType\}/g,
    workItem.workItemType || ""
  );
  result = result.replace(/\$\{workItem\.type\}/g, workItem.workItemType || "");
  result = result.replace(/\$\{workItem\.project\}/g, workItem.project || "");
  result = result.replace(/\$\{workItem\.mode\}/g, workItem.mode || "");
  result = result.replace(
    /\$\{workItem\.preInstructions\}/g,
    workItem.preInstructions || ""
  );
  result = result.replace(
    /\$\{workItem\.repositoryUrl\}/g,
    workItem.repositoryUrl || ""
  );
  result = result.replace(
    /\$\{workItem\.branchName\}/g,
    workItem.branchName || ""
  );
  result = result.replace(
    /\$\{workItem\.defaultBranch\}/g,
    workItem.defaultBranch || ""
  );
  result = result.replace(
    /\$\{workItem\.chatMessages\}/g,
    workItem.chatMessages || "[]"
  );
  result = result.replace(
    /\$\{workItem\.sessionId\}/g,
    workItem.sessionId || ""
  );

  // Handle expressions with default values: ${workItem.mode || 'investigate'}
  const modeWithDefaultPattern =
    /\$\{workItem\.mode\s*\|\|\s*['"]([^'"]+)['"]\}/g;
  result = result.replace(modeWithDefaultPattern, (_match, defaultValue) => {
    return workItem.mode || defaultValue || "investigate";
  });

  // Handle complex ternary expressions for mode comparisons
  // Pattern: ${workItem.mode === 'investigate' || workItem.mode === 'explain' ? 'READ-ONLY MODE...' : 'WRITE MODE...'}
  const complexModeTernaryPattern =
    /\$\{workItem\.mode\s*===\s*['"](investigate|explain)['"]\s*\|\|\s*workItem\.mode\s*===\s*['"](investigate|explain)['"]\s*\?\s*['"]([^'"]+)['"]\s*:\s*['"]([^'"]+)['"]\}/g;
  result = result.replace(
    complexModeTernaryPattern,
    (_match, _mode1, _mode2, trueValue, falseValue) => {
      const currentMode = workItem.mode || "investigate";
      const isReadOnly =
        currentMode === "investigate" || currentMode === "explain";
      return isReadOnly ? trueValue : falseValue;
    }
  );

  // Handle simpler ternary: ${workItem.mode === 'investigate' ? 'value1' : 'value2'}
  const simpleModeTernaryPattern =
    /\$\{workItem\.mode\s*===\s*['"]([^'"]+)['"]\s*\?\s*['"]([^'"]+)['"]\s*:\s*['"]([^'"]+)['"]\}/g;
  result = result.replace(
    simpleModeTernaryPattern,
    (_match, compareMode, trueValue, falseValue) => {
      const currentMode = workItem.mode || "investigate";
      return currentMode === compareMode ? trueValue : falseValue;
    }
  );

  // Handle preInstructions with default: ${workItem.preInstructions || ''}
  const preInstructionsWithDefaultPattern =
    /\$\{workItem\.preInstructions\s*\|\|\s*['"]?['"]?\}/g;
  result = result.replace(preInstructionsWithDefaultPattern, () => {
    return workItem.preInstructions || "";
  });

  // Handle ternary expressions for description
  // Pattern: ${workItem.description ? `Description:\n${workItem.description}\n` : ''}
  const descriptionTernaryPattern =
    /\$\{workItem\.description\s*\?\s*`([^`]*)\$\{workItem\.description\}([^`]*)`\s*:\s*''\}/g;
  result = result.replace(
    descriptionTernaryPattern,
    (_match, prefix, suffix) =>
      workItem.description ? `${prefix}${workItem.description}${suffix}` : ""
  );

  // Handle ternary expressions for acceptanceCriteria
  // Pattern: ${workItem.acceptanceCriteria ? `Acceptance Criteria:\n${workItem.acceptanceCriteria}\n` : ''}
  const acceptanceTernaryPattern =
    /\$\{workItem\.acceptanceCriteria\s*\?\s*`([^`]*)\$\{workItem\.acceptanceCriteria\}([^`]*)`\s*:\s*''\}/g;
  result = result.replace(acceptanceTernaryPattern, (_match, prefix, suffix) =>
    workItem.acceptanceCriteria
      ? `${prefix}${workItem.acceptanceCriteria}${suffix}`
      : ""
  );

  // Handle generic ternary expressions for any workItem property
  // Pattern: ${workItem.X ? `...${workItem.X}...` : ''}
  const genericTernaryPattern =
    /\$\{workItem\.(\w+)\s*\?\s*`([^`]*)\$\{workItem\.\1\}([^`]*)`\s*:\s*''\}/g;
  result = result.replace(
    genericTernaryPattern,
    (_match, prop, prefix, suffix) => {
      const value = workItem[prop as keyof typeof workItem];
      return value ? `${prefix}${value}${suffix}` : "";
    }
  );

  return result;
}

/**
 * Replaces stepResults expressions like ${stepResults.research?.result}
 */
function replaceStepResultsExpressions(
  text: string,
  stepResults: Array<{ stepId: string; result?: string }>
): string {
  let result = text;

  // Create a map of stepId -> result for quick lookup
  const stepResultsMap = new Map<string, string>();
  for (const sr of stepResults) {
    if (sr.result) {
      stepResultsMap.set(sr.stepId, sr.result);
    }
  }

  // Handle pattern with fallback: ${stepResults.research?.result || 'No research available'}
  // This must be done BEFORE the simpler patterns to avoid partial matches
  const stepResultWithFallbackPattern =
    /\$\{stepResults\.(\w+)(\?\.)?\.result\s*\|\|\s*['"]([^'"]+)['"]\}/g;
  result = result.replace(
    stepResultWithFallbackPattern,
    (_match, stepId, _optional, fallback) => {
      const stepResult = stepResultsMap.get(stepId);
      return stepResult || fallback || "";
    }
  );

  // Replace ${stepResults.research?.result} or ${stepResults.research.result}
  // Pattern: ${stepResults.STEP_ID?.result} or ${stepResults.STEP_ID.result}
  const stepResultPattern = /\$\{stepResults\.(\w+)(\?\.)?\.result\}/g;
  result = result.replace(stepResultPattern, (_match, stepId) => {
    const stepResult = stepResultsMap.get(stepId);
    return stepResult || "";
  });

  // Also handle {stepResults.research.result} format (without $)
  const stepResultPatternNoDollar = /\{stepResults\.(\w+)(\?\.)?\.result\}/g;
  result = result.replace(stepResultPatternNoDollar, (_match, stepId) => {
    const stepResult = stepResultsMap.get(stepId);
    return stepResult || "";
  });

  // Handle workItem expressions that might be in stepResults context
  // Pattern: ${workItem.mode || 'investigate'}
  const workItemModePattern = /\$\{workItem\.mode\s*\|\|\s*['"]([^'"]+)['"]\}/g;
  result = result.replace(workItemModePattern, (_match, defaultValue) => {
    // We don't have workItem here, so return the default
    return defaultValue || "investigate";
  });

  return result;
}

/**
 * Cleans up instruction text by removing unresolved expressions
 * and fixing formatting issues.
 */
function cleanupInstruction(text: string): string {
  let result = text;

  // Remove any remaining ${...} expressions that couldn't be resolved
  result = result.replace(/\$\{[^}]+\}/g, "");

  // Remove literal "undefined" and "null" strings
  result = result.replace(/\bundefined\b/g, "");
  result = result.replace(/\bnull\b/g, "");

  // Fix multiple consecutive newlines (more than 2)
  result = result.replace(/\n{3,}/g, "\n\n");

  // Trim whitespace
  result = result.trim();

  return result;
}

/**
 * Generates a detailed dry run report for the agent.code step.
 * This provides visibility into what the workflow would do without making changes.
 *
 * @param step - The workflow step
 * @param instruction - The instruction that would be sent to the AI
 * @param config - The validated configuration
 * @param repoPath - The repository path
 * @returns Formatted dry run report
 */
function generateAgentDryRunReport(
  step: WorkflowStep,
  instruction: string,
  config: AgentCodeConfig,
  repoPath: string
): string {
  const lines: string[] = [];

  lines.push("# Dry Run Report: Agent Code Step");
  lines.push("");
  lines.push("## Overview");
  lines.push("- **Mode**: Preview (no changes will be made)");
  lines.push(`- **Step ID**: ${step.id}`);
  lines.push(`- **Provider**: ${config.provider || "opencode (default)"}`);
  lines.push(`- **Model**: ${config.model || "default"}`);
  lines.push(`- **Repository**: ${repoPath}`);
  lines.push("");

  lines.push("## Step Configuration");
  lines.push(`- **Chat Only**: ${config.chatOnly ? "Yes" : "No"}`);
  lines.push(`- **Preview Mode**: ${config.previewMode ? "Yes" : "No"}`);
  lines.push(`- **Max Iterations**: ${config.maxIterations || "1 (default)"}`);
  lines.push("");

  lines.push("## What Would Happen");
  lines.push("");
  if (config.chatOnly) {
    lines.push(
      "1. **Analysis Only**: AI would analyze the code without making changes"
    );
    lines.push(
      "2. **Generate Response**: Text summary/analysis would be returned"
    );
    lines.push(
      "3. **No File Modifications**: No files would be created or modified"
    );
  } else {
    lines.push(
      "1. **Code Analysis**: AI would analyze the repository and instruction"
    );
    lines.push(
      "2. **Generate Changes**: AI would determine which files to modify/create"
    );
    lines.push(
      "3. **Apply Changes**: Files would be modified in the repository"
    );
    lines.push(
      "4. **Return Summary**: A diff/summary of changes would be returned"
    );
  }
  lines.push("");

  lines.push("## Estimated Time");
  const baseTime = config.chatOnly ? "1-3" : "3-10";
  const iterations = config.maxIterations || 1;
  lines.push(
    `- Estimated duration: ${baseTime} minutes${iterations > 1 ? ` (up to ${baseTime} x ${iterations} with iterations)` : ""}`
  );
  lines.push("");

  lines.push("## Risk Assessment");
  if (config.chatOnly || config.previewMode) {
    lines.push("- **Risk Level**: Very Low");
    lines.push("- **Impact**: Read-only analysis, no file changes");
  } else {
    lines.push("- **Risk Level**: Medium");
    lines.push("- **Impact**: Files may be created, modified, or deleted");
    lines.push("- **Reversibility**: Git can revert changes if needed");
  }
  lines.push("");

  lines.push("## Instruction Preview");
  lines.push("");
  lines.push("The following instruction would be sent to the AI:");
  lines.push("");
  lines.push("```");
  // Truncate instruction if too long for preview
  const maxInstructionLength = 1500;
  if (instruction.length > maxInstructionLength) {
    lines.push(instruction.substring(0, maxInstructionLength));
    lines.push(
      `\n... [truncated, ${instruction.length - maxInstructionLength} more characters]`
    );
  } else {
    lines.push(instruction);
  }
  lines.push("```");
  lines.push("");

  lines.push("---");
  lines.push("*This is a dry run preview. No files were created or modified.*");

  return lines.join("\n");
}

/**
 * Builds instruction message for agent.code action.
 * This is a pure function with no side effects.
 *
 * @param step - Workflow step
 * @param config - Step configuration
 * @param workItem - Work item
 * @returns Instruction message
 *
 * @example
 * ```typescript
 * const instruction = buildAgentInstruction(step, config, workItem);
 * ```
 */
export function buildAgentInstruction(
  step: ActionableWorkflowStep,
  config: Record<string, unknown>,
  workItem: {
    title: string;
    description: string;
    acceptanceCriteria?: string;
    id?: string;
    workItemType?: string;
    project?: string;
    repositoryUrl?: string;
    tags?: string[];
    state?: string;
    assignedTo?: string;
    preInstructions?: string;
  },
  stepResults: Array<{ stepId: string; result?: string }> = []
): string {
  // Helper to sanitize HTML
  const sanitize = (text?: string): string => {
    return (text || "").replace(/<[^>]*>/g, "");
  };

  // Helper to replace all variables in a template
  const replaceVariables = (template: string): string => {
    const sanitizedDescription = sanitize(workItem.description);
    const sanitizedAcceptanceCriteria = sanitize(workItem.acceptanceCriteria);
    const sanitizedPreInstructions = sanitize(workItem.preInstructions);

    let result = template
      .replace(/{title}/g, workItem.title || "")
      .replace(/{description}/g, sanitizedDescription)
      .replace(/{acceptanceCriteria}/g, sanitizedAcceptanceCriteria)
      .replace(/{id}/g, workItem.id || "")
      .replace(/{workItemType}/g, workItem.workItemType || "")
      .replace(/{project}/g, workItem.project || "")
      .replace(/{repositoryUrl}/g, workItem.repositoryUrl || "")
      .replace(/{tags}/g, workItem.tags?.join(", ") || "")
      .replace(/{state}/g, workItem.state || "")
      .replace(/{assignedTo}/g, workItem.assignedTo || "")
      .replace(/{preInstructions}/g, sanitizedPreInstructions);

    // Inject results from previous steps
    // Handle both formats: {stepResults.research.result} and ${stepResults.research?.result}
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

/**
 * Executes agent.code action.
 * This function performs I/O operations (file system modifications via coding engine) but receives all dependencies explicitly,
 * making it testable through dependency injection. The function is deterministic given the same inputs.
 *
 * In dry run mode (previewMode at flags level), returns a detailed report of what would happen.
 *
 * @param request - Step execution request containing step, context, logger, flags, and services
 * @returns Result with success message or dry run report
 */
export async function executeAgentCode(
  request: StepExecutionRequest
): Promise<Result<string>> {
  const { step, context, logger, flags, services } = request;
  const { config } = step;

  const validation = validateConfig<AgentCodeConfig>(
    StepAction.AGENT_CODE,
    config
  );
  if (!validation.ok) {
    return validation;
  }
  const validatedConfig = validation.value;

  const { repoPath, workItem } = context;

  // Build instruction first (needed for both dry run and real execution)
  const instructionConfig = config ?? {};
  let instruction = buildAgentInstruction(
    step,
    instructionConfig,
    workItem,
    request.stepResults
  );

  // FALLBACK: Check if instruction still contains ${...} expressions (not evaluated during workflow resolution)
  // This can happen if workflow resolution failed or if Inngest serialization caused issues
  if (instruction.includes("${")) {
    await logger(
      "[Agent Executor] WARNING: Instruction contains unevaluated expressions. Applying direct replacement."
    );

    // Direct replacement approach - more reliable than complex expression parsing
    // Replace common patterns directly using workItem values
    instruction = replaceWorkItemExpressions(instruction, workItem);

    // Final cleanup
    instruction = cleanupInstruction(instruction);

    await logger(
      `[Agent Executor] Instruction resolved. Preview: ${instruction.substring(0, 200)}...`
    );
  }

  // Check for dry run mode at workflow level (flags.previewMode)
  // Note: validatedConfig.previewMode is step-level and affects the engine, not the workflow
  // Exception: If chatOnly is true, we should execute the coding engine even in preview mode
  // because chatOnly already guarantees read-only behavior (no file modifications)
  if (flags.previewMode && !validatedConfig.chatOnly) {
    await logger("[Dry Run] Agent code step - generating preview report...");

    const dryRunReport = generateAgentDryRunReport(
      step as WorkflowStep,
      instruction,
      validatedConfig,
      repoPath
    );
    await logger("[Dry Run] Preview report generated successfully");
    return ok(dryRunReport);
  }

  // If chatOnly is true, log that we're executing despite preview mode
  if (flags.previewMode && validatedConfig.chatOnly) {
    await logger(
      "[Chat Mode] Executing coding engine in chat-only mode (read-only, no file modifications)"
    );
  }

  if (!(services.codingEngine || services.codingEngineFactory)) {
    return err(
      new Error(
        "codingEngine or codingEngineFactory service is required for agent.code action"
      )
    );
  }

  if (!services.defaultEngineOptions) {
    return err(
      new Error(
        "defaultEngineOptions service is required for agent.code action"
      )
    );
  }

  const stepConfig = config ?? {};
  if (typeof stepConfig.prompt === "string") {
    await logger("Using config-level custom prompt");
  }

  const openCodeConfigService = services.db
    ? new OpenCodeConfigService(services.db)
    : await OpenCodeConfigService.create();

  const useOpenCode =
    validatedConfig.provider !== "claude-code" &&
    validatedConfig.provider !== "direct-llm";

  let resolvedModel =
    validatedConfig.model || context.agentConfiguration?.model || undefined;
  let tuiConfig: Awaited<
    ReturnType<typeof openCodeConfigService.getTuiConfig>
  > | null = null;

  if (useOpenCode) {
    const resolved = await openCodeConfigService.resolveModel(
      "tui",
      validatedConfig,
      context.agentConfiguration
    );
    resolvedModel = resolved.model;
    tuiConfig = await openCodeConfigService.getTuiConfig();
  }

  // Determine which engine to use
  let engineToUse: CodingEngine;

  const defaultEngine = services.codingEngine;
  const engineFactory = services.codingEngineFactory;
  const defaultEngineOptions = services.defaultEngineOptions;

  // Check if step overrides previewMode or readOnly
  const stepPreviewMode =
    validatedConfig.previewMode !== undefined
      ? validatedConfig.previewMode
      : validatedConfig.readOnly !== undefined
        ? validatedConfig.readOnly
        : defaultEngineOptions.previewMode;

  if (stepPreviewMode !== defaultEngineOptions.previewMode) {
    await logger(`Step overrides previewMode: ${stepPreviewMode}`);
  }

  if (engineFactory && resolvedModel) {
    await logger(`Creating engine with step-specific model: ${resolvedModel}`);
    engineToUse = engineFactory({
      provider:
        validatedConfig.provider || (useOpenCode ? "opencode" : "claude-code"),
      model: resolvedModel,
      previewMode: stepPreviewMode,
      chatOnly: validatedConfig.chatOnly,
      mcpServers: defaultEngineOptions.mcpServers,
      onLog: defaultEngineOptions.onLog,
      onChanges: defaultEngineOptions.onChanges,
      onChatMessage: defaultEngineOptions.onChatMessage,
      maxIterations: tuiConfig?.maxIterations,
    });
    await logger(`Using step-specific model: ${resolvedModel}`);
  } else {
    const stepModelToUse = validatedConfig.model;

    // If previewMode/chatOnly/provider differs and we have a factory, create new engine with correct mode
    const stepProvider =
      validatedConfig.provider || context.agentConfiguration?.provider;

    if (
      (stepPreviewMode !== defaultEngineOptions.previewMode ||
        validatedConfig.chatOnly !==
          (defaultEngineOptions as Record<string, unknown>).chatOnly ||
        stepProvider !== context.agentConfiguration?.provider ||
        stepModelToUse) &&
      engineFactory
    ) {
      await logger(
        `Creating engine with step-specific configuration: provider=${stepProvider}, previewMode=${stepPreviewMode}, chatOnly=${validatedConfig.chatOnly}${stepModelToUse ? `, model=${stepModelToUse}` : ""}`
      );
      engineToUse = engineFactory({
        provider: stepProvider,
        model: stepModelToUse || resolvedModel,
        previewMode: stepPreviewMode,
        chatOnly: validatedConfig.chatOnly,
        mcpServers: defaultEngineOptions.mcpServers,
        onLog: defaultEngineOptions.onLog,
        onChanges: defaultEngineOptions.onChanges,
        onChatMessage: defaultEngineOptions.onChatMessage,
        maxIterations: tuiConfig?.maxIterations,
      });
    } else {
      if (defaultEngine) {
        engineToUse = defaultEngine;
      } else {
        if (engineFactory && defaultEngineOptions) {
          // Fallback: create engine using factory if default instance is missing
          // This happens when running via simple-step-executor which only sets up the factory
          engineToUse = engineFactory({
            provider:
              validatedConfig.provider ||
              (useOpenCode ? "opencode" : "claude-code"),

            model: resolvedModel || "default",
            previewMode:
              stepPreviewMode !== undefined
                ? stepPreviewMode
                : defaultEngineOptions.previewMode,
            chatOnly: validatedConfig.chatOnly ?? false,
            mcpServers: defaultEngineOptions.mcpServers,
            onLog: defaultEngineOptions.onLog,
            onChanges: defaultEngineOptions.onChanges,
            onChatMessage: defaultEngineOptions.onChatMessage,
            maxIterations: tuiConfig?.maxIterations,
          });
        } else {
          return err(new Error("No coding engine available"));
        }
      }
    }
  }

  const modeLabel = stepPreviewMode ? " (read-only mode)" : "";
  const stepModel = "model" in step ? step.model : undefined;
  await logger(
    `Applying code changes${stepModel ? ` with model: ${stepModel}` : ""}${modeLabel}`
  );

  // Check if we should use iterative approach
  const maxIterations =
    validatedConfig.maxIterations ||
    context.agentConfiguration?.rules?.maxIterations;

  // Check if engine supports iterative method
  const hasIterativeMethod = "applyChangesIterative" in engineToUse;

  let result;
  try {
    if (maxIterations && maxIterations > 1 && hasIterativeMethod) {
      await logger(
        `Using iterative approach with max ${maxIterations} iterations`
      );
      const jobId = context.jobId;
      result = await engineToUse.applyChangesIterative?.(
        instruction,
        repoPath,
        [],
        jobId
      );
      if (!result) {
        result = await engineToUse.applyChanges(instruction, repoPath);
      }
    } else {
      result = await engineToUse.applyChanges(instruction, repoPath);
    }
  } catch (unexpectedError) {
    // Catch any unexpected errors from the engine
    await logger(
      `[Agent Executor] Unexpected error calling engine: ${
        unexpectedError instanceof Error
          ? unexpectedError.message
          : String(unexpectedError)
      }`
    );
    return err(
      unexpectedError instanceof Error
        ? unexpectedError
        : new Error(`Unexpected error: ${String(unexpectedError)}`)
    );
  }

  if (!result.ok) {
    const errorResult = result as { ok: false; error: unknown };

    // Log the raw error for debugging
    await logger(
      `[Agent Executor] Engine returned error. Type: ${typeof errorResult.error}, Value: ${JSON.stringify(errorResult.error)}`
    );

    // Ensure we have a proper Error instance
    let error: Error;
    if (errorResult.error instanceof Error) {
      error = errorResult.error;
    } else if (errorResult.error && typeof errorResult.error === "object") {
      // Try to extract error information from the object
      const errorObj = errorResult.error as Record<string, unknown>;
      const keys = Object.keys(errorObj);

      await logger(
        `[Agent Executor] Error object keys: ${keys.join(", ")}, Full object: ${JSON.stringify(errorObj, null, 2)}`
      );

      if ("message" in errorObj && typeof errorObj.message === "string") {
        error = new Error(errorObj.message);
        if ("stack" in errorObj && typeof errorObj.stack === "string") {
          error.stack = errorObj.stack;
        }
      } else if (keys.length === 0) {
        // Empty object - this is the problem we're seeing
        error = new Error(
          "Coding engine failed with empty error object. This may indicate a serialization issue or the engine returned an invalid error format."
        );
      } else {
        // Object with keys but no message
        error = new Error(`Coding engine failed: ${JSON.stringify(errorObj)}`);
      }
    } else {
      const errorStr =
        typeof errorResult.error === "string"
          ? errorResult.error
          : String(errorResult.error);
      error = new Error(errorStr || "Coding engine failed with unknown error");
    }
    return err(error);
  }

  // Return the changes summary (contains diff in preview mode)
  const changes = result.value;

  await logger(
    `[Agent Code] Received changes from Coding Engine - summary length: ${changes.summary?.length || 0}, hasDiff: ${!!changes.diff}, stepId: ${step.id}`
  );

  // If chatOnly is enabled, ignore diffs and return summary
  if (validatedConfig.chatOnly) {
    const summary = changes.summary || "No response received.";
    await logger(
      `[Agent Code] ChatOnly mode - returning summary (${summary.length} chars) for stepId: ${step.id}`
    );
    if (summary.length > 0) {
      await logger(
        `[Agent Code] Summary preview (first 500 chars): ${summary.substring(0, 500)}...`
      );
      await logger(
        `[Agent Code] Summary will be saved to stepResults[${step.id}].result`
      );
    } else {
      await logger(
        `[Agent Code] WARNING: Summary is empty! Changes object: ${JSON.stringify(changes).substring(0, 200)}`
      );
    }
    return ok(summary);
  }

  // Validate that actual file changes were made (not just in preview mode)
  if (!stepPreviewMode) {
    try {
      // Check if we can verify changes via git status
      // This works both for local execution and Pod execution
      let hasChanges = false;

      if (context.podName) {
        // For Pod execution, use kubectl to check git status
        const { promisify } = await import("node:util");
        const execFileAsync = promisify(
          (await import("node:child_process")).execFile
        );

        try {
          const { stdout } = await execFileAsync("kubectl", [
            "exec",
            context.podName,
            "-n",
            "minions-farm",
            "-c",
            "claude-code",
            "--",
            "sh",
            "-c",
            `cd "${repoPath}" && git status --porcelain`,
          ]);
          hasChanges = stdout.trim().length > 0;
        } catch {
          // If kubectl fails, we can't verify - log warning but continue
          await logger(
            "Warning: Could not verify changes via git status in Pod. Continuing anyway."
          );
          hasChanges = true; // Assume changes were made to avoid false positives
        }
      } else if (services.execAsync) {
        // For local execution, use execAsync
        try {
          const { stdout } = await services.execAsync("git", [
            "-C",
            repoPath,
            "status",
            "--porcelain",
          ]);
          hasChanges = stdout.trim().length > 0;
        } catch {
          // If git status fails, we can't verify - log warning but continue
          await logger(
            "Warning: Could not verify changes via git status. Continuing anyway."
          );
          hasChanges = true; // Assume changes were made to avoid false positives
        }
      } else {
        // No way to verify - log warning but continue
        await logger(
          "Warning: Cannot verify file changes (no execAsync available). Continuing anyway."
        );
        hasChanges = true; // Assume changes were made to avoid false positives
      }

      // If no changes detected and we have a diff or summary, warn but don't fail
      // (the engine might have made changes that aren't tracked by git yet)
      if (!(hasChanges || changes.diff || changes.summary)) {
        await logger(
          "Warning: No file changes detected after applying code changes. The workflow may fail at commit step."
        );
      } else if (!hasChanges) {
        await logger(
          "Warning: No file changes detected in git status, but engine reported changes. This may indicate the changes were not saved to disk."
        );
      }
    } catch (error) {
      // If validation fails, log but don't fail - the commit step will catch it
      await logger(
        `Warning: Could not validate file changes: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  // If there's a diff, return it as a formatted string
  if (changes.diff) {
    return ok(`Code changes applied successfully\n\n${changes.diff}`);
  }

  return ok(changes.summary || "Code changes applied successfully");
}

/**
 * Executes agent.author action.
 * Uses a pure LLM (Copilot) to generate text based on a prompt.
 *
 * @param request - Step execution request
 * @returns Result with generated text
 */
export async function executeAgentAuthor(
  request: StepExecutionRequest
): Promise<Result<string>> {
  const { step, context, logger } = request;
  const { config } = step;

  const validation = validateConfig<AgentAuthorConfig>(
    StepAction.AGENT_AUTHOR,
    config
  );
  if (!validation.ok) {
    return validation;
  }
  const validatedConfig = validation.value;

  const { workItem } = context;

  // Log stepResults availability for debugging
  await logger(
    `[Agent Author] StepResults available: ${request.stepResults?.length || 0} results`
  );
  if (request.stepResults && request.stepResults.length > 0) {
    for (const sr of request.stepResults) {
      await logger(
        `[Agent Author] StepResult: ${sr.stepId}, hasResult: ${!!sr.result}, resultLength: ${sr.result?.length || 0}`
      );
      if (sr.stepId === "research" && sr.result) {
        await logger(
          `[Agent Author] Research result preview: ${sr.result.substring(0, 300)}...`
        );
      }
    }
  } else {
    await logger("[Agent Author] WARNING: No stepResults available!");
  }

  const routerDecisionShape = {
    requiresCodeAnalysis: false,
    strategy: "",
    codeScope: "" as "full" | "summary" | "targeted" | "",
    targetFiles: [] as string[],
  };

  let routerDecision: Partial<typeof routerDecisionShape> | null = null;

  const routerResult = request.stepResults?.find(
    (sr) => sr.stepId === "router"
  );
  if (routerResult?.result) {
    try {
      routerDecision = JSON.parse(routerResult.result) as Partial<
        typeof routerDecisionShape
      >;
      await logger(
        `[Agent Author] Router decision: codeScope=${routerDecision?.codeScope || "N/A"}, strategy=${routerDecision?.strategy || "N/A"}`
      );
    } catch (e) {
      await logger(
        `[Agent Author] Failed to parse router decision: ${e instanceof Error ? e.message : String(e)}`
      );
    }
  }

  const authorInstructionConfig = config ?? {};
  // Build instruction (authoring prompt)
  let prompt = buildAgentInstruction(
    step,
    authorInstructionConfig,
    workItem,
    request.stepResults
  );

  // Adjust research content based on codeScope
  if (routerDecision?.codeScope && routerDecision.codeScope !== "full") {
    const researchResult = request.stepResults?.find(
      (sr) => sr.stepId === "research"
    );
    if (researchResult?.result) {
      if (routerDecision.codeScope === "summary") {
        // For summary, we could truncate or summarize the research result
        // For now, we'll use the full result but log that we could optimize
        await logger(
          `[Agent Author] CodeScope is 'summary' - using full research result (${researchResult.result.length} chars). Future: could summarize here.`
        );
      } else if (
        routerDecision.codeScope === "targeted" &&
        routerDecision.targetFiles &&
        routerDecision.targetFiles.length > 0
      ) {
        await logger(
          `[Agent Author] CodeScope is 'targeted' - target files: ${routerDecision.targetFiles.join(", ")}`
        );
        // Future: filter research result to only include targeted files
      }
    }
  }

  await logger(
    `[Agent Author] Prompt after buildAgentInstruction (first 500 chars): ${prompt.substring(0, 500)}...`
  );

  // FALLBACK: Check if prompt still contains ${...} expressions (not evaluated during workflow resolution)
  // This can happen if workflow resolution failed or if Inngest serialization caused issues
  if (prompt.includes("${")) {
    await logger(
      "[Agent Author] WARNING: Prompt contains unevaluated expressions. Applying direct replacement."
    );

    // Log stepResults for debugging
    await logger(
      `[Agent Author] Available stepResults: ${JSON.stringify(
        request.stepResults?.map((sr) => ({
          stepId: sr.stepId,
          hasResult: !!sr.result,
          resultLength: sr.result?.length || 0,
        }))
      )}`
    );

    // Direct replacement approach - more reliable than complex expression parsing
    // Replace common patterns directly using workItem values
    prompt = replaceWorkItemExpressions(prompt, workItem);

    // Replace stepResults expressions: ${stepResults.research?.result} -> actual result
    const beforeReplace = prompt;
    await logger(
      `[Agent Author] Before replacement - prompt contains stepResults.research: ${beforeReplace.includes("stepResults.research")}`
    );

    // Log all stepResults before replacement
    if (request.stepResults && request.stepResults.length > 0) {
      await logger(
        `[Agent Author] StepResults before replacement: ${request.stepResults.map((sr) => `stepId=${sr.stepId}, hasResult=${!!sr.result}, resultLength=${sr.result?.length || 0}`).join("; ")}`
      );
    }

    prompt = replaceStepResultsExpressions(prompt, request.stepResults || []);

    await logger(
      `[Agent Author] After replacement - prompt contains stepResults.research: ${prompt.includes("stepResults.research")}`
    );

    // Log if the replacement worked
    if (
      beforeReplace.includes("stepResults.research") &&
      prompt.includes("stepResults.research")
    ) {
      await logger(
        "[Agent Author] WARNING: stepResults.research expression was not replaced by replaceStepResultsExpressions!"
      );

      // Try to find the research result manually
      const researchResult = request.stepResults?.find(
        (sr) => sr.stepId === "research"
      );

      if (researchResult?.result) {
        await logger(
          `[Agent Author] Found research result manually: ${researchResult.result.length} chars`
        );
        await logger(
          `[Agent Author] Research result preview (first 300 chars): ${researchResult.result.substring(0, 300)}...`
        );

        // Manual replacement as fallback - try multiple patterns
        const patterns = [
          /\$\{stepResults\.research\?\.result\}/g,
          /\$\{stepResults\.research\.result\}/g,
          /\$\{stepResults\.research\?\.result\s*\|\|\s*['"]([^'"]+)['"]\}/g,
        ];

        for (const pattern of patterns) {
          const matches = prompt.match(pattern);
          if (matches) {
            await logger(
              `[Agent Author] Found ${matches.length} matches for pattern: ${pattern}`
            );
            if (pattern.source.includes("||")) {
              // Handle pattern with fallback: ${stepResults.research?.result || 'default'}
              prompt = prompt.replace(pattern, researchResult.result);
            } else {
              prompt = prompt.replace(pattern, researchResult.result);
            }
          }
        }

        await logger(
          `[Agent Author] After manual replacement - prompt contains stepResults.research: ${prompt.includes("stepResults.research")}`
        );
      } else {
        await logger(
          "[Agent Author] ERROR: No research result found in stepResults!"
        );
        await logger(
          `[Agent Author] Available stepIds: ${request.stepResults?.map((sr) => sr.stepId).join(", ") || "none"}`
        );
      }
    } else if (
      beforeReplace.includes("stepResults.research") &&
      !prompt.includes("stepResults.research")
    ) {
      await logger(
        "[Agent Author] SUCCESS: stepResults.research expression was successfully replaced!"
      );
    }

    // Final cleanup
    prompt = cleanupInstruction(prompt);

    await logger(
      `[Agent Author] Prompt resolved. Preview: ${prompt.substring(0, 500)}...`
    );
  }

  // Router decision was already processed above (lines 863-918)
  // Additional logging for direct-llm strategy
  if (
    routerDecision?.strategy === "direct-llm" &&
    !request.stepResults?.find((sr) => sr.stepId === "research")?.result
  ) {
    await logger(
      `[Agent Author] Strategy is 'direct-llm' - answering without code analysis`
    );
  }

  const systemPrompt =
    validatedConfig.systemPrompt || SYSTEM_PROMPTS.technicalAuthor;
  const model = validatedConfig.model || DEFAULT_FALLBACK_LLM_MODEL;

  await logger(`Generating response with LLM (${model})...`);

  try {
    const openCodeConfigService = request.services.db
      ? new OpenCodeConfigService(request.services.db)
      : await OpenCodeConfigService.create();

    const resolved = await openCodeConfigService.resolveModel(
      "server",
      validatedConfig,
      context.agentConfiguration
    );

    const apiKey = await openCodeConfigService.getProviderApiKey(
      resolved.provider,
      "server"
    );

    const result = await llmService.complete({
      prompt,
      systemPrompt,
      provider: {
        provider: resolved.provider,
        model: resolved.model,
        apiKey: apiKey || undefined,
      },
    });

    if (!result.text) {
      return err(new Error("Empty response from LLM API"));
    }

    return ok(result.text);
  } catch (error) {
    return err(
      error instanceof Error ? error : new Error("Failed to call Copilot API")
    );
  }
}

/**
 * Executes agent.implement action.
 * This function performs I/O operations (reads from database, executes code changes) but receives all dependencies explicitly,
 * making it testable through dependency injection. The function is deterministic given the same inputs.
 *
 * @param request - Step execution request containing step, context, logger, flags, and services
 * @returns Result with success message
 */
async function executeAgentImplement(
  request: StepExecutionRequest
): Promise<Result<string>> {
  const { step, services } = request;

  if (!(services.db && services.executionId)) {
    return err(
      new Error(
        "db and executionId services are required for agent.implement action"
      )
    );
  }

  // Get the execution to retrieve the approved plan
  const execution = await getWorkflowExecution(
    services.db,
    services.executionId
  );

  if (!execution) {
    return err(
      new Error(`Workflow execution ${services.executionId} not found`)
    );
  }

  if (!execution.plan) {
    return err(
      new Error(
        "No plan found in workflow execution. Planning and approval steps must be executed first."
      )
    );
  }

  const plan = execution.plan;

  // Check if plan is approved
  if (
    plan.status !== WorkflowPlanStatus.APPROVED &&
    plan.status !== WorkflowPlanStatus.MODIFIED
  ) {
    return err(
      new Error(`Plan is not approved. Current status: ${plan.status}`)
    );
  }

  // Use modified plan if available, otherwise use original
  const planToImplement = plan.modifiedContent || plan.content;

  await request.logger(
    "Implementing changes according to the approved plan..."
  );

  // Build instruction from the approved plan
  const instruction = `Implement the changes according to the following approved plan:

${planToImplement}

Please implement all steps of the plan completely and accurately.
IMPORTANT: You are running in a headless automation environment. Do NOT ask clarifying questions. Do NOT ask for user input. You must attempt to implement the changes based on the information provided.`;

  // Create a modified step with the plan as prompt
  const planStep: WorkflowStep = {
    ...(step as WorkflowStep),
    config: {
      ...("config" in step ? step.config : {}),
      prompt: instruction,
    },
  };

  // Use executeAgentCode with the plan as instruction
  const planRequest: StepExecutionRequest = {
    ...request,
    step: planStep,
  };

  return executeAgentCode(planRequest);
}

/**
 * Routes agent actions to the appropriate executor.
 * This function delegates to executors that perform I/O operations, but receives all dependencies explicitly,
 * making it testable through dependency injection.
 *
 * @param request - Step execution request containing step, context, logger, flags, and services
 * @returns Result with execution result
 */
export async function executeAgentAction(
  request: StepExecutionRequest
): Promise<Result<string>> {
  const { step } = request;
  const action = step.action;

  if (action === StepAction.AGENT_CODE) {
    return executeAgentCode(request);
  }
  if (action === StepAction.AGENT_IMPLEMENT) {
    return executeAgentImplement(request);
  }
  if (action === StepAction.AGENT_AUTHOR) {
    return executeAgentAuthor(request);
  }

  return err(new Error(`Unknown agent action: ${action}`));
}
