import { execSync, spawn } from "node:child_process";
import type { ChangesSummary } from "@openfarm/core/types/adapters";
import { err, ok, type Result } from "@openfarm/result";
import type { ClaudeCodeProcessConfig, ClaudeCodeStreamEvent } from "./types";

// Constants for validation limits
const DOCKER_CONTAINER_NAME_MAX_LENGTH = 255;
const K8S_POD_NAME_MAX_LENGTH = 63;
const K8S_NAMESPACE_MAX_LENGTH = 253;

/**
 * Validates Docker container name against Docker's naming rules
 */
function validateContainerName(containerName: string): string {
  if (!containerName || typeof containerName !== "string") {
    throw new Error("Container name must be a non-empty string");
  }

  const dockerNameRegex = /^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/;
  if (!dockerNameRegex.test(containerName)) {
    throw new Error(
      `Invalid container name: ${containerName}. Container names must start with alphanumeric and can only contain alphanumeric, underscore, period, and hyphen characters.`
    );
  }

  if (containerName.length > DOCKER_CONTAINER_NAME_MAX_LENGTH) {
    throw new Error(
      `Container name exceeds maximum length of ${DOCKER_CONTAINER_NAME_MAX_LENGTH} characters`
    );
  }

  return containerName;
}

/**
 * Validates Kubernetes Pod name against RFC 1123 subdomain rules
 */
function validatePodName(podName: string): string {
  if (!podName || typeof podName !== "string") {
    throw new Error("Pod name must be a non-empty string");
  }

  const k8sNameRegex = /^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/;
  if (!k8sNameRegex.test(podName)) {
    throw new Error(
      `Invalid pod name: ${podName}. Pod names must be lowercase, start and end with alphanumeric characters, and can only contain lowercase letters, numbers, and hyphens.`
    );
  }

  if (podName.length > K8S_POD_NAME_MAX_LENGTH) {
    throw new Error(
      `Pod name exceeds maximum length of ${K8S_POD_NAME_MAX_LENGTH} characters`
    );
  }

  return podName;
}

/**
 * Validates Kubernetes namespace name against RFC 1123 subdomain rules
 */
function validateNamespace(namespace: string): string {
  if (!namespace || typeof namespace !== "string") {
    throw new Error("Namespace must be a non-empty string");
  }

  const k8sNameRegex = /^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/;
  if (!k8sNameRegex.test(namespace)) {
    throw new Error(
      `Invalid namespace: ${namespace}. Namespace names must be lowercase, start and end with alphanumeric characters, and can only contain lowercase letters, numbers, and hyphens.`
    );
  }

  if (namespace.length > K8S_NAMESPACE_MAX_LENGTH) {
    throw new Error(
      `Namespace exceeds maximum length of ${K8S_NAMESPACE_MAX_LENGTH} characters`
    );
  }

  return namespace;
}

/**
 * Finds the claude-code container by trying multiple possible names.
 */
function findClaudeCodeContainer(): string | null {
  const possibleNames = [
    process.env.CLAUDE_CODE_CONTAINER_NAME,
    "minions-farm-claude-code-1",
    "claude-code-1",
    "minions-farm_claude-code_1",
    "claude-code",
  ].filter(Boolean) as string[];

  for (const name of possibleNames) {
    try {
      execSync(`docker inspect ${name}`, {
        encoding: "utf-8",
        stdio: "ignore",
      });
      return name;
    } catch {
      // Continue to next name
    }
  }

  // Try to find any container with "claude-code" in the name
  try {
    const cmd = `docker ps --filter "name=claude-code" --format "{{.Names}}"`;
    const output = execSync(cmd, { encoding: "utf-8" }).toString().trim();
    const names = output.split("\n").filter(Boolean);
    const firstName = names[0];
    if (firstName) {
      return firstName;
    }
  } catch {
    // Ignore errors
  }

  return null;
}

/**
 * Detects the Docker network to use for ephemeral containers.
 */
