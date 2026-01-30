// @ts-expect-error - TODO: Move AgentCodeConfig to a shared package
import type { AgentCodeConfig } from "@openfarm/agent-runner/engines/workflow/executors/validation";
import type { WorkflowStep } from "@openfarm/core/types";

export interface WorkItemTemplateData {
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

export interface StepResultData {
  stepId: string;
  result?: string;
}

export function replaceWorkItemExpressions(
  text: string,
  workItem: WorkItemTemplateData
): string {
  let result = text;

  const modeWithDefaultPattern =
    /\$?(?:\{?workItem\.mode\s*\|\|\s*['"]([^'"]+)['"]\}?)/g;
  result = result.replace(modeWithDefaultPattern, (_match, defaultValue) => {
    return workItem.mode || defaultValue || "investigate";
  });

  const complexModeTernaryPattern =
    /\$?(?:\{?\$?workItem\.mode\s*===\s*['"](investigate|explain)['"]\s*\|\|\s*\$?workItem\.mode\s*===\s*['"](investigate|explain)['"]\s*\?\s*['"]([^'"]+)['"]\s*:\s*['"]([^'"]+)['"]\}?)/g;
  result = result.replace(
    complexModeTernaryPattern,
    (_match, _mode1, _mode2, trueValue, falseValue) => {
      const currentMode = workItem.mode || "investigate";
      const isReadOnly =
        currentMode === "investigate" || currentMode === "explain";
      return isReadOnly ? trueValue : falseValue;
    }
  );

  const simpleModeTernaryPattern =
    /\$?(?:\{?\$?workItem\.mode\s*===\s*['"]([^'"]+)['"]\s*\?\s*['"]([^'"]+)['"]\s*:\s*['"]([^'"]+)['"]\}?)/g;
  result = result.replace(
    simpleModeTernaryPattern,
    (_match, compareMode, trueValue, falseValue) => {
      const currentMode = workItem.mode || "investigate";
      return currentMode === compareMode ? trueValue : falseValue;
    }
  );

  const preInstructionsWithDefaultPattern =
    /\$?(?:\{?workItem\.preInstructions\s*\|\|\s*['"]?['"]?\}?)/g;
  result = result.replace(preInstructionsWithDefaultPattern, () => {
    return workItem.preInstructions || "";
  });

  const descriptionTernaryPattern =
    /\$?(?:\{?workItem\.description\s*\?\s*`([^`]*)\$?(?:\{?workItem\.description\}?)([^`]*)`\s*:\s*''\}?)/g;
  result = result.replace(
    descriptionTernaryPattern,
    (_match, prefix, suffix) =>
      workItem.description ? `${prefix}${workItem.description}${suffix}` : ""
  );

  const acceptanceTernaryPattern =
    /\$?(?:\{?workItem\.acceptanceCriteria\s*\?\s*`([^`]*)\$?(?:\{?workItem\.acceptanceCriteria\}?)([^`]*)`\s*:\s*''\}?)/g;
  result = result.replace(acceptanceTernaryPattern, (_match, prefix, suffix) =>
    workItem.acceptanceCriteria
      ? `${prefix}${workItem.acceptanceCriteria}${suffix}`
      : ""
  );

  const genericTernaryPattern =
    /\$?(?:\{?workItem\.(\w+)\s*\?\s*`([^`]*)\$?(?:\{?workItem\.\1\}?)([^`]*)`\s*:\s*''\}?)/g;
  result = result.replace(
    genericTernaryPattern,
    (_match, prop, prefix, suffix) => {
      const value = workItem[prop as keyof typeof workItem];
      return value ? `${prefix}${value}${suffix}` : "";
    }
  );

  result = result.replace(
    /\$?(?:\{?workItem\.title\}?)/g,
    workItem.title || ""
  );
  result = result.replace(
    /\$?(?:\{?workItem\.description\}?)/g,
    workItem.description || ""
  );
  result = result.replace(
    /\$?(?:\{?workItem\.acceptanceCriteria\}?)/g,
    workItem.acceptanceCriteria || ""
  );
  result = result.replace(/\$?(?:\{?workItem\.id\}?)/g, workItem.id || "");
  result = result.replace(
    /\$?(?:\{?workItem\.workItemType\}?)/g,
    workItem.workItemType || ""
  );
  result = result.replace(
    /\$?(?:\{?workItem\.type\}?)/g,
    workItem.workItemType || ""
  );
  result = result.replace(
    /\$?(?:\{?workItem\.project\}?)/g,
    workItem.project || ""
  );
  result = result.replace(/\$?(?:\{?workItem\.mode\}?)/g, workItem.mode || "");
  result = result.replace(
    /\$?(?:\{?workItem\.preInstructions\}?)/g,
    workItem.preInstructions || ""
  );
  result = result.replace(
    /\$?(?:\{?workItem\.repositoryUrl\}?)/g,
    workItem.repositoryUrl || ""
  );
  result = result.replace(
    /\$?(?:\{?workItem\.branchName\}?)/g,
    workItem.branchName || ""
  );
  result = result.replace(
    /\$?(?:\{?workItem\.defaultBranch\}?)/g,
    workItem.defaultBranch || ""
  );
  result = result.replace(
    /\$?(?:\{?workItem\.chatMessages\}?)/g,
    workItem.chatMessages || "[]"
  );
  result = result.replace(
    /\$?(?:\{?workItem\.sessionId\}?)/g,
    workItem.sessionId || ""
  );

  return result;
}

export function replaceStepResultsExpressions(
  text: string,
  stepResults: StepResultData[]
): string {
  let result = text;

  const stepResultsMap = new Map<string, string>();
  for (const sr of stepResults) {
    if (sr.result) {
      stepResultsMap.set(sr.stepId, sr.result);
    }
  }

  const stepResultWithFallbackPattern =
    /\$?(?:\{?stepResults\.(\w+)(?:\?\.)?\.?result\s*\|\|\s*['"]([^'"]+)['"]\}?)/g;
  result = result.replace(
    stepResultWithFallbackPattern,
    (_match, stepId, fallback) => {
      const stepResult = stepResultsMap.get(stepId);
      return stepResult || fallback || "";
    }
  );

  const stepResultPattern =
    /\$?(?:\{?stepResults\.(\w+)(?:\?\.)?\.?result\}?)/g;
  result = result.replace(stepResultPattern, (_match, stepId) => {
    const stepResult = stepResultsMap.get(stepId);
    return stepResult || "";
  });

  const workItemModePattern =
    /\$?(?:\{?workItem\.mode\s*\|\|\s*['"]([^'"]+)['"]\}?)/g;
  result = result.replace(workItemModePattern, (_match, defaultValue) => {
    return defaultValue || "investigate";
  });

  return result;
}

export function cleanupInstruction(text: string): string {
  let result = text;

  result = result.replace(/\$?(?:\{[^}]+\})/g, "");
  result = result.replace(/\bundefined\b/g, "");
  result = result.replace(/\bnull\b/g, "");
  result = result.replace(/\n{3,}/g, "\n\n");
  result = result.trim();

  return result;
}

export function generateAgentDryRunReport(
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
  const maxInstructionLength = 1500;
  if (instruction.length > maxInstructionLength) {
    lines.push(instruction.substring(0, maxInstructionLength));
    lines.push(
      `\\n... [truncated, ${instruction.length - maxInstructionLength} more characters]`
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
