/**
 * Centralized configuration module that reads process.env once.
 * This module provides factory functions that return configuration objects,
 * making it easier to test and avoiding direct dependencies on process.env in business logic.
 */

// Regex patterns at top level for performance
const JSON_EXTENSION_REGEX = /\.json$/;

/**
 * Database configuration
 */
export interface DbConfig {
  dbPath: string;
  originalDbPath?: string;
}

/**
 * Creates database configuration from environment variables.
 * This is a pure function that reads process.env once.
 *
 * @returns Database configuration
 *
 * @example
 * ```typescript
 * const dbConfig = createDbConfig();
 * // Returns: { dbPath: './data/db.db', originalDbPath: 'db.json' }
 * ```
 */
export function createDbConfig(): DbConfig {
  let dbPath = process.env.DB_PATH || "db.json";
  const originalDbPath = dbPath;

  // Replace .json extension with .db
  if (dbPath.endsWith(".json")) {
    dbPath = dbPath.replace(JSON_EXTENSION_REGEX, ".db");
  } else if (!dbPath.endsWith(".db")) {
    dbPath = `${dbPath}.db`;
  }

  return {
    dbPath,
    originalDbPath,
  };
}

/**
 * Agent configuration from environment
 */
export interface AgentEnvConfig {
  copilotToken: string;
  azureOrgUrl: string;
  azureProject: string;
  azurePat: string;
  workDir: string;
  gitUserName?: string;
  gitUserEmail?: string;
}

/**
 * Creates agent configuration from environment variables.
 * This is a pure function that reads process.env once.
 *
 * @returns Agent configuration
 *
 * @example
 * ```typescript
 * const agentConfig = createAgentConfig();
 * // Returns: { copilotToken: '...', azureOrgUrl: '...', ... }
 * ```
 */
export function createAgentConfig(): AgentEnvConfig {
  return {
    copilotToken: process.env.COPILOT_TOKEN || "",
    azureOrgUrl: process.env.AZURE_ORG_URL || "",
    azureProject: process.env.AZURE_PROJECT || "",
    azurePat: process.env.AZURE_PAT || "",
    workDir: process.env.WORK_DIR || "/tmp/minions-repos",
    gitUserName: process.env.GIT_USER_NAME,
    gitUserEmail: process.env.GIT_USER_EMAIL,
  };
}

/**
 * Copilot API configuration
 */
export interface CopilotApiConfig {
  copilotApiBase: string;
  copilotApiUrl: string;
}

/**
 * Creates Copilot API configuration from environment variables.
 *
 * @returns Copilot API configuration
 *
 * @example
 * ```typescript
 * const apiConfig = createCopilotApiConfig();
 * // Returns: { copilotApiBase: 'http://copilot-api:4141', ... }
 * ```
 */
export function createCopilotApiConfig(): CopilotApiConfig {
  return {
    copilotApiBase: process.env.COPILOT_API_BASE || "http://copilot-api:4141",
    copilotApiUrl: process.env.COPILOT_API_URL || "http://copilot-api:4141/v1",
  };
}

/**
 * Azure configuration from environment
 */
export interface AzureEnvConfig {
  orgUrl: string;
  project: string;
  pat: string;
}

/**
 * Creates Azure configuration from environment variables.
 *
 * @returns Azure configuration
 *
 * @example
 * ```typescript
 * const azureConfig = createAzureConfig();
 * // Returns: { orgUrl: '...', project: '...', pat: '...' }
 * ```
 */
export function createAzureConfig(): AzureEnvConfig {
  return {
    orgUrl: process.env.AZURE_ORG_URL || "",
    project: process.env.AZURE_PROJECT || "",
    pat: process.env.AZURE_PAT || "",
  };
}

/**
 * Git user configuration from environment
 */
export interface GitUserConfig {
  name: string;
  email: string;
}

/**
 * Creates Git user configuration from environment variables with defaults.
 *
 * @returns Git user configuration
 *
 * @example
 * ```typescript
 * const gitConfig = createGitUserConfig();
 * // Returns: { name: 'Minions Farm Agent', email: 'minions-farm@automated.local' }
 * ```
 */
export function createGitUserConfig(): GitUserConfig {
  return {
    name: process.env.GIT_USER_NAME || "Minions Farm Agent",
    email: process.env.GIT_USER_EMAIL || "minions-farm@automated.local",
  };
}

/**
 * Webhook configuration from environment
 */
export interface WebhookConfig {
  enablePrCreation: boolean;
  usePreviewMode: boolean;
}

/**
 * Creates webhook configuration from environment variables.
 *
 * @returns Webhook configuration
 *
 * @example
 * ```typescript
 * const webhookConfig = createWebhookConfig();
 * // Returns: { enablePrCreation: false, usePreviewMode: true }
 * ```
 */
export function createWebhookConfig(): WebhookConfig {
  return {
    enablePrCreation: process.env.ENABLE_PR_CREATION === "true",
    usePreviewMode: process.env.WEBHOOK_PREVIEW_MODE !== "false",
  };
}

/**
 * Logger configuration from environment
 */
export interface LoggerConfig {
  level: string;
}

/**
 * Creates logger configuration from environment variables.
 *
 * @returns Logger configuration
 *
 * @example
 * ```typescript
 * const loggerConfig = createLoggerConfig();
 * // Returns: { level: 'info' }
 * ```
 */
export function createLoggerConfig(): LoggerConfig {
  return {
    level: process.env.LOG_LEVEL || "info",
  };
}