function detectDockerNetwork(): string | null {
  if (process.env.CLAUDE_CODE_NETWORK) {
    return process.env.CLAUDE_CODE_NETWORK;
  }

  if (process.env.SWARM_NETWORK) {
    return process.env.SWARM_NETWORK;
  }

  try {
    const hostname = process.env.HOSTNAME;
    if (hostname) {
      const cmd = `docker inspect ${hostname} --format '{{range $key, $value := .NetworkSettings.Networks}}{{$key}}{{end}}'`;
      const output = execSync(cmd, { encoding: "utf-8" }).toString().trim();
      if (output) {
        const networks = output.split(/\s+/).filter(Boolean);
        const firstNetwork = networks[0];
        if (firstNetwork) {
          return firstNetwork;
        }
      }
    }
  } catch {
    // Not running in Docker or can't inspect, continue
  }

  const claudeCodeContainer = findClaudeCodeContainer();
  if (claudeCodeContainer) {
    try {
      const cmd = `docker inspect ${claudeCodeContainer} --format '{{range $key, $value := .NetworkSettings.Networks}}{{$key}}{{end}}'`;
      const output = execSync(cmd, { encoding: "utf-8" }).toString().trim();
      if (output) {
        const networks = output.split(/\s+/).filter(Boolean);
        const firstNetwork = networks[0];
        if (firstNetwork) {
          return firstNetwork;
        }
      }
    } catch {
      // Ignore errors
    }
  }

  if (process.env.COMPOSE_PROJECT_NAME) {
    const composeNetwork = `${process.env.COMPOSE_PROJECT_NAME}_default`;
    try {
      execSync(`docker network inspect ${composeNetwork}`, { stdio: "ignore" });
      return composeNetwork;
    } catch {
      // Network doesn't exist, continue
    }
  }

  const defaultNetworks = [
    "minions-network",
    "minions_farm_default",
    "minions-farm_default",
  ];
  for (const networkName of defaultNetworks) {
    try {
      execSync(`docker network inspect ${networkName}`, { stdio: "ignore" });
      return networkName;
    } catch {
      // Network doesn't exist, continue
    }
  }

  return null;
}

/**
 * Builds Claude Code command arguments (shared between Docker and Kubernetes).
 */
function buildClaudeCodeCommandArgs(
  config: ClaudeCodeProcessConfig,
  instruction: string,
  _claudeCodeRepoPath: string
): string[] {
  // Use custom command if provided, otherwise default to 'claude'
  const customCommand = process.env.CLAUDE_CODE_COMMAND;

  let args: string[] = [];

  if (customCommand) {
    // Split the custom command into arguments (e.g., "npx -y @anthropic-ai/claude-code")
    args = customCommand.split(/\s+/).filter(Boolean);
  } else {
    // Default: try 'claude' directly using absolute path for robustness in containers
    args = ["/usr/local/bin/claude"];
  }

  // Use configurable max turns with fallback to env var or default
  const maxTurns = config.maxTurns || process.env.CLAUDE_MAX_TURNS || "50";

  args.push(
    "-p", // Print mode (non-interactive)
    instruction,
    "--verbose", // Required when using print mode with stream-json output
    "--output-format",
    "stream-json", // JSON streaming for parsing
    "--max-turns",
    String(maxTurns) // Configurable limit
  );

  // Add model if specified
  if (config.model) {
    args.push("--model", config.model);
  }

  // Add max tokens
  if (config.maxTokens) {
    args.push("--max-tokens", String(config.maxTokens));
  }

  // Add allowed tools if specified
  if (config.allowedTools && config.allowedTools.length > 0) {
    args.push("--allowedTools", config.allowedTools.join(","));
  }

  // Add disallowed tools if specified
  if (config.disallowedTools && config.disallowedTools.length > 0) {
    args.push("--disallowedTools", config.disallowedTools.join(","));
  }

  return args;
}

/**
 * Builds Docker arguments for running Claude Code.
 */
