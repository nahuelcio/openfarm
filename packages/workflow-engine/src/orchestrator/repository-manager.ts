/**
 * Repository Manager
 *
 * Handles repository authentication, setup, worktree creation, and Kubernetes detection.
 * Creates complete WorkflowContext for step execution.
 *
 * Framework-agnostic: abstracts platform operations through injected interfaces
 */

import type { WorkflowContext } from "@openfarm/agent-runner";
import {
  authenticateRepository,
  createWorktree,
  defaultFileSystem,
  ensureMainRepo,
} from "@openfarm/agent-runner";
import type { AgentConfiguration, Workflow } from "@openfarm/core";
import { getDb, getIntegrations } from "@openfarm/core/db";
import { v4 as uuidv4 } from "uuid";
import type { WorkflowLogger } from "../types";
import type { ContextSetupResult } from "./context-resolver";

export interface RepositorySetupResult {
  repoPath: string;
  worktreePath?: string;
  podName?: string;
  platformAdapter?: unknown;
  executionId: string;
  context: WorkflowContext;
}

/**
 * Setup repository for workflow execution
 *
 * Handles:
 * - Repository authentication (GitHub token or Azure PAT)
 * - Repository cloning/updating (via ensureMainRepo)
 * - Worktree creation for isolated work (or branch checkout for read-only)
 * - Kubernetes pod detection (if KUBECONFIG or ENABLE_KUBERNETES set)
 * - WorkflowContext creation with all dependencies for step execution
 *
 * Note: Does NOT handle DB writes or event emission (those are server concerns)
 *
 * @param contextSetupResult - Resolved workflow and workItem from ContextResolver
 * @param workflow - Workflow definition
 * @param workItemId - Work item identifier
 * @param jobId - Job identifier for logging
 * @param agentConfig - Agent configuration
 * @param logger - Logger for progress tracking
 * @param providedExecutionId - Optional pre-generated execution ID
 */
