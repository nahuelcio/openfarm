// Use any type to avoid importing from bun during bundling
type SQL = any;

import { err, ok, type Result } from "@openfarm/result";

// Type for database row results
interface RemoteInstanceRow {
	id: string;
	name: string;
	url: string;
	token: string | null;
	created_at: string;
	updated_at: string;
}

// Type for RemoteInstance (mirrors the type in sdk/src/tui/types/remote.ts)
export interface RemoteInstance {
	id: string;
	name: string;
	url: string;
	token?: string;
}

/**
 * Converts a database row to a RemoteInstance object
 */
function rowToInstance(row: RemoteInstanceRow): RemoteInstance {
	return {
		id: row.id,
		name: row.name,
		url: row.url,
		token: row.token || undefined,
	};
}

/**
 * Retrieves all remote instances from the database
 */
export async function getRemoteInstances(db: SQL): Promise<RemoteInstance[]> {
	const rows =
		(await db`SELECT * FROM remote_instances ORDER BY created_at DESC`) as RemoteInstanceRow[];
	return rows.map(rowToInstance);
}

/**
 * Retrieves a single remote instance by ID
 */
export async function getRemoteInstanceById(
	db: SQL,
	id: string,
): Promise<RemoteInstance | null> {
	const rows =
		(await db`SELECT * FROM remote_instances WHERE id = ${id}`) as RemoteInstanceRow[];
	const row = rows[0];
	if (!row) {
		return null;
	}
	return rowToInstance(row);
}

/**
 * Creates a new remote instance in the database
 */
export async function createRemoteInstance(
	db: SQL,
	instance: RemoteInstance,
): Promise<Result<void>> {
	try {
		const now = new Date().toISOString();
		await db`
      INSERT INTO remote_instances (
        id, name, url, token, created_at, updated_at
      ) VALUES (
        ${instance.id}, ${instance.name}, ${instance.url},
        ${instance.token || null}, ${now}, ${now}
      )
    `;
		return ok(undefined);
	} catch (error) {
		return err(error instanceof Error ? error : new Error(String(error)));
	}
}

/**
 * Updates an existing remote instance in the database
 */
export async function updateRemoteInstance(
	db: SQL,
	id: string,
	updates: Partial<RemoteInstance>,
): Promise<Result<void>> {
	try {
		const current = await getRemoteInstanceById(db, id);
		if (!current) {
			return err(new Error(`Remote instance not found: ${id}`));
		}

		const updated: RemoteInstance = {
			...current,
			...updates,
		};

		const now = new Date().toISOString();
		await db`
      UPDATE remote_instances SET
        name = ${updated.name},
        url = ${updated.url},
        token = ${updated.token || null},
        updated_at = ${now}
      WHERE id = ${id}
    `;
		return ok(undefined);
	} catch (error) {
		return err(error instanceof Error ? error : new Error(String(error)));
	}
}

/**
 * Deletes a remote instance from the database
 */
export async function deleteRemoteInstance(
	db: SQL,
	id: string,
): Promise<Result<void>> {
	try {
		await db`DELETE FROM remote_instances WHERE id = ${id}`;
		return ok(undefined);
	} catch (error) {
		return err(error instanceof Error ? error : new Error(String(error)));
	}
}

/**
 * Saves all remote instances to the database.
 * This replaces all existing instances with the provided list.
 */
export async function saveRemoteInstances(
	db: SQL,
	instances: RemoteInstance[],
): Promise<Result<void>> {
	try {
		// Start a transaction
		await db`BEGIN TRANSACTION`;

		try {
			// Delete all existing instances
			await db`DELETE FROM remote_instances`;

			// Insert all new instances
			const now = new Date().toISOString();
			for (const instance of instances) {
				await db`
          INSERT INTO remote_instances (
            id, name, url, token, created_at, updated_at
          ) VALUES (
            ${instance.id}, ${instance.name}, ${instance.url},
            ${instance.token || null}, ${now}, ${now}
          )
        `;
			}

			await db`COMMIT`;
			return ok(undefined);
		} catch (error) {
			await db`ROLLBACK`;
			throw error;
		}
	} catch (error) {
		return err(error instanceof Error ? error : new Error(String(error)));
	}
}
