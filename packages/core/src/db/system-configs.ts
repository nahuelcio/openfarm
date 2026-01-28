// Use any type to avoid importing from bun during bundling
type SQL = any;

import { err, ok, type Result } from "@openfarm/result";
import { parseJson, toJson } from "./utils";

export interface SystemConfiguration {
  id: string;
  category: string;
  configKey: string;
  configValue: unknown;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Gets a system configuration value by category and key.
 *
 * @param db - The SQL database instance
 * @param category - Configuration category (e.g., 'memory')
 * @param configKey - Configuration key
 * @returns The configuration value or null if not found
 */
export async function getSystemConfig(
  db: SQL,
  category: string,
  configKey: string
): Promise<unknown | null> {
  const rows = (await db`
    SELECT config_value FROM system_configurations
    WHERE category = ${category} AND config_key = ${configKey}
    LIMIT 1
  `) as any[];

  if (rows.length === 0) {
    return null;
  }

  return parseJson(rows[0].config_value);
}

/**
 * Gets all configurations for a category.
 *
 * @param db - The SQL database instance
 * @param category - Configuration category (e.g., 'memory')
 * @returns Array of configurations
 */
export async function getSystemConfigsByCategory(
  db: SQL,
  category: string
): Promise<SystemConfiguration[]> {
  const rows = (await db`
    SELECT * FROM system_configurations
    WHERE category = ${category}
    ORDER BY config_key
  `) as any[];

  return rows.map((row) => ({
    id: row.id,
    category: row.category,
    configKey: row.config_key,
    configValue: parseJson(row.config_value),
    description: row.description || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

/**
 * Sets a system configuration value.
 *
 * @param db - The SQL database instance
 * @param category - Configuration category (e.g., 'memory')
 * @param configKey - Configuration key
 * @param configValue - Configuration value (will be JSON stringified)
 * @param description - Optional description
 * @returns Result indicating success or failure
 */
export async function setSystemConfig(
  db: SQL,
  category: string,
  configKey: string,
  configValue: unknown,
  description?: string
): Promise<Result<void>> {
  try {
    const id = `${category}:${configKey}`;
    const now = new Date().toISOString();
    const valueJson = toJson(configValue);

    await db`
      INSERT INTO system_configurations (
        id, category, config_key, config_value, description, created_at, updated_at
      ) VALUES (
        ${id}, ${category}, ${configKey}, ${valueJson}, ${description || null}, ${now}, ${now}
      )
      ON CONFLICT(id) DO UPDATE SET
        config_value = ${valueJson},
        description = ${description || null},
        updated_at = ${now}
    `;

    return ok(undefined);
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Sets multiple system configurations at once.
 *
 * @param db - The SQL database instance
 * @param category - Configuration category
 * @param configs - Object with config keys and values
 * @returns Result indicating success or failure
 */
export async function setSystemConfigs(
  db: SQL,
  category: string,
  configs: Record<string, unknown>
): Promise<Result<void>> {
  try {
    const now = new Date().toISOString();

    for (const [configKey, configValue] of Object.entries(configs)) {
      const id = `${category}:${configKey}`;
      const valueJson = toJson(configValue);

      await db`
        INSERT INTO system_configurations (
          id, category, config_key, config_value, created_at, updated_at
        ) VALUES (
          ${id}, ${category}, ${configKey}, ${valueJson}, ${now}, ${now}
        )
        ON CONFLICT(id) DO UPDATE SET
          config_value = ${valueJson},
          updated_at = ${now}
      `;
    }

    return ok(undefined);
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Deletes a system configuration.
 *
 * @param db - The SQL database instance
 * @param category - Configuration category
 * @param configKey - Configuration key
 * @returns Result indicating success or failure
 */
export async function deleteSystemConfig(
  db: SQL,
  category: string,
  configKey: string
): Promise<Result<void>> {
  try {
    await db`
      DELETE FROM system_configurations
      WHERE category = ${category} AND config_key = ${configKey}
    `;

    return ok(undefined);
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
}