export function buildDockerArgs(
  config: ClaudeCodeProcessConfig,
  instruction: string,
  claudeCodeRepoPath: string
): string[] {
  const containerName =
    config.containerName ||
    process.env.CLAUDE_CODE_CONTAINER_NAME ||
    "minions-farm-claude-code-1";

  const claudeCodeArgs = buildClaudeCodeCommandArgs(
    config,
    instruction,
    claudeCodeRepoPath
  );

  if (config.ephemeral) {
    // Docker Run mode (Ephemeral)
    const imageName =
      process.env.CLAUDE_CODE_IMAGE_NAME || "minions-farm/claude-code:latest";

    const dockerRunArgs = [
      "run",
      "--rm",
      "-i",
      "-v",
      "repos-data:/tmp/minions-repos",
      "-v",
      "repos-data:/workspace",
      "-e",
      "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1",
    ];

    // Configure API authentication and settings
    // Priority: config.apiKey > ANTHROPIC_API_KEY > Z_AI_API_KEY
    const apiKey =
      config.apiKey ||
      process.env.ANTHROPIC_API_KEY ||
      process.env.Z_AI_API_KEY ||
      "";
    const baseUrl =
      config.apiBaseUrl ||
      process.env.ANTHROPIC_BASE_URL ||
      (process.env.Z_AI_API_KEY ? "https://api.z.ai/api/anthropic" : undefined);
    // Default timeout: 5 minutes (300000ms), configurable via config or env var
    const apiTimeout =
      config.apiTimeout || process.env.API_TIMEOUT_MS || "300000";

    dockerRunArgs.push("-e", `ANTHROPIC_API_KEY=${apiKey}`);

    if (baseUrl) {
      dockerRunArgs.push("-e", `ANTHROPIC_BASE_URL=${baseUrl}`);
    }

    dockerRunArgs.push("-e", `API_TIMEOUT_MS=${apiTimeout}`);

    const detectedNetwork = detectDockerNetwork();
    if (detectedNetwork) {
      dockerRunArgs.push("--network", detectedNetwork);
    }

    dockerRunArgs.push(imageName);
    dockerRunArgs.push(...claudeCodeArgs);

    return dockerRunArgs;
  }

  // Docker exec mode
  const validatedContainerName = validateContainerName(containerName);
  const dockerArgs = ["exec", validatedContainerName, ...claudeCodeArgs];

  return dockerArgs;
}

/**
 * Builds kubectl exec arguments for running Claude Code in a Kubernetes Pod.
 */
export function buildKubectlClaudeCodeArgs(
  config: ClaudeCodeProcessConfig,
  instruction: string,
  claudeCodeRepoPath: string
): string[] {
  if (!config.podName) {
    throw new Error("podName is required for buildKubectlClaudeCodeArgs");
  }
  const podName = validatePodName(config.podName);
  const namespace = validateNamespace(config.namespace || "minions-farm");

  const claudeCodeCommandArgs = buildClaudeCodeCommandArgs(
    config,
    instruction,
    claudeCodeRepoPath
  );

  const kubectlArgs = [
    "exec",
    podName,
    "-n",
    namespace,
    "-c",
    "claude-code",
    "--",
    ...claudeCodeCommandArgs,
  ];

  return kubectlArgs;
}

/**
 * Executes Claude Code CLI to apply code changes.
 *
 * @param config - Configuration for the process
 * @param instruction - The instruction/prompt for Claude
 * @param repoPath - Local repository path
 * @param contextFiles - Optional files to include in context
 * @returns Result containing changes summary
 */
