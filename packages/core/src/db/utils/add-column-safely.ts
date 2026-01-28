// Use any type to avoid importing from bun during bundling
type SQL = any;

/**
 * Safely adds a column to a table if it doesn't exist.
 * Handles duplicate column errors gracefully.
 *
 * @param db - The SQL database instance
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
  db: SQL,
  tableName: string,
  columnName: string,
  columnDefinition: string
): Promise<void> {
  console.log(
    `[DB Migration] Adding missing column '${columnName}' to ${tableName} table`
  );

  try {
    await db`ALTER TABLE ${db.unsafe(tableName)} ADD COLUMN ${db.unsafe(columnName)} ${db.unsafe(columnDefinition)}`;
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
