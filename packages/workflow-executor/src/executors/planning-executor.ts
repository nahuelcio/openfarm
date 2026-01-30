import { promises as fs } from "node:fs";
import { join } from "node:path";
import { StepAction } from "@openfarm/core/constants/actions";
import type { ActionableWorkflowStep } from "@openfarm/core/types";
import type { CodingEngine } from "@openfarm/core/types/adapters";
import type { WorkItem } from "@openfarm/core/types/domain";
import { err, ok, type Result } from "@openfarm/result";
import { sanitizePath } from "@openfarm/runner-utils/utils/git-config";
import type { StepExecutionRequest } from "../types";
import { type PlanningPlanConfig, validateConfig } from "./validation";

/**
 * Configuration for dry run output formatting.
 */
interface DryRunConfig {
  showEstimatedTime: boolean;
  showAffectedFiles: boolean;
  showRiskAssessment: boolean;
  verboseMode: boolean;
}

const DEFAULT_DRY_RUN_CONFIG: DryRunConfig = {
  showEstimatedTime: true,
  showAffectedFiles: true,
  showRiskAssessment: true,
  verboseMode: false,
};

/**
 * Generates a detailed dry run report for the planning step.
 * This provides visibility into what the workflow would do without making changes.
 *
 * @param workItem - The work item being processed
 * @param instruction - The instruction that would be sent to the AI
 * @param config - Dry run configuration options
 * @returns Formatted dry run report
 */
function generateDryRunReport(
  workItem: WorkItem,
  instruction: string,
  config: DryRunConfig = DEFAULT_DRY_RUN_CONFIG
): string {
  const lines: string[] = [];

  lines.push("# Dry Run Report: Planning Step");
  lines.push("");
  lines.push("## Overview");
  lines.push("- **Mode**: Preview (no changes will be made)");
  lines.push(`- **Work Item**: ${workItem.title}`);
  lines.push(`- **ID**: ${workItem.id || "N/A"}`);
  lines.push(`- **Type**: ${workItem.workItemType || "Feature"}`);
  lines.push("");

  lines.push("## What Would Happen");
  lines.push("");
  lines.push(
    "1. **Generate Specification**: AI would analyze the work item and generate a detailed SPEC.md"
  );
  lines.push(
    "2. **Save SPEC.md**: The specification would be saved to the repository root"
  );
  lines.push("3. **Stage for Review**: SPEC.md would be staged in git");
  lines.push("");

  if (config.showEstimatedTime) {
    lines.push("## Estimated Time");
    lines.push("- Planning generation: 2-5 minutes");
    lines.push("- Review step: 1-3 minutes");
    lines.push("- Human approval: Variable (up to 24 hours timeout)");
    lines.push("");
  }

  if (config.showAffectedFiles) {
    lines.push("## Files That Would Be Created/Modified");
    lines.push("- `SPEC.md` - Technical specification document (new)");
    lines.push(
      "- `TODO.md` - Task tracker (created in subsequent step if approved)"
    );
    lines.push("");
  }

  if (config.showRiskAssessment) {
    lines.push("## Risk Assessment");
    lines.push("- **Risk Level**: Low");
    lines.push(
      "- **Reversibility**: Full (SPEC.md can be deleted, branch can be reset)"
    );
    lines.push("- **Impact**: Read-only analysis + file creation");
    lines.push("");
  }

  lines.push("## Instruction Preview");
  lines.push("");
  lines.push("The following instruction would be sent to the AI:");
  lines.push("");
  lines.push("```");
  // Truncate instruction if too long for preview
  const maxInstructionLength = 2000;
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

  lines.push("## Next Steps (if this were a real run)");
  lines.push("");
  lines.push("1. Review the generated SPEC.md for completeness and accuracy");
  lines.push("2. Approve or request changes during the human approval step");
  lines.push("3. Watch as tasks are extracted and implemented one by one");
  lines.push("");

  lines.push("---");
  lines.push("*This is a dry run preview. No files were created or modified.*");

  return lines.join("\n");
}

/**
 * Cleans plan content by removing engine debug output, errors, and other noise.
 * This function extracts only the actual plan content in Markdown format.
 *
 * @param content - Raw plan content that may contain engine output
 * @returns Cleaned plan content
 */