export async function executeClaudeCodeProcess(
  config: ClaudeCodeProcessConfig,
  instruction: string,
  repoPath: string,
  contextFiles: string[] = []
): Promise<Result<ChangesSummary>> {
  const {
    model = process.env.CLAUDE_DEFAULT_MODEL || "claude-sonnet-4-5-20250929",
    previewMode = false,
    onLog,
    onChanges,
  } = config;

  const log = async (msg: string) => {
    if (onLog) {
      await onLog(msg);
    }
  };

  const repoName = repoPath.split(/[\\/]/).pop() || "repo";
  const claudeCodeRepoPath = `/workspace/${repoName}`;

  await log(`[Claude Code] Starting execution in ${repoPath}`);
  await log(`[Claude Code] Model: ${model}`);
  await log(`[Claude Code] Preview mode: ${previewMode}`);

  // Preventive validation: Check if claude command is available
  const customCommand = process.env.CLAUDE_CODE_COMMAND;
  if (!customCommand) {
    try {
      execSync("which claude", { stdio: "ignore" });
    } catch {
      await log(
        "[Claude Code] WARNING: 'claude' command not found in PATH. " +
          "Set CLAUDE_CODE_COMMAND='npx -y @anthropic-ai/claude-code' to use npx, " +
          "or ensure Claude Code CLI is installed in the container."
      );
    }
  }

  // Determine if we're using Kubernetes Pod or Docker container
  const useKubernetes = !!config.podName;

  // Check if container exists before using docker exec mode
  let shouldUseEphemeral = config.ephemeral;
  if (!(useKubernetes || shouldUseEphemeral)) {
    const foundContainer = findClaudeCodeContainer();

    if (foundContainer) {
      config.containerName = foundContainer;
      shouldUseEphemeral = false;
      await log(`Found claude-code container: ${foundContainer}`);
    } else {
      const attemptedName =
        config.containerName ||
        process.env.CLAUDE_CODE_CONTAINER_NAME ||
        "minions-farm-claude-code-1";
      await log(
        `Container '${attemptedName}' not found. Using ephemeral mode (docker run) instead.`
      );
      shouldUseEphemeral = true;
    }
  }

  // Build command arguments (Docker or kubectl)
  const finalConfig = { ...config, ephemeral: shouldUseEphemeral };
  const claudeCodeArgs = useKubernetes
    ? buildKubectlClaudeCodeArgs(finalConfig, instruction, claudeCodeRepoPath)
    : buildDockerArgs(finalConfig, instruction, claudeCodeRepoPath);

  // Add context files to command args if not using container execution
  // For container execution, files should already be in the container
  if (!(useKubernetes || shouldUseEphemeral) && contextFiles.length > 0) {
    // In exec mode, we can't easily add files, so we log a warning
    await log(
      "[Claude Code] Note: Context files specified but using container exec mode. Files should be available in container."
    );
  }

  const command = useKubernetes ? "kubectl" : "docker";
  await log(
    `Running Claude Code (${model}) on ${claudeCodeRepoPath} using ${useKubernetes ? "Kubernetes Pod" : "Docker container"}`
  );

  return new Promise((resolve) => {
    const filesModified: string[] = [];
    const filesCreated: string[] = [];
    const filesDeleted: string[] = [];
    let summary = "";
    let totalCost = 0;
    let _rawOutput = "";
    let hasError = false;
    let errorMessage = "";

    const proc = spawn(command, claudeCodeArgs, {
      stdio: ["pipe", "pipe", "pipe"],
      env: {
        ...process.env,
        CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: "1",
        COLUMNS: "200",
      },
    });

    // Handle stdout (JSON stream)
    let stdoutBuffer = "";
    proc.stdout.on("data", async (data: Buffer) => {
      stdoutBuffer += data.toString();
      const lines = stdoutBuffer.split("\n");
      // Keep the last partial line in the buffer
      stdoutBuffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.trim()) {
          continue;
        }

        _rawOutput += `${line}\n`;

        // Log to server console for debugging
        console.log(`[Claude Code] ${line}`);

        try {
          const event: ClaudeCodeStreamEvent = JSON.parse(line);

          // Send the complete JSON event to the UI for rich rendering
          await log(`[Claude Code] ${line}`);

          await handleStreamEvent(event, {
            filesModified,
            filesCreated,
            filesDeleted,
            onLog: log,
            onSummary: (s) => {
              summary = s;
            },
            onCost: (c) => {
              totalCost += c;
            },
            onError: (e) => {
              hasError = true;
              errorMessage = e;
            },
          });
        } catch {
          // Not JSON, just log as step log
          await log(`[Claude Code] ${line}`);
        }
      }
    });

    // Handle stderr
    proc.stderr.on("data", async (data: Buffer) => {
      const msg = data.toString().trim();
      if (msg) {
        await log(`[Claude Code Error] ${msg}`);
        if (!hasError) {
          hasError = true;
          errorMessage = msg;
        }
      }
    });

    // Handle process exit
    proc.on("close", async (code) => {
      await log(`[Claude Code] Process exited with code ${code}`);

      if (code !== 0 && !previewMode) {
        let errorHint = "";
        if (code === 127) {
          errorHint =
            "\nHint: The 'claude' command was not found. Please ensure Claude Code is installed in the container or set CLAUDE_CODE_COMMAND environment variable to 'npx -y @anthropic-ai/claude-code'.";
        }
        resolve(
          err(
            new Error(
              (errorMessage || `Claude Code exited with code ${code}`) +
                errorHint
            )
          )
        );
        return;
      }

      const changes: ChangesSummary = {
        filesModified,
        filesCreated,
        filesDeleted,
        summary: summary || "Changes applied by Claude Code",
        totalCost,
      };

      if (onChanges) {
        await onChanges(changes);
      }

      await log(
        `[Claude Code] Completed. Modified: ${filesModified.length}, Created: ${filesCreated.length}, Deleted: ${filesDeleted.length}`
      );

      if (totalCost > 0) {
        await log(`[Claude Code] Total cost: $${totalCost.toFixed(4)}`);
      }

      resolve(ok(changes));
    });

    // Handle process error (e.g., command not found)
    proc.on("error", async (error) => {
      await log(`[Claude Code] Process error: ${error.message}`);

      if (error.message.includes("ENOENT")) {
        resolve(
          err(
            new Error(
              useKubernetes
                ? "kubectl command not found. Please ensure kubectl is installed and configured."
                : "docker command not found. Please ensure Docker is installed and running."
            )
          )
        );
      } else {
        resolve(err(error));
      }
    });
  });
}

