// Use any type to avoid importing from bun during bundling
type SQL = any;

/**
 * Database interface that supports either:
 * - A Bun SQL tagged template literal function
 * - An object with an `exec` method (better-sqlite3 style)
 */
interface DatabaseLike {
  exec?(sql: string): Promise<unknown[]> | unknown[];
}

/**
 * Safely adds a column to a table if it doesn't exist.
 * Handles duplicate column errors gracefully.
 *
 * @param db - The SQL database instance (Bun SQL or better-sqlite3 style with exec method)
 * @param tableName - The name of the table to modify
 * @param columnName - The name of column to add
 * @param columnDefinition - The SQL column definition (e.g., 'TEXT', 'TEXT DEFAULT value CHECK(...)', 'INTEGER', 'REAL')
 *
 * @example
 * Simple type:
 * ```typescript
 * await addColumnSafely(db, "table", "name", "TEXT");
 * ```
 *
 * @example
 * With default and check constraints:
 * ```typescript
 * await addColumnSafely(db, "table", "priority", "TEXT DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high'))");
 * ```
 */
export async function addColumnSafely(
  db: SQL | DatabaseLike,
  tableName: string,
  columnName: string,
  columnDefinition: string
): Promise<void> {
  console.log(
    `[DB Migration] Adding missing column '${columnName}' to ${tableName} table`
  );

  try {
    // Support both Bun SQL tagged template and exec() style databases
    if (
      typeof db === "object" &&
      db !== null &&
      "exec" in db &&
      typeof db.exec === "function"
    ) {
      // better-sqlite3 style with exec method
      const sql = `ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDefinition}`;
      await db.exec(sql);
    } else if (typeof db === "function") {
      // Bun SQL tagged template literal style
      await db`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDefinition}`;
    } else {
      throw new Error(
        "Database must be either a function (Bun SQL) or have an exec method"
      );
    }

    console.log(
      `[DB Migration] ✓ Successfully added column '${columnName}' to ${tableName}`
    );
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes("duplicate column name") ||
        error.message.includes("duplicate column"))
    ) {
      console.log(
        `[DB Migration] Column '${columnName}' already exists in ${tableName}, skipping`
      );
    } else {
      console.error(
        `[DB Migration] Failed to add column '${columnName}' to ${tableName}:`,
        error
      );
      throw error;
    }
  }
}
