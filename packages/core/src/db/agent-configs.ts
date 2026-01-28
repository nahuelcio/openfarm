// Use any type to avoid importing from bun during bundling
type SQL = any;

import { err, ok, type Result } from "@openfarm/result";
import type { AgentConfiguration } from "../types";
import { parseJson, toJson } from "./utils";

/**
 * Retrieves all agent configurations from the database.
 * This is a pure function that receives the database instance.
 *
 * @param db - The SQL database instance
 * @returns Array of all agent configurations
 *
 * @example
 * ```typescript
 * const configs = await getAgentConfigurations(db);
 * console.log(`Found ${configs.length} configurations`);
 * ```
 */
export async function getAgentConfigurations(
  db: SQL
): Promise<AgentConfiguration[]> {
  const rows = (await db`SELECT * FROM agent_configurations`) as any[];
  return rows.map((row) => ({
    id: row.id,
    project: row.project || undefined,
    repositoryId: row.repository_id || undefined,
    repositoryUrl: row.repository_url || undefined,
    model: row.model,
    fallbackModel: row.fallback_model || undefined,
    rules: parseJson<AgentConfiguration["rules"]>(row.rules) || undefined,
    mcpServers: parseJson<string[]>(row.mcp_servers) || undefined,
    prompt: row.prompt || undefined,
    enabled: row.enabled === 1,
    branchNamingPattern: row.branch_naming_pattern || undefined,
    defaultBranch: row.default_branch || undefined,
    createPullRequest: row.create_pull_request === 1,
    pushBranch: row.push_branch === 1,
    workflowId: row.workflow_id || undefined,
    provider: (row.provider as AgentConfiguration["provider"]) || undefined,
    containerName: row.container_name || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

/**
 * Retrieves only enabled agent configurations from the database.
 * This is a pure function that receives the database instance.
 *
 * @param db - The SQL database instance
 * @returns Array of enabled agent configurations
 *
 * @example
 * ```typescript
 * const enabledConfigs = await getEnabledAgentConfigurations(db);
 * console.log(`Found ${enabledConfigs.length} enabled configurations`);
 * ```
 */
export async function getEnabledAgentConfigurations(
  db: SQL
): Promise<AgentConfiguration[]> {
  const rows =
    (await db`SELECT * FROM agent_configurations WHERE enabled = 1`) as any[];
  return rows.map((row) => ({
    id: row.id,
    project: row.project || undefined,
    repositoryId: row.repository_id || undefined,
    repositoryUrl: row.repository_url || undefined,
    model: row.model,
    fallbackModel: row.fallback_model || undefined,
    rules: parseJson<AgentConfiguration["rules"]>(row.rules) || undefined,
    mcpServers: parseJson<string[]>(row.mcp_servers) || undefined,
    prompt: row.prompt || undefined,
    enabled: true,
    branchNamingPattern: row.branch_naming_pattern || undefined,
    defaultBranch: row.default_branch || undefined,
    createPullRequest: row.create_pull_request === 1,
    pushBranch: row.push_branch === 1,
    workflowId: row.workflow_id || undefined,
    provider: (row.provider as AgentConfiguration["provider"]) || undefined,
    containerName: row.container_name || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

/**
 * Finds the best matching agent configuration based on project, repository ID, or repository URL.
 * This is a pure function with no side effects.
 *
 * Priority order:
 * 1. Repository ID match
 * 2. Repository URL match
 * 3. Project match (without repository-specific config)
 * 4. Global config (no project/repository)
 *
 * @param configs - Array of agent configurations to search
 * @param project - Optional project name
 * @param repositoryId - Optional repository ID
 * @param repositoryUrl - Optional repository URL
 * @returns The best matching configuration or null
 *
 * @example
 * ```typescript
 * const configs = await getAgentConfigurations(db);
 * const bestConfig = findAgentConfiguration(
 *   configs,
 *   'my-project',
 *   'repo-123',
 *   'https://github.com/owner/repo'
 * );
 * ```
 */
/**
 * Helper to find config by repository ID
 */
function findConfigByRepositoryId(
  configs: AgentConfiguration[],
  repositoryId: string
): AgentConfiguration | null {
  return configs.find((c) => c.repositoryId === repositoryId) || null;
}

/**
 * Helper to find config by repository URL
 */
function findConfigByRepositoryUrl(
  configs: AgentConfiguration[],
  repositoryUrl: string
): AgentConfiguration | null {
  return configs.find((c) => c.repositoryUrl === repositoryUrl) || null;
}

/**
 * Helper to find config by project
 */
function findConfigByProject(
  configs: AgentConfiguration[],
  project: string
): AgentConfiguration | null {
  return (
    configs.find(
      (c) => c.project === project && !c.repositoryId && !c.repositoryUrl
    ) || null
  );
}

/**
 * Helper to find global config
 */
function findGlobalConfig(
  configs: AgentConfiguration[]
): AgentConfiguration | null {
  return (
    configs.find((c) => !(c.project || c.repositoryId || c.repositoryUrl)) ||
    null
  );
}

export function findAgentConfiguration(
  configs: AgentConfiguration[],
  project?: string,
  repositoryId?: string,
  repositoryUrl?: string
): AgentConfiguration | null {
  const enabledConfigs = configs.filter((c) => c.enabled);

  if (repositoryId) {
    const config = findConfigByRepositoryId(enabledConfigs, repositoryId);
    if (config) {
      return config;
    }
  }

  if (repositoryUrl) {
    const config = findConfigByRepositoryUrl(enabledConfigs, repositoryUrl);
    if (config) {
      return config;
    }
  }

  if (project) {
    const config = findConfigByProject(enabledConfigs, project);
    if (config) {
      return config;
    }
  }

  return findGlobalConfig(enabledConfigs);
}

/**
 * Adds a new agent configuration to the database.
 * This is a pure function that receives the database instance.
 *
 * @param db - The SQL database instance
 * @param config - The agent configuration to add
 * @returns Result indicating success or failure
 *
 * @example
 * ```typescript
 * const result = await addAgentConfiguration(db, {
 *   id: 'config-123',
 *   model: 'gpt-4',
 *   enabled: true,
 *   createdAt: new Date().toISOString(),
 *   updatedAt: new Date().toISOString()
 * });
 * ```
 */
export async function addAgentConfiguration(
  db: SQL,
  config: AgentConfiguration
): Promise<Result<void>> {
  try {
    await db`
            INSERT INTO agent_configurations (
                id, project, repository_id, repository_url, model, fallback_model,
                rules, mcp_servers, prompt, enabled, branch_naming_pattern,
                default_branch, create_pull_request, push_branch, workflow_id,
                provider, container_name, created_at, updated_at
            ) VALUES (
                ${config.id}, ${config.project || null}, ${config.repositoryId || null}, 
                ${config.repositoryUrl || null}, ${config.model}, ${config.fallbackModel || null},
                ${toJson(config.rules)}, ${toJson(config.mcpServers)}, ${config.prompt || null}, 
                ${config.enabled ? 1 : 0}, ${config.branchNamingPattern || null}, 
                ${config.defaultBranch || null}, ${config.createPullRequest ? 1 : 0}, 
                ${config.pushBranch !== false ? 1 : 0}, ${config.workflowId || null}, 
                ${config.provider || null}, ${config.containerName || null},
                ${config.createdAt}, ${config.updatedAt}
            )
        `;

    return ok(undefined);
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Updates an existing agent configuration in the database.
 * Uses an updater function pattern for immutability.
 * This is a pure function that receives the database instance.
 *
 * @param db - The SQL database instance
 * @param configId - The ID of the configuration to update
 * @param updater - Function that receives the current config and returns the updated config
 * @returns Result indicating success or failure
 *
 * @example
 * ```typescript
 * const result = await updateAgentConfiguration(db, 'config-123', (config) => ({
 *   ...config,
 *   enabled: false,
 *   updatedAt: new Date().toISOString()
 * }));
 * ```
 */
export async function updateAgentConfiguration(
  db: SQL,
  configId: string,
  updater: (config: AgentConfiguration) => AgentConfiguration
): Promise<Result<void>> {
  try {
    const configs = await getAgentConfigurations(db);
    const currentConfig = configs.find((c) => c.id === configId);
    if (!currentConfig) {
      return err(new Error(`Agent configuration not found: ${configId}`));
    }

    const updatedConfig = updater(currentConfig);

    await db`
            UPDATE agent_configurations SET
                project = ${updatedConfig.project || null}, 
                repository_id = ${updatedConfig.repositoryId || null}, 
                repository_url = ${updatedConfig.repositoryUrl || null}, 
                model = ${updatedConfig.model},
                fallback_model = ${updatedConfig.fallbackModel || null}, 
                rules = ${toJson(updatedConfig.rules)}, 
                mcp_servers = ${toJson(updatedConfig.mcpServers)}, 
                prompt = ${updatedConfig.prompt || null},
                enabled = ${updatedConfig.enabled ? 1 : 0}, 
                branch_naming_pattern = ${updatedConfig.branchNamingPattern || null}, 
                default_branch = ${updatedConfig.defaultBranch || null},
                create_pull_request = ${updatedConfig.createPullRequest ? 1 : 0}, 
                push_branch = ${updatedConfig.pushBranch !== false ? 1 : 0}, 
                workflow_id = ${updatedConfig.workflowId || null},
                provider = ${updatedConfig.provider || null},
                container_name = ${updatedConfig.containerName || null},
                updated_at = ${updatedConfig.updatedAt}
            WHERE id = ${configId}
        `;

    return ok(undefined);
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Deletes an agent configuration from the database.
 * This is a pure function that receives the database instance.
 *
 * @param db - The SQL database instance
 * @param configId - The ID of the configuration to delete
 * @returns Result indicating success or failure
 *
 * @example
 * ```typescript
 * const result = await deleteAgentConfiguration(db, 'config-123');
 * if (result.ok) {
 *   console.log('Configuration deleted successfully');
 * }
 * ```
 */
export async function deleteAgentConfiguration(
  db: SQL,
  configId: string
): Promise<Result<void>> {
  try {
    await db`DELETE FROM agent_configurations WHERE id = ${configId}`;
    return ok(undefined);
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
}
