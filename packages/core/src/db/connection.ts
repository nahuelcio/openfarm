import { err, ok, type Result } from "@openfarm/result";
import { runMigrationIfNeeded } from "./migrations";
import { createSchema } from "./schema";
import { migrateSchema } from "./schema-migrations";

// Use any type to avoid importing from bun during bundling
type SQL = any;

type DbFileSystem = import("../types/runtime").DbFileSystem;

let _defaultFileSystem: DbFileSystem | null = null;
export function getDefaultFileSystem(): DbFileSystem {
  if (!_defaultFileSystem) {
    const {
      existsSync,
      mkdirSync,
      readdirSync,
      statSync,
      rmSync,
    } = require("node:fs");
    _defaultFileSystem = {
      existsSync,
      mkdirSync,
      readdirSync,
      statSync,
      rmSync,
    };
  }
  return _defaultFileSystem;
}

export const defaultFileSystem: DbFileSystem = new Proxy({} as DbFileSystem, {
  get(_target, prop) {
    return getDefaultFileSystem()[prop as keyof DbFileSystem];
  },
});

/**
 * Configuration for database initialization
 */
export interface DbConfig {
  dbPath: string;
  originalDbPath?: string; // Original DB_PATH from env for migration detection
  fileSystem?: DbFileSystem;
}

export type FileSystem = DbFileSystem;
export type { DbFileSystem } from "../types/runtime";

/**
 * Detects the current runtime (Bun or Node.js)
 */
function _isRunningInBun(): boolean {
  // Check multiple ways Bun might be available
  if (typeof (globalThis as any).Bun !== "undefined") {
    console.log("[DB] Detected Bun via globalThis.Bun");
    return true;
  }
  // Also check process.versions.bun
  if (typeof process !== "undefined" && (process as any).versions?.bun) {
    console.log("[DB] Detected Bun via process.versions.bun");
    return true;
  }
  // Check if Bun is available via require
  try {
    const bun = require("bun");
    if (bun) {
      console.log("[DB] Detected Bun via require('bun')");
      return true;
    }
  } catch (_e) {
    // Bun not available
  }

  // Check if we're being executed by Bun (check executable path)
  if (
    typeof process !== "undefined" &&
    process.execPath &&
    (process.execPath.includes("bun") || process.execPath.endsWith("bun"))
  ) {
    console.log("[DB] Detected Bun via process.execPath:", process.execPath);
    return true;
  }

  console.log("[DB] Bun not detected, using Node.js fallback");
  console.log("[DB] process.execPath:", process.execPath);
  console.log("[DB] process.versions:", process.versions);
  return false;
}

// Removed createSQLWrapper - we only use Bun SQL now

/**
 * Creates a database adapter using Bun SQL.
 * This function uses Bun's native SQL class which provides built-in SQLite support.
 */
function getSQLiteAdapter(absolutePath: string): SQL {
  try {
    // Dynamically require SQL class to avoid bundling in workflow functions
    // Using require() instead of import() to avoid static analysis by workflow bundler
    const { SQL: SQLClass } = require("bun");

    if (!SQLClass) {
      throw new Error("Bun SQL class not found");
    }

    // Bun SQLite accepts file paths with sqlite:// protocol
    // Format: sqlite:///absolute/path or sqlite://relative/path
    const dbUrl = `sqlite://${absolutePath}`;
    console.log(`[DB] Using Bun SQL. Connecting with URL: ${dbUrl}`);

    try {
      const db = new SQLClass(dbUrl, { adapter: "sqlite" });
      console.log(
        "[DB] Database connection established successfully with Bun SQL"
      );
      return db;
    } catch (error) {
      console.error("[DB] Failed to connect with sqlite:// protocol:", error);
      // Try alternative format
      try {
        console.log(`[DB] Trying alternative format: ${absolutePath}`);
        const db = new SQLClass(absolutePath, { adapter: "sqlite" });
        console.log("[DB] Database connection established with direct path");
        return db;
      } catch (error2) {
        console.error("[DB] Failed to connect with direct path:", error2);
        throw error2;
      }
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Failed to initialize Bun SQL database: ${errorMsg}. Make sure you're running in Bun runtime.`
    );
  }
}

/**
 * Initializes the database connection and creates schema if needed.
 * This is a pure function that receives all dependencies as parameters.
 *
 * @param config - Database configuration including path and file system
 * @returns Result containing the database instance or an error
 *
 * @example
 * ```typescript
 * const result = await createDb({
 *   dbPath: './data/db.db',
 *   fileSystem: defaultFileSystem
 * });
 *
 * if (result.ok) {
 *   const db = result.value;
 *   // Use db...
 * } else {
 *   console.error('Failed to create DB:', result.error);
 * }
 * ```
 */
export async function createDb(config: DbConfig): Promise<Result<any>> {
  const {
    dbPath,
    originalDbPath,
    fileSystem = getDefaultFileSystem(),
  } = config;

  try {
    // Ensure directory exists - import path dynamically
    const { dirname } = await import("node:path");
    const dbDir = dirname(dbPath);
    if (!fileSystem.existsSync(dbDir)) {
      console.log(`[DB] Creating directory: ${dbDir}`);
      fileSystem.mkdirSync(dbDir, { recursive: true });
    }

    console.log(`[DB] Initializing SQLite database at: ${dbPath}`);
    // Use absolute path for SQLite
    const { resolve } = await import("node:path");
    const absolutePath = resolve(dbPath);
    console.log(`[DB] Absolute path: ${absolutePath}`);

    // Get appropriate SQLite adapter for the runtime
    let db: SQL;
    try {
      db = getSQLiteAdapter(absolutePath);
      console.log("[DB] Database connection established successfully");
    } catch (error) {
      console.error("[DB] Failed to initialize database:", error);
      return err(
        new Error(
          `Failed to initialize SQLite database: ${error instanceof Error ? error.message : String(error)}`
        )
      );
    }

    // Create schema
    await createSchema(db);

    // Migrate schema to add missing columns
    await migrateSchema(db);

    // Check if JSON file exists and needs migration
    await runMigrationIfNeeded(db, dbPath, originalDbPath, fileSystem);

    return ok(db);
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Closes a database connection.
 * This is a pure function that receives the database instance.
 *
 * @param db - The SQL database instance to close
 * @returns Result indicating success or failure
 */
export async function closeDb(db: SQL): Promise<Result<void>> {
  try {
    await db.close();
    return ok(undefined);
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
}
