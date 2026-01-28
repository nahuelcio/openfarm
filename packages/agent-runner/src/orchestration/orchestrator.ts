/**
 * Generic orchestration interface for task execution
 * Implementations: Local, Kubernetes, Docker, AWS ECS, etc.
 */

import type { Result } from "@openfarm/result";

/**
 * Generic workspace provision configuration
 * Used by any orchestrator implementation
 */
export interface WorkspaceProvisionConfig {
  workspaceId: string;
  taskId: string;
  repositoryUrl: string;
  authenticatedRepoUrl?: string;
  environment?: Record<string, string>;
}

/**
 * Options for command execution in workspace
 */
export interface ExecuteOptions {
  cwd?: string;
  env?: Record<string, string>;
  timeout?: number;
}

/**
 * Result of command execution
 */
export interface ExecuteResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

/**
 * Workspace information returned by orchestrator
 */
export interface WorkspaceInfo {
  id: string;
  type: "local" | "k8s" | "docker" | "container";
  workingDirectory: string;
  metadata?: Record<string, string>;
}

/**
 * Generic orchestrator interface for task execution
 * Any implementation (K8s, Docker, Local) must implement this
 */
export interface Orchestrator {
  /**
   * Provision a workspace for task execution
   * @param config - Workspace configuration
   * @returns Result with workspace information
   */
  provision(config: WorkspaceProvisionConfig): Promise<Result<WorkspaceInfo>>;

  /**
   * Execute a command in the workspace
   * @param command - Command to execute (array of strings)
   * @param options - Execution options
   * @returns Result with command output
   */
  execute(
    command: string[],
    options?: ExecuteOptions
  ): Promise<Result<ExecuteResult>>;

  /**
   * Cleanup workspace
   * @param workspaceId - Workspace ID to destroy
   * @returns Result indicating success or failure
   */
  destroy(workspaceId: string): Promise<Result<void>>;

  /**
   * Check if workspace is active
   * @param workspaceId - Workspace ID to check
   * @returns Result with boolean indicating if workspace is active
   */
  isActive(workspaceId: string): Promise<Result<boolean>>;
}
