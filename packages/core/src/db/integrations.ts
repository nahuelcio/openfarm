// Use any type to avoid importing from bun during bundling
type SQL = any;

import { err, ok, type Result } from "@openfarm/result";
import type { Integration } from "../types";

/**
 * Retrieves all integrations from the database.
 * This is a pure function that receives the database instance.
 *
 * @param db - The SQL database instance
 * @returns Array of all integrations
 *
 * @example
 * ```typescript
 * const integrations = await getIntegrations(db);
 * console.log(`Found ${integrations.length} integrations`);
 * ```
 */
export async function getIntegrations(db: SQL): Promise<Integration[]> {
  const rows = (await db`SELECT * FROM integrations`) as any[];
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    type: row.type as Integration["type"],
    credentials: row.credentials,
    organization: row.organization || undefined,
    gitUserName: row.git_user_name || undefined,
    gitUserEmail: row.git_user_email || undefined,
    createdAt: row.created_at,
    lastTestedAt: row.last_tested_at || undefined,
    lastTestStatus: row.last_test_status || undefined,
  }));
}

/**
 * Retrieves a single integration by ID.
 * This is a pure function that receives the database instance.
 *
 * @param db - The SQL database instance
 * @param integrationId - The ID of the integration to retrieve
 * @returns The integration if found, undefined otherwise
 *
 * @example
 * ```typescript
 * const integration = await getIntegration(db, 'integration-123');
 * if (integration) {
 *   console.log(`Integration type: ${integration.type}`);
 * }
 * ```
 */
export async function getIntegration(
  db: SQL,
  integrationId: string
): Promise<Integration | undefined> {
  const rows =
    (await db`SELECT * FROM integrations WHERE id = ${integrationId}`) as any[];
  const row = rows[0];
  if (!row) {
    return undefined;
  }

  return {
    id: row.id,
    name: row.name,
    type: row.type as Integration["type"],
    credentials: row.credentials,
    organization: row.organization || undefined,
    gitUserName: row.git_user_name || undefined,
    gitUserEmail: row.git_user_email || undefined,
    createdAt: row.created_at,
    lastTestedAt: row.last_tested_at || undefined,
    lastTestStatus: row.last_test_status || undefined,
  };
}

/**
 * Adds a new integration to the database.
 * This is a pure function that receives the database instance.
 *
 * @param db - The SQL database instance
 * @param integration - The integration to add
 * @returns Result indicating success or failure
 *
 * @example
 * ```typescript
 * const result = await addIntegration(db, {
 *   id: 'integration-123',
 *   name: 'Azure DevOps',
 *   type: 'azure',
 *   credentials: 'pat-token',
 *   createdAt: new Date().toISOString()
 * });
 * ```
 */
export async function addIntegration(
  db: SQL,
  integration: Integration
): Promise<Result<void>> {
  try {
    await db`
            INSERT INTO integrations (
                id, name, type, credentials, organization, git_user_name,
                git_user_email, created_at, last_tested_at, last_test_status
            ) VALUES (
                ${integration.id}, ${integration.name}, ${integration.type}, 
                ${integration.credentials}, ${integration.organization || null}, 
                ${integration.gitUserName || null}, ${integration.gitUserEmail || null}, 
                ${integration.createdAt}, ${integration.lastTestedAt || null}, 
                ${integration.lastTestStatus || null}
            )
        `;

    return ok(undefined);
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Updates an existing integration in the database.
 * Uses an updater function pattern for immutability.
 * This is a pure function that receives the database instance.
 *
 * @param db - The SQL database instance
 * @param integrationId - The ID of the integration to update
 * @param updater - Function that receives the current integration and returns the updated integration
 * @returns Result indicating success or failure
 *
 * @example
 * ```typescript
 * const result = await updateIntegration(db, 'integration-123', (integration) => ({
 *   ...integration,
 *   lastTestedAt: new Date().toISOString(),
 *   lastTestStatus: 'success'
 * }));
 * ```
 */
export async function updateIntegration(
  db: SQL,
  integrationId: string,
  updater: (integration: Integration) => Integration
): Promise<Result<void>> {
  try {
    const currentIntegration = await getIntegration(db, integrationId);
    if (!currentIntegration) {
      return err(new Error(`Integration not found: ${integrationId}`));
    }

    const updatedIntegration = updater(currentIntegration);

    await db`
            UPDATE integrations SET
                name = ${updatedIntegration.name}, 
                type = ${updatedIntegration.type}, 
                credentials = ${updatedIntegration.credentials}, 
                organization = ${updatedIntegration.organization || null},
                git_user_name = ${updatedIntegration.gitUserName || null}, 
                git_user_email = ${updatedIntegration.gitUserEmail || null}, 
                last_tested_at = ${updatedIntegration.lastTestedAt || null},
                last_test_status = ${updatedIntegration.lastTestStatus || null}
            WHERE id = ${integrationId}
        `;

    return ok(undefined);
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Deletes an integration from the database.
 * This is a pure function that receives the database instance.
 *
 * @param db - The SQL database instance
 * @param integrationId - The ID of the integration to delete
 * @returns Result indicating success or failure
 *
 * @example
 * ```typescript
 * const result = await deleteIntegration(db, 'integration-123');
 * if (result.ok) {
 *   console.log('Integration deleted successfully');
 * }
 * ```
 */
export async function deleteIntegration(
  db: SQL,
  integrationId: string
): Promise<Result<void>> {
  try {
    await db`DELETE FROM integrations WHERE id = ${integrationId}`;
    return ok(undefined);
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
}
