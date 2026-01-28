// Use any type to avoid importing from bun during bundling
type SQL = any;

// Regex patterns at top level for performance
const DB_EXTENSION_REGEX = /\.db$/;

import { backupJsonFile, migrateFromJson } from "../db-migration";
import type { FileSystem } from "./connection";
import { getDefaultFileSystem } from "./connection";

/**
 * Runs migration from JSON to SQLite if a JSON file is found and hasn't been migrated yet.
 * This is a pure function that receives all dependencies as parameters.
 *
 * @param db - The SQL database instance
 * @param dbPath - Current database path
 * @param originalDbPath - Original DB_PATH from environment (for migration detection)
 * @param fileSystem - File system interface for dependency injection
 *
 * @example
 * ```typescript
 * await runMigrationIfNeeded(
 *   db,
 *   './data/db.db',
 *   process.env.DB_PATH,
 *   defaultFileSystem
 * );
 * ```
 */
export async function runMigrationIfNeeded(
  db: SQL,
  dbPath: string,
  originalDbPath?: string,
  fileSystem: FileSystem = getDefaultFileSystem()
): Promise<void> {
  // Try multiple possible JSON paths
  const possibleJsonPaths = [
    dbPath.replace(DB_EXTENSION_REGEX, ".json"), // If dbPath is db.db, try db.json
    `${dbPath}.json`, // If dbPath doesn't have extension, try adding .json
    `${dbPath.replace(DB_EXTENSION_REGEX, "")}.json`, // Another variant
  ];

  // Also try the original DB_PATH if it was .json
  if (originalDbPath?.endsWith(".json")) {
    possibleJsonPaths.unshift(originalDbPath);
  }

  for (const jsonPath of possibleJsonPaths) {
    if (
      fileSystem.existsSync(jsonPath) &&
      !fileSystem.existsSync(`${jsonPath}.migrated`)
    ) {
      console.log(`[DB] JSON file found at ${jsonPath}, starting migration...`);
      const backupResult = backupJsonFile(jsonPath);
      if (backupResult.ok) {
        const migrationResult = await migrateFromJson(jsonPath, db);
        if (migrationResult.ok) {
          console.log("[DB] Migration completed successfully");
        } else {
          console.error(
            "[DB] Migration failed:",
            migrationResult.error.message
          );
          // Continue anyway - empty database is fine
        }
      }
      break; // Only migrate once
    }
  }
}
