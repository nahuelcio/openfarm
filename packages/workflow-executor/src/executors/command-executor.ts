import { spawn } from "node:child_process";
import { StepAction } from "@openfarm/core/constants/actions";
import { err, ok, type Result } from "@openfarm/result";
import type { StepExecutionRequest, WorkflowContext } from "../types";
import { type CommandExecConfig, validateConfig } from "./validation";

// Constants for Kubernetes resource validation
const K8S_POD_NAME_MAX_LENGTH = 63; // Maximum length for Kubernetes pod names (RFC 1123)
const K8S_NAMESPACE_MAX_LENGTH = 253; // Maximum length for Kubernetes namespace names (RFC 1123)

/**
 * Generates a detailed dry run report for a command execution step.
 *
 * @param stepId - The step identifier
 * @param command - The command that would be executed
 * @param context - The workflow context
 * @returns Formatted dry run report
 */
function generateCommandDryRunReport(
  stepId: string,
  command: string,
  context: WorkflowContext
): string {
  const lines: string[] = [];

  lines.push("# Dry Run Report: Command Execution");
  lines.push("");
  lines.push("## Overview");
  lines.push("- **Mode**: Preview (command not executed)");
  lines.push(`- **Step ID**: ${stepId}`);
  lines.push(`- **Repository**: ${context.repoPath}`);
  lines.push(
    `- **Execution Environment**: ${context.podName ? `Kubernetes Pod (${context.podName})` : "Local"}`
  );
  lines.push("");

  lines.push("## Command Details");
  lines.push("");
  lines.push("```bash");
  lines.push(command);
  lines.push("```");
  lines.push("");

  // Analyze command for potential impact
  const analysis = analyzeCommand(command);

  lines.push("## Risk Assessment");
  lines.push(`- **Risk Level**: ${analysis.riskLevel}`);
  lines.push(`- **Type**: ${analysis.commandType}`);
  if (analysis.warnings.length > 0) {
    lines.push("- **Warnings**:");
    for (const warning of analysis.warnings) {
      lines.push(`  - WARNING: ${warning}`);
    }
  }
  lines.push("");

  if (analysis.affectedPaths.length > 0) {
    lines.push("## Potentially Affected Paths");
    for (const path of analysis.affectedPaths) {
      lines.push(`- ${path}`);
    }
    lines.push("");
  }

  lines.push("## What Would Happen");
  lines.push("");
  lines.push(`1. Command would be executed in: \`${context.repoPath}\``);
  if (context.podName) {
    lines.push(
      `2. Execution would occur inside Kubernetes pod: \`${context.podName}\``
    );
  }
  lines.push(
    `${context.podName ? "3" : "2"}. Output would be captured and logged`
  );
  lines.push(
    `${context.podName ? "4" : "3"}. Exit code would determine success/failure`
  );
  lines.push("");

  lines.push("---");
  lines.push("*This is a dry run preview. The command was not executed.*");

  return lines.join("\n");
}

/**
 * Analyzes a command to determine its type, risk level, and potential impact.
 */
function analyzeCommand(command: string): {
  commandType: string;
  riskLevel: "Low" | "Medium" | "High";
  warnings: string[];
  affectedPaths: string[];
} {
  const warnings: string[] = [];
  const affectedPaths: string[] = [];
  let riskLevel: "Low" | "Medium" | "High" = "Low";
  let commandType = "General";

  // Detect command type
  if (command.includes("git ")) {
    commandType = "Git Operation";
    if (command.includes("reset --hard") || command.includes("clean -f")) {
      riskLevel = "High";
      warnings.push("Destructive git operation detected");
    } else if (command.includes("push") || command.includes("commit")) {
      riskLevel = "Medium";
    }
  } else if (command.includes("rm ") || command.includes("del ")) {
    commandType = "File Deletion";
    riskLevel = "High";
    warnings.push("File deletion command detected");
  } else if (command.includes("npm ") || command.includes("bun ")) {
    commandType = "Package Manager";
    if (command.includes("install") || command.includes("add")) {
      riskLevel = "Medium";
      warnings.push(
        "Package installation may modify node_modules and lock files"
      );
    }
  } else if (
    command.includes("echo ") ||
    command.includes("test ") ||
    command.includes("grep ")
  ) {
    commandType = "Read-Only / Diagnostic";
    riskLevel = "Low";
  }

  // Extract paths that might be affected
  const pathMatches = command.match(/(?:^|\s)([./][^\s;|&]+)/g);
  if (pathMatches) {
    for (const match of pathMatches) {
      affectedPaths.push(match.trim());
    }
  }

  // Check for pipes and redirects
  if (command.includes(">") && !command.includes(">/dev/null")) {
    warnings.push(
      "Output redirection detected - may create or overwrite files"
    );
    if (riskLevel === "Low") {
      riskLevel = "Medium";
    }
  }

  // Check for sudo
  if (command.includes("sudo ")) {
    riskLevel = "High";
    warnings.push("Elevated privileges (sudo) detected");
  }

  return { commandType, riskLevel, warnings, affectedPaths };
}

/**
 * Validates Kubernetes Pod name against RFC 1123 subdomain rules
 * Kubernetes resource names must match: ^[a-z0-9]([-a-z0-9]*[a-z0-9])?$
 * Maximum length: 63 characters for pod names
 */
