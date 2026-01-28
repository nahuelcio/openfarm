import { match, type Result } from "@openfarm/result";
import { closeDb, createDb } from "./connection";
import type { InitState } from "./types";

// Use any type to avoid importing from bun during bundling
type SQL = any;

// Regex patterns at top level for performance
const JSON_EXTENSION_REGEX = /\.json$/;

export * from "./agent-configs";
export * from "./chat-messages";
export * from "./chat-sessions";
export * from "./enabled-models";
export * from "./events";
export * from "./integrations";
// Re-export all CRUD functions
export * from "./jobs";
export * from "./project-context-summaries";
export * from "./schema-migrations";
export * from "./system-configs";
export * from "./types";
export * from "./utils";
export * from "./work-items";
export * from "./workflows/index";

// Import types needed locally
import type {
  AgentConfiguration,
  Integration,
  Job,
  Workflow,
  WorkflowExecution,
  WorkItem,
} from "../types";
// Import functions needed for convenience wrappers
import {
  findAgentConfiguration,
  getAgentConfigurations,
} from "./agent-configs";

export type {
  AgentConfiguration,
  Integration,
  Job,
  Workflow,
  WorkflowExecution,
  WorkItem,
} from "../types";
// Re-export types
export type { DbConfig, DbFileSystem, FileSystem } from "./connection";

// For backwards compatibility
export type LowdbInstance = SQL;
export interface Data {
  jobs: Job[];
  agentConfigurations: AgentConfiguration[];
  localWorkItems: WorkItem[];
  integrations: Integration[];
  workflows: Workflow[];
  workflowExecutions: WorkflowExecution[];
}

/**
 * Singleton instance of the database.
 * This is kept for backward compatibility but should be avoided in new code.
 * Prefer using createDb() directly for better testability and purity.
 */
let dbInstance: SQL | null = null;
let dbInitializationPromise: Promise<SQL> | null = null;
let initState: InitState = "uninitialized";
let pendingResolvers: Array<(db: SQL) => void> = [];
let pendingRejecters: Array<(error: Error) => void> = [];

/**
 * Gets database instance using environment variable for path.
 * Implements singleton pattern for backward compatibility with enhanced race condition handling.
 *
 * This implementation uses a state machine to properly handle concurrent initialization requests:
 * - uninitialized: No initialization started
 * - initializing: Initialization in progress, concurrent requests are queued
 * - ready: Database initialized and ready to use
 * - error: Initialization failed, will retry on next call
 *
 * NOTE: This function has side effects (reads process.env, creates directories).
 * For new code, prefer using createDb() directly with explicit configuration.
 *
 * @returns Promise resolving to the SQL database instance
 *
 * @example
 * ```typescript
 * // Legacy usage (still supported)
 * const db = await getDb();
 *
 * // Preferred usage (new code)
 * const result = await createDb({
 *   dbPath: process.env.DB_PATH || './data/db.db',
 *   originalDbPath: process.env.DB_PATH,
 *   fileSystem: defaultFileSystem
 * });
 * if (result.ok) {
 *   const db = result.value;
 *   // Use db...
 * }
 * ```
 */
export const getDb = (): Promise<SQL> => {
  // If instance is ready, return it immediately
  if (initState === "ready" && dbInstance !== null) {
    return Promise.resolve(dbInstance);
  }

  // If initialization is in progress, queue this request
  if (initState === "initializing") {
    return new Promise((resolve, reject) => {
      pendingResolvers.push(resolve);
      pendingRejecters.push(reject);
    });
  }

  // If in error state, allow retry
  if (initState === "error") {
    initState = "uninitialized";
    dbInstance = null;
    dbInitializationPromise = null;
  }

  // Start new initialization
  initState = "initializing";
  let dbPath = process.env.DB_PATH || "db.json";
  // Replace .json extension with .db
  if (dbPath.endsWith(".json")) {
    dbPath = dbPath.replace(JSON_EXTENSION_REGEX, ".db");
  } else if (!dbPath.endsWith(".db")) {
    dbPath = `${dbPath}.db`;
  }

  dbInitializationPromise = (async () => {
    try {
      // Import defaultFileSystem locally to avoid bundling it in workflow functions
      const { defaultFileSystem } = await import("./connection");
      const result = await createDb({
        dbPath,
        originalDbPath: process.env.DB_PATH,
        fileSystem: defaultFileSystem,
      });
      // Type assertion needed because createDb returns Result<any> to avoid bundler issues
      const instance = match(
        result as Result<SQL>,
        (value) => value,
        (error) => {
          throw error;
        }
      );

      // Store the instance and mark as ready
      dbInstance = instance;
      initState = "ready";

      // Resolve all pending requests
      for (const resolve of pendingResolvers) {
        resolve(instance);
      }
      pendingResolvers = [];
      pendingRejecters = [];

      return instance;
    } catch (error) {
      // On error, mark as error state and reject all pending requests
      initState = "error";
      dbInstance = null;

      const errorToThrow =
        error instanceof Error ? error : new Error(String(error));

      for (const reject of pendingRejecters) {
        reject(errorToThrow);
      }
      pendingResolvers = [];
      pendingRejecters = [];

      throw errorToThrow;
    } finally {
      // Clear initialization promise regardless of success/failure
      dbInitializationPromise = null;
    }
  })();

  return dbInitializationPromise;
};

/**
 * Resets the singleton database instance.
 * This is primarily useful for testing purposes to allow tests to start with a fresh state.
 * WARNING: Only use this in test environments. Using it in production could cause data loss.
 *
 * @returns Promise that resolves when the database is closed
 *
 * @example
 * ```typescript
 * // In tests
 * afterEach(async () => {
 *   await resetDb();
 * });
 * ```
 */
export const resetDb = async (): Promise<void> => {
  if (dbInstance) {
    try {
      const closeResult = await closeDb(dbInstance);
      if (!closeResult.ok) {
        console.warn("[DB] Error closing database:", closeResult.error.message);
      }
    } catch (error) {
      // Ignore errors when closing
      console.warn("[DB] Error closing database:", error);
    }
  }
  dbInstance = null;
  dbInitializationPromise = null;
};

// Re-export closeDb (createDb is not exported to avoid bundling issues in workflows)
export { closeDb } from "./connection";
// Note: createDb is available via direct import from "./connection" but not re-exported
// to avoid workflow bundler detecting bun types in function signatures
// Tests can import it directly: import { createDb } from "../src/db/connection"

/**
 * Global database instance alias for backward compatibility.
 * This is populated when getDb() resolves.
 */
export const db = dbInstance;

/**
 * Convenience function to get agent configuration by project/repository.
 * This function uses the singleton getDb() for backward compatibility.
 * For new code, prefer using getAgentConfigurations() and findAgentConfiguration() directly.
 *
 * @param project - Optional project name
 * @param repositoryId - Optional repository ID
 * @param repositoryUrl - Optional repository URL
 * @returns The best matching agent configuration or null
 *
 * @example
 * ```typescript
 * const config = await getAgentConfiguration('my-project', 'repo-123');
 * if (config) {
 *   console.log(`Using model: ${config.model}`);
 * }
 * ```
 */
export async function getAgentConfiguration(
  project?: string,
  repositoryId?: string,
  repositoryUrl?: string
): Promise<AgentConfiguration | null> {
  const db = await getDb();
  const configs = await getAgentConfigurations(db);
  return findAgentConfiguration(configs, project, repositoryId, repositoryUrl);
}