/**
 * Handle a streaming event from Claude Code CLI
 */
async function handleStreamEvent(
  event: ClaudeCodeStreamEvent,
  handlers: {
    filesModified: string[];
    filesCreated: string[];
    filesDeleted: string[];
    onLog: (msg: string) => Promise<void>;
    onSummary: (s: string) => void;
    onCost: (c: number) => void;
    onError: (e: string) => void;
  }
): Promise<void> {
  const { filesModified, filesCreated, onLog, onSummary, onCost, onError } =
    handlers;

  switch (event.type) {
    case "assistant":
      if (event.message) {
        await onLog(
          `[Claude] ${event.message.slice(0, 200)}${event.message.length > 200 ? "..." : ""}`
        );
      }
      break;

    case "tool_use":
      await onLog(`[Claude Tool] ${event.tool_name}`);

      // Track file operations
      if (event.tool_name === "Write" && event.tool_input?.file_path) {
        const filePath = String(event.tool_input.file_path);
        if (
          !(filesModified.includes(filePath) || filesCreated.includes(filePath))
        ) {
          filesModified.push(filePath);
        }
      }

      if (event.tool_name === "Edit" && event.tool_input?.file_path) {
        const filePath = String(event.tool_input.file_path);
        if (!filesModified.includes(filePath)) {
          filesModified.push(filePath);
        }
      }
      break;

    case "tool_result":
      if (event.is_error) {
        await onLog(`[Claude Tool Error] ${event.tool_result}`);
      }
      break;

    case "result":
      if (event.message) {
        onSummary(event.message);
      }
      if (event.cost_usd) {
        onCost(event.cost_usd);
      }
      break;

    case "error":
      if (event.message) {
        onError(event.message);
        await onLog(`[Claude Error] ${event.message}`);
      }
      break;

    case "system":
      // System messages - usually session info
      break;

    default:
      // Unknown event type
      break;
  }
}