function cleanPlanContent(content: string): string {
  if (!content) {
    return content;
  }

  // Split into lines for processing
  const lines = content.split("\n");
  const cleanedLines: string[] = [];
  const _inMarkdownBlock = false;
  let foundPlanStart = false;

  // Patterns to identify and skip noise
  const noisePatterns = [
    /^You can skip this check with/,
    /^Added .* to .gitignore/,
    /^\.\.\/tmp\/.*worktrees/,
    /^Note: in-chat filenames/,
    /^Cur working dir:/,
    /^Git working dir:/,
    /^docs$/,
    /^\/.*\.md$/,
    // Enhanced file not found patterns - catch various formats
    /^.*: file not found error$/i,
    /^(?:❌\s*)?[^\s:]+:\s*file\s+not\s+found\s+error$/i,
    /^.*file\s+not\s+found.*$/i,
    /^'NoneType' object has no attribute/,
    /^Unable to read .*: \[Errno 2\]/,
    /^<<<<<<< SEARCH/,
    /^>>>>>>> REPLACE/,
    /^=======/,
    /^with \d+ files$/,
  ];

  for (const line of lines) {
    const trimmedLine = line.trim();

    // Skip empty lines at the beginning
    if (!(foundPlanStart || trimmedLine)) {
      continue;
    }

    // Check if this line matches noise patterns
    const isNoise = noisePatterns.some((pattern) => pattern.test(trimmedLine));

    if (isNoise) {
      continue;
    }

    // Look for markdown start indicators (##, #, ```, etc.)
    if (
      trimmedLine.startsWith("#") ||
      trimmedLine.startsWith("```") ||
      trimmedLine.match(/^\d+\.\s/) ||
      trimmedLine.match(/^[-*]\s/)
    ) {
      foundPlanStart = true;
    }

    // If we haven't found plan start yet, skip lines that don't look like markdown
    if (!foundPlanStart) {
      // Skip lines that look like file paths or commands
      // Enhanced check for file not found errors and "Unable to read" errors in various formats
      const isFileNotFoundError =
        trimmedLine.includes("/workspace/") ||
        trimmedLine.toLowerCase().includes("file not found") ||
        trimmedLine.toLowerCase().includes("unable to read") ||
        /^(?:❌\s*)?[^\s:]+:\s*file\s+not\s+found/i.test(trimmedLine) ||
        /^Unable to read .*: \[Errno 2\]/i.test(trimmedLine) ||
        trimmedLine.match(/^[A-Z][a-z]+:/); // Skip lines like "Error:", "Warning:"

      if (isFileNotFoundError) {
        continue;
      }
    }

    // Once we find plan start, include everything
    if (foundPlanStart || trimmedLine.startsWith("#")) {
      cleanedLines.push(line);
    }
  }

  // Join and clean up
  let cleaned = cleanedLines.join("\n").trim();

  // Remove trailing noise (common at the end)
  // Enhanced patterns to catch file not found errors in various formats
  cleaned = cleaned.replace(/\n+.*file\s+not\s+found\s+error.*$/gim, "");
  cleaned = cleaned.replace(/\n+.*file\s+not\s+found.*$/gim, "");
  cleaned = cleaned.replace(/\n+.*:\s*file\s+not\s+found.*$/gim, "");
  cleaned = cleaned.replace(
    /\n+.*(?:❌\s*)?[^\s:]+:\s*file\s+not\s+found.*$/gim,
    ""
  );
  cleaned = cleaned.replace(/\n+.*'NoneType' object.*$/gim, "");
  cleaned = cleaned.replace(/\n+.*Unable to read.*$/gim, "");
  cleaned = cleaned.replace(/\n+.*>>>>>>> REPLACE.*$/gim, "");

  // If we have a cleaned plan, return it; otherwise return original (might be valid)
  return cleaned || content;
}

/**
 * Builds planning instruction message for planning.plan action.
 * This is a pure function with no side effects.
 *
 * @param step - Workflow step
 * @param config - Step configuration
 * @param workItem - Work item
 * @returns Planning instruction message
 */
