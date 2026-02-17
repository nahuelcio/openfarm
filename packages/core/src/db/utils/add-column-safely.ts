import { createLogger } from "../../utils/logger";

const logger = createLogger("DB");

// Use any type to avoid importing from bun during bundling
type SQL = any;

/**
 * Safely adds a column to a table if it doesn't exist.
 * Handles duplicate column errors gracefully.
 */
export async function addColumnSafely(
	db: SQL,
	tableName: string,
	columnName: string,
	columnDefinition: string,
): Promise<void> {
	logger.debug(`Adding missing column '${columnName}' to ${tableName} table`);

	try {
		const sql = `ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDefinition}`;

		// Bun SQL returns a function with properties like unsafe, exec, etc.
		// Check for unsafe method (for DDL statements without parameterization)
		if (db && typeof db.unsafe === "function") {
			await db.unsafe(sql);
		}
		// Fall back to exec if available
		else if (db && typeof db.exec === "function") {
			await db.exec(sql);
		} else {
			throw new Error(
				"Database must support unsafe() or exec() for DDL operations",
			);
		}

		logger.debug(`✓ Successfully added column '${columnName}' to ${tableName}`);
	} catch (error) {
		if (
			error instanceof Error &&
			(error.message.includes("duplicate column name") ||
				error.message.includes("duplicate column"))
		) {
			logger.debug(
				`Column '${columnName}' already exists in ${tableName}, skipping`,
			);
		} else {
			logger.error(
				`Failed to add column '${columnName}' to ${tableName}:`,
				error,
			);
			throw error;
		}
	}
}