function validatePodName(podName: string): string {
  if (!podName || typeof podName !== "string") {
    throw new Error("Pod name must be a non-empty string");
  }

  // Kubernetes pod names must be lowercase and follow RFC 1123 subdomain rules
  const k8sNameRegex = /^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/;
  if (!k8sNameRegex.test(podName)) {
    throw new Error(
      `Invalid pod name: ${podName}. Pod names must be lowercase, start and end with alphanumeric characters, and can only contain lowercase letters, numbers, and hyphens.`
    );
  }

  // Kubernetes pod names have a maximum length of 63 characters
  if (podName.length > K8S_POD_NAME_MAX_LENGTH) {
    throw new Error(
      `Pod name exceeds maximum length of ${K8S_POD_NAME_MAX_LENGTH} characters`
    );
  }

  return podName;
}

/**
 * Validates Kubernetes namespace name against RFC 1123 subdomain rules
 * Kubernetes namespace names must match: ^[a-z0-9]([-a-z0-9]*[a-z0-9])?$
 * Maximum length: 253 characters
 */
function validateNamespace(namespace: string): string {
  if (!namespace || typeof namespace !== "string") {
    throw new Error("Namespace must be a non-empty string");
  }

  // Kubernetes namespace names must be lowercase and follow RFC 1123 subdomain rules
  const k8sNameRegex = /^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/;
  if (!k8sNameRegex.test(namespace)) {
    throw new Error(
      `Invalid namespace: ${namespace}. Namespace names must be lowercase, start and end with alphanumeric characters, and can only contain lowercase letters, numbers, and hyphens.`
    );
  }

  // Kubernetes namespace names have a maximum length of 253 characters
  if (namespace.length > K8S_NAMESPACE_MAX_LENGTH) {
    throw new Error(
      `Namespace exceeds maximum length of ${K8S_NAMESPACE_MAX_LENGTH} characters`
    );
  }

  return namespace;
}

/**
 * Executes command.exec action.
 * This function performs I/O operations (executes system commands) but receives all dependencies explicitly,
 * making it testable through dependency injection. The function is deterministic given the same inputs.
 *
 * @param request - Step execution request containing step, context, logger, flags, and services
 * @returns Result with command output
 *
 * @example
 * ```typescript
 * const request: StepExecutionRequest = {
 *   step,
 *   context,
 *   logger: log,
 *   flags: { previewMode: false },
 *   services: { execAsync }
 * };
 * const result = await executeCommandAction(request);
 * ```
 */
export async function executeCommandAction(
  request: StepExecutionRequest
): Promise<Result<string>> {
  const { step, context, logger, flags, services } = request;
  const { action, config } = step;

  if (action !== StepAction.COMMAND_EXEC) {
    return err(new Error(`Unknown command action: ${action}`));
  }

  // execAsync is only required when not using Kubernetes Pod
  // We'll check this conditionally below

  const validation = validateConfig<CommandExecConfig>(
    StepAction.COMMAND_EXEC,
    config
  );
  if (!validation.ok) {
    return validation;
  }
  const validatedConfig = validation.value;

  const cmd = validatedConfig.cmd;

  if (flags.previewMode) {
    const dryRunReport = generateCommandDryRunReport(step.id, cmd, context);
    await logger("[Dry Run] Command step - preview generated");
    return ok(dryRunReport);
  }

  await logger(`Executing command: ${cmd}`);

  // If using Kubernetes Pod, execute command inside the Pod
  if (context.podName) {
    return executeCommandInPod(
      { podName: context.podName, repoPath: context.repoPath },
      cmd,
      logger
    );
  }

  // Otherwise, use local execution (backward compatibility)
  try {
    if (!services.execAsync) {
      return err(
        new Error("execAsync service is required for local command execution")
      );
    }

    const { stdout, stderr } = await services.execAsync(cmd, [], {
      cwd: context.repoPath,
    });

    if (stderr) {
      await logger(`Command stderr: ${stderr}`);
    }

    await logger(`Command output: ${stdout}`);
    return ok(stdout.trim() || "Command executed successfully");
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return err(new Error(`Command failed: ${errorMsg}`));
  }
}

/**
 * Executes a command inside a Kubernetes Pod using kubectl exec.
 *
 * @param context - Workflow context containing podName
 * @param cmd - Command to execute
 * @param logger - Logger function
 * @returns Result with command output
 */
async function executeCommandInPod(
  context: { podName: string; repoPath?: string },
  cmd: string,
  logger: (message: string) => Promise<void>
): Promise<Result<string>> {
  if (!context.podName) {
    return err(new Error("podName is required for Pod command execution"));
  }

  // Validate podName and namespace to prevent command injection
  const podName = validatePodName(context.podName);
  // Use default namespace (minions-farm) - can be enhanced to pass namespace from context if needed
  const namespace = validateNamespace("minions-farm");

  await logger(`Executing in Pod ${podName}: ${cmd}`);

  return new Promise((resolve) => {
    // Use sh -c to properly handle commands with quotes, spaces, and special characters
    // This is safer than trying to parse shell commands manually
    const kubectlArgs = [
      "exec",
      podName,
      "-n",
      namespace,
      "-c",
      "claude-code",
      "--",
      "sh",
      "-c",
      cmd.trim(),
    ];

    const kubectlProcess = spawn("kubectl", kubectlArgs);

    let stdout = "";
    let stderr = "";

    kubectlProcess.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    kubectlProcess.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    kubectlProcess.on("close", async (code) => {
      if (stderr) {
        await logger(`Command stderr: ${stderr}`);
      }

      await logger(`Command output: ${stdout}`);

      if (code === 0) {
        resolve(ok(stdout.trim() || "Command executed successfully"));
      } else {
        resolve(
          err(
            new Error(
              `Command failed with exit code ${code}: ${stderr || stdout}`
            )
          )
        );
      }
    });

    kubectlProcess.on("error", async (error) => {
      await logger(`Failed to execute kubectl: ${error.message}`);
      resolve(err(new Error(`Failed to execute kubectl: ${error.message}`)));
    });
  });
}