export function buildPlanningInstruction(
  step: ActionableWorkflowStep,
  config: Record<string, unknown>,
  workItem: WorkItem
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
      .replace(/{assignedTo}/g, workItem.assignedTo || "");

    // Handle preInstructions conditionally - if empty, remove the placeholder line completely
    if (sanitizedPreInstructions) {
      result = result.replace(
        /{preInstructions}/g,
        `**Pre-instructions:** ${sanitizedPreInstructions}`
      );
    } else {
      // Remove the line containing {preInstructions} including the newline before it
      result = result.replace(/\n\{preInstructions\}\n/g, "\n");
      result = result.replace(/\{preInstructions\}\n/g, "");
      result = result.replace(/\n\{preInstructions\}/g, "");
      result = result.replace(/\{preInstructions\}/g, "");
    }

    return result;
  };

  // Default planning prompt
  const defaultPlanningPrompt = `Analyze the following work item and generate a detailed implementation plan in Markdown.

**Title:** {title}
**Description:** {description}
**Acceptance Criteria:** {acceptanceCriteria}
{preInstructions}

The plan must include:
1. **Problem Analysis**: Identify what needs to be done
2. **Implementation Strategy**: How to approach the solution
3. **Detailed Steps**: A numbered list of specific steps to follow
4. **Files to Modify/Create**: A list of files that will be needed
5. **Considerations**: Potential pitfalls or things to keep in mind

Format the plan in Markdown with clear sections and numbered steps.`;

  if (typeof config.prompt === "string") {
    return replaceVariables(config.prompt);
  }
  return replaceVariables(defaultPlanningPrompt);
}

/**
 * Executes planning.plan action.
 * This function performs I/O operations (calls coding engine to generate plans) but receives all dependencies explicitly,
 * making it testable through dependency injection. The function is deterministic given the same inputs.
 *
 * In dry run mode (previewMode), returns a detailed report of what would happen without making changes.
 *
 * @param request - Step execution request containing step, context, logger, flags, and services
 * @returns Result with the generated plan or dry run report
 */
export async function executePlanningPlan(
  request: StepExecutionRequest
): Promise<Result<string>> {
  const { step, context, logger, flags, services } = request;
  const { config } = step;

  // Check for dry run mode first
  if (flags.previewMode) {
    await logger("[Dry Run] Planning step - generating preview report...");

    const validation = validateConfig<PlanningPlanConfig>(
      StepAction.PLANNING_PLAN,
      config
    );
    if (!validation.ok) {
      return validation;
    }
    const validatedConfig = validation.value;

    const { workItem } = context;
    const instruction = buildPlanningInstruction(
      step as ActionableWorkflowStep,
      validatedConfig,
      workItem
    );

    const dryRunReport = generateDryRunReport(workItem, instruction);
    await logger("[Dry Run] Preview report generated successfully");
    return ok(dryRunReport);
  }

  if (!(services.codingEngine || services.codingEngineFactory)) {
    return err(
      new Error(
        "codingEngine or codingEngineFactory service is required for planning.plan action"
      )
    );
  }

  if (!services.defaultEngineOptions) {
    return err(
      new Error(
        "defaultEngineOptions service is required for planning.plan action"
      )
    );
  }

  const validation = validateConfig<PlanningPlanConfig>(
    StepAction.PLANNING_PLAN,
    config
  );
  if (!validation.ok) {
    return validation;
  }
  const validatedConfig = validation.value;

  const { workItem } = context;

  // Build planning instruction
  const instruction = buildPlanningInstruction(
    step as ActionableWorkflowStep,
    validatedConfig,
    workItem
  );

  await logger("Generating implementation plan...");

  // Determine which engine to use
  let engineToUse: CodingEngine;

  const defaultEngine = services.codingEngine;
  const engineFactory = services.codingEngineFactory;
  const defaultEngineOptions = services.defaultEngineOptions;

  if (engineFactory && validatedConfig.model) {
    await logger(`Using step-specific model: ${validatedConfig.model}`);
    engineToUse = engineFactory({
      model: validatedConfig.model,
      previewMode: true,
      mcpServers: defaultEngineOptions.mcpServers,
      onLog: defaultEngineOptions.onLog,
      onChanges: defaultEngineOptions.onChanges,
      onChatMessage: defaultEngineOptions.onChatMessage,
    });
  } else {
    // Use default engine in preview mode for planning
    if (engineFactory) {
      const modelOverride =
        context.agentConfig && "model" in context.agentConfig
          ? context.agentConfig.model
          : undefined;
      engineToUse = engineFactory({
        model: modelOverride,
        previewMode: true, // Planning is always read-only
        mcpServers: defaultEngineOptions.mcpServers,
        onLog: defaultEngineOptions.onLog,
        onChanges: defaultEngineOptions.onChanges,
        onChatMessage: defaultEngineOptions.onChatMessage,
      });
    } else if (defaultEngine) {
      engineToUse = defaultEngine;
    } else {
      return err(new Error("No coding engine available for planning"));
    }
  }

  // For planning, we use a special instruction that asks for a plan
  // We'll use the coding engine but with a prompt that asks for planning output
  const planningInstruction = `${instruction}\n\nIMPORTANT: Reply ONLY with the plan in Markdown. Do not generate code; only provide the implementation plan.`;

  // Use applyChanges but in preview mode - the engine should return the plan as text
  const result = await engineToUse.applyChanges(
    planningInstruction,
    context.repoPath
  );

  if (!result.ok) {
    const error = result as { ok: false; error: Error };
    await logger(`Failed to generate plan: ${error.error.message}`);
    return err(error.error);
  }

  // Extract plan from result
  // The plan should be in the summary or diff field
  let planContent =
    result.value.summary || result.value.diff || "Plan generated successfully";

  // Clean the plan content to remove engine debug output and errors
  planContent = cleanPlanContent(planContent);

  // Save plan to SPEC.md file and stage it in git
  const saveResult = await savePlanToFile(context, planContent, logger);
  if (saveResult.ok) {
    await logger("Plan saved to SPEC.md and staged for review");
  } else {
    await logger(
      `Warning: Failed to save SPEC.md: ${saveResult.error.message}`
    );
    // Continue anyway - the plan is still returned and saved in DB
  }

  await logger("Plan generated successfully");

  return ok(planContent);
}