export async function setupRepository(
  contextSetupResult: ContextSetupResult,
  workflow: Workflow,
  workItemId: string,
  jobId: string,
  agentConfig: AgentConfiguration,
  logger: WorkflowLogger,
  providedExecutionId?: string
): Promise<RepositorySetupResult> {
  const db = await getDb();
  const {
    workItem,
    agentConfiguration,
    resolvedWorkflowVariables,
    branchName,
  } = contextSetupResult;

  // Authenticate repository
  const integrations = await getIntegrations(db as any);

  // TODO: We need to get the base AgentConfig (with workDir) from somewhere
  // For now, using a default workDir and creating a base config
  const baseAgentConfig = {
    workDir: process.env.WORK_DIR || "/tmp/minions-work",
    copilotToken: process.env.GITHUB_TOKEN || "",
    azureOrgUrl: "",
    azureProject: "",
    azurePat: process.env.AZURE_PAT || "",
    gitUserName: agentConfig.id || "Minion",
    gitUserEmail: "minion@minions.farm",
  };

  const authResult = await authenticateRepository(
    workItem,
    integrations,
    baseAgentConfig,
    (msg: string) => logger.info(msg)
  );

  if (!authResult.ok) {
    throw new Error(
      `Repository authentication failed: ${authResult.error.message}`
    );
  }

  const { authenticatedUrl, platformAdapter } = authResult.value;

  // Determine if workflow is read-only (no git modifications)
  const isReadOnly = !workflow.steps.some(
    (s) =>
      s.action &&
      ["git.branch", "git.commit", "git.push", "platform.create_pr"].includes(
        s.action
      )
  );

  // Prepare repository paths
  const repoName =
    workItem.repositoryUrl?.split("/").pop()?.replace(".git", "") ||
    `repo-${workItem.id}`;
  const mainRepoPath = `${baseAgentConfig.workDir}/${repoName}`;

  // Setup exec function for shell commands
  const { execFile } = await import("node:child_process");
  const { promisify } = await import("node:util");
  const execFileAsync = promisify(execFile);

  const execFn = async (
    file: string,
    args: string[],
    opts?: { cwd?: string }
  ) => {
    const result = await execFileAsync(file, args, opts);
    const stdout = result.stdout
      ? Buffer.isBuffer(result.stdout)
        ? result.stdout.toString()
        : String(result.stdout)
      : "";
    const stderr = result.stderr
      ? Buffer.isBuffer(result.stderr)
        ? result.stderr.toString()
        : String(result.stderr)
      : "";
    return { stdout, stderr };
  };

  // Check for active Kubernetes pod
  // NOTE: Kubernetes integration is disabled until @openfarm/orchestration package is properly set up
  const hasActivePod = false;
  const podName: string | undefined = undefined;

  // Initialize paths
  let repoPath = mainRepoPath;
  let worktreePath: string | undefined;

  // Setup repository and worktree
  if (hasActivePod) {
    // In pod: repos are inside the pod, not on host
    await logger.info(
      `Using active pod for execution (${podName}), repos are inside pod`
    );
    repoPath = `/workspace/${repoName}`;
  } else {
    // On host: ensure repo exists and setup worktree/branch
    await ensureMainRepo(
      mainRepoPath,
      authenticatedUrl,
      baseAgentConfig,
      defaultFileSystem,
      execFn
    );

    if (isReadOnly) {
      // Read-only: checkout branch in main repo
      await logger.info(
        `Checking out branch '${branchName}' for read-only access`
      );
      try {
        await execFn("git", [
          "-C",
          mainRepoPath,
          "fetch",
          "origin",
          branchName,
        ]).catch(() => {
          logger.debug(
            `Branch '${branchName}' not in remote, trying local checkout`
          );
        });

        await execFn("git", ["-C", mainRepoPath, "checkout", branchName]).catch(
          async (error) => {
            const errorMsg =
              error instanceof Error ? error.message : String(error);
            if (errorMsg.includes("did not match any file")) {
              // Try to create tracking branch
              await execFn("git", [
                "-C",
                mainRepoPath,
                "checkout",
                "-b",
                branchName,
                `origin/${branchName}`,
              ]).catch(() => {
                logger.debug(
                  `Could not checkout branch '${branchName}', staying on current`
                );
              });
            } else {
              logger.debug(`Checkout warning: ${errorMsg}`);
            }
          }
        );
      } catch (error) {
        await logger.debug(
          `Branch checkout error: ${error instanceof Error ? error.message : String(error)}`
        );
      }
      repoPath = mainRepoPath;
    } else {
      // Write mode: create worktree for isolated work
      const wtPath = `${mainRepoPath}-wt-${workItem.id}`;
      const worktreeResult = await createWorktree(
        mainRepoPath,
        wtPath,
        branchName,
        jobId,
        (m: string) => logger.info(m),
        branchName,
        defaultFileSystem,
        execFn
      );

      if (!worktreeResult.ok) {
        throw new Error(
          `Worktree creation failed: ${worktreeResult.error.message}`
        );
      }
      repoPath = wtPath;
      worktreePath = wtPath;
    }
  }

  // Validate platform adapter
  const validPlatformAdapter =
    platformAdapter &&
    typeof platformAdapter.createPullRequest === "function" &&
    typeof platformAdapter.getName === "function"
      ? platformAdapter
      : undefined;

  if (validPlatformAdapter) {
    await logger.info(`Platform adapter: ${validPlatformAdapter.getName()}`);
  } else {
    await logger.debug("Platform adapter unavailable, will use fallback");
  }

  // Determine git token based on platform
  const isGitHub = workItem.repositoryUrl?.includes("github.com");
  const gitToken = isGitHub
    ? authResult.value.integration?.credentials ||
      baseAgentConfig.copilotToken ||
      process.env.GITHUB_TOKEN
    : baseAgentConfig.azurePat;

  // Create execution ID
  const executionId = providedExecutionId || uuidv4();

  // Build complete workflow context for step execution
  const context: WorkflowContext = {
    executionId,
    workflowId: workflow.id,
    workItemId,
    repoPath,
    repoUrl: workItem.repositoryUrl || "",
    worktreePath,
    podName,
    gitConfig: {
      repoPath,
      repoUrl: workItem.repositoryUrl || "",
      pat: gitToken,
      gitUserName: baseAgentConfig.gitUserName || "Minion",
      gitUserEmail: baseAgentConfig.gitUserEmail || "minion@minions.farm",
    },
    agentConfig: baseAgentConfig,
    agentConfiguration: agentConfiguration || undefined,
    jobId,
    defaultBranch: branchName,
    branchName,
    workItem,
    platformAdapter: validPlatformAdapter,
    workflowVariables: resolvedWorkflowVariables,
  };

  return {
    repoPath,
    worktreePath,
    podName,
    platformAdapter: validPlatformAdapter,
    executionId,
    context,
  };
}