/**
 * Routes planning actions to the appropriate executor.
 * This function delegates to executors that perform I/O operations, but receives all dependencies explicitly,
 * making it testable through dependency injection.
 *
 * @param request - Step execution request containing step, context, logger, flags, and services
 * @returns Result with execution result
 */
export async function executePlanningActionRouter(
  request: StepExecutionRequest
): Promise<Result<string>> {
  const { step } = request;
  const action = step.action;

  if (action === StepAction.PLANNING_PLAN) {
    return executePlanningPlan(request);
  }

  return err(new Error(`Unknown planning action: ${action}`));
}

/**
 * Saves plan content to SPEC.md file and stages it in git.
 * Handles both local execution and Kubernetes pod execution.
 */
async function savePlanToFile(
  context: { repoPath: string; podName?: string },
  planContent: string,
  logger: (msg: string) => Promise<void>
): Promise<Result<void>> {
  const specFilePath = join(context.repoPath, "SPEC.md");

  try {
    // Write file to disk
    if (context.podName) {
      // Write file in pod using kubectl exec
      const writeResult = await writeFileInPod(
        context.podName,
        specFilePath,
        planContent,
        logger
      );
      if (!writeResult.ok) {
        return writeResult;
      }
    } else {
      // Write file locally
      await fs.writeFile(specFilePath, planContent, "utf-8");
    }

    // Stage file in git
    const gitAddResult = await stageFileInGit(context, "SPEC.md", logger);
    if (!gitAddResult.ok) {
      return gitAddResult;
    }

    return ok(undefined);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return err(new Error(`Failed to save plan to file: ${errorMsg}`));
  }
}

/**
 * Writes a file in a Kubernetes pod using kubectl exec.
 */
async function writeFileInPod(
  podName: string,
  filePath: string,
  content: string,
  _logger: (msg: string) => Promise<void>
): Promise<Result<void>> {
  const { spawn } = await import("node:child_process");

  try {
    // Sanitize paths to prevent command injection
    const sanitizedPodName = sanitizePodName(podName);
    const sanitizedFilePath = sanitizePath(filePath);

    // Use base64 encoding to safely pass content through shell
    const encodedContent = Buffer.from(content, "utf-8").toString("base64");
    const shellCommand = `echo "${encodedContent}" | base64 -d > "${sanitizedFilePath}"`;

    return new Promise((resolve) => {
      const kubectlArgs = [
        "exec",
        sanitizedPodName,
        "-n",
        "minions-farm",
        "-c",
        "claude-code",
        "--",
        "sh",
        "-c",
        shellCommand,
      ];

      const process = spawn("kubectl", kubectlArgs);
      let stderr = "";

      const timeout = setTimeout(() => {
        process.kill();
        resolve(err(new Error("kubectl exec timed out while writing file")));
      }, 30_000); // 30 second timeout

      process.stderr.on("data", (data) => {
        stderr += data.toString();
      });

      process.on("close", (code) => {
        clearTimeout(timeout);
        if (code === 0) {
          resolve(ok(undefined));
        } else {
          resolve(
            err(
              new Error(
                `Failed to write file in pod: ${stderr || "Unknown error"}`
              )
            )
          );
        }
      });

      process.on("error", (error) => {
        clearTimeout(timeout);
        resolve(err(new Error(`kubectl exec error: ${error.message}`)));
      });
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return err(new Error(`Failed to write file in pod: ${errorMsg}`));
  }
}

/**
 * Stages a file in git (git add).
 * Handles both local execution and Kubernetes pod execution.
 */
async function stageFileInGit(
  context: { repoPath: string; podName?: string },
  filePath: string,
  logger: (msg: string) => Promise<void>
): Promise<Result<void>> {
  const command = `git add "${filePath}"`;

  if (context.podName) {
    // Execute git add in pod
    const result = await executeGitCommandInPod(
      context.podName,
      context.repoPath,
      command,
      logger
    );
    return result;
  }

  // Execute git add locally
  const { exec } = await import("node:child_process");
  const { promisify } = await import("node:util");
  const execAsync = promisify(exec);

  try {
    await execAsync(command, { cwd: context.repoPath });
    return ok(undefined);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return err(new Error(`Failed to stage file in git: ${errorMsg}`));
  }
}

/**
 * Executes a git command in a Kubernetes pod using kubectl exec.
 */
async function executeGitCommandInPod(
  podName: string,
  repoPath: string,
  command: string,
  _logger: (msg: string) => Promise<void>
): Promise<Result<void>> {
  const { spawn } = await import("node:child_process");

  try {
    const sanitizedPodName = sanitizePodName(podName);
    const sanitizedRepoPath = sanitizePath(repoPath);
    const sanitizedCommand = sanitizeShellCommand(command);
    const shellCommand = `cd "${sanitizedRepoPath}" && ${sanitizedCommand}`;

    return new Promise((resolve) => {
      const kubectlArgs = [
        "exec",
        sanitizedPodName,
        "-n",
        "minions-farm",
        "-c",
        "claude-code",
        "--",
        "sh",
        "-c",
        shellCommand,
      ];

      const process = spawn("kubectl", kubectlArgs);
      let stderr = "";

      const timeout = setTimeout(() => {
        process.kill();
        resolve(err(new Error("kubectl exec timed out")));
      }, 30_000); // 30 second timeout

      process.stderr.on("data", (data) => {
        stderr += data.toString();
      });

      process.on("close", (code) => {
        clearTimeout(timeout);
        if (code === 0) {
          resolve(ok(undefined));
        } else {
          resolve(
            err(
              new Error(
                `Git command failed in pod: ${stderr || "Unknown error"}`
              )
            )
          );
        }
      });

      process.on("error", (error) => {
        clearTimeout(timeout);
        resolve(err(new Error(`kubectl exec error: ${error.message}`)));
      });
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return err(new Error(`Failed to execute git command in pod: ${errorMsg}`));
  }
}

/**
 * Validates Kubernetes Pod name against RFC 1123 subdomain rules.
 */
function sanitizePodName(podName: string): string {
  if (!podName || typeof podName !== "string") {
    throw new Error("Pod name must be a non-empty string");
  }

  const k8sNameRegex = /^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/;
  if (!k8sNameRegex.test(podName)) {
    throw new Error(
      `Invalid pod name: ${podName}. Pod names must be lowercase, start and end with alphanumeric characters, and can only contain lowercase letters, numbers, and hyphens.`
    );
  }

  if (podName.length > 63) {
    throw new Error("Pod name exceeds maximum length of 63 characters");
  }

  return podName;
}

/**
 * Sanitizes shell command to prevent command injection.
 */
function sanitizeShellCommand(command: string): string {
  // Remove dangerous shell metacharacters
  // Only allow alphanumeric, spaces, and safe characters: -_./="
  const dangerousChars = /[;&|`$(){}[\]<>'\\]/g;
  if (dangerousChars.test(command)) {
    throw new Error(`Invalid characters in command: ${command}`);
  }
  return command;
}
