// Use any type to avoid importing from bun during bundling
type SQL = any;

import { err, ok, type Result } from "@openfarm/result";

export type UseType = "coding" | "server";

export interface EnabledModel {
  id: string;
  provider: string;
  model: string;
  useType: UseType;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProviderModelConfig {
  provider: string;
  useType?: UseType;
  models: Array<{
    model: string;
    enabled: boolean;
  }>;
}

interface TableInfoRow {
  name: string;
}

let useTypeColumnVerified = false;

async function ensureEnabledModelsUseTypeColumn(db: SQL): Promise<void> {
  // If already verified in this process, skip
  if (useTypeColumnVerified) {
    return;
  }

  try {
    // Check if table exists first
    const tableExistsRaw = await db`
      SELECT name FROM sqlite_master
      WHERE type='table' AND name='enabled_models'
    `;
    const tableExists =
      Array.isArray(tableExistsRaw) && tableExistsRaw.length > 0;

    if (!tableExists) {
      // Table doesn't exist yet, schema creation will handle it
      return;
    }

    const tableInfoRaw = await db`PRAGMA table_info(enabled_models)`;
    const tableInfo = Array.isArray(tableInfoRaw)
      ? (tableInfoRaw as TableInfoRow[])
      : [];

    const columns = new Set(tableInfo.map((col) => col.name));

    if (!columns.has("use_type")) {
      console.log("[DB] Adding missing use_type column to enabled_models...");
      await db`ALTER TABLE enabled_models ADD COLUMN use_type TEXT DEFAULT 'coding'`;
      await db`UPDATE enabled_models SET use_type = 'coding' WHERE use_type IS NULL`;
      await db`CREATE INDEX IF NOT EXISTS idx_enabled_models_use_type ON enabled_models(use_type)`;
      console.log("[DB] ✓ use_type column added successfully");
    }

    useTypeColumnVerified = true;
  } catch (error) {
    // Check if error is "duplicate column" which means column already exists
    const errorMsg = error instanceof Error ? error.message : String(error);
    if (errorMsg.includes("duplicate column")) {
      useTypeColumnVerified = true;
      return;
    }
    console.error(
      "[DB] Failed to ensure enabled_models.use_type column:",
      error
    );
    throw error;
  }
}

export async function getEnabledModels(
  db: SQL,
  useType?: UseType
): Promise<EnabledModel[]> {
  try {
    // Always ensure use_type column exists before querying
    await ensureEnabledModelsUseTypeColumn(db);

    let rows: Array<{ provider: string; model: string; type?: string }>;
    if (useType) {
      rows =
        await db`SELECT * FROM enabled_models WHERE use_type = ${useType} ORDER BY provider, model`;
    } else {
      rows = await db`SELECT * FROM enabled_models ORDER BY provider, model`;
    }
    return rows.map((row) => ({
      id: row.id,
      provider: row.provider,
      model: row.model,
      useType: row.use_type || "coding",
      enabled: row.enabled === 1,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  } catch (error) {
    console.error("Failed to get enabled models:", error);
    return [];
  }
}

export async function getEnabledModelsByProvider(
  db: SQL,
  useType: UseType = "coding"
): Promise<Record<string, Set<string>>> {
  const models = await getEnabledModels(db, useType);
  const result: Record<string, Set<string>> = {};

  for (const model of models) {
    if (model.enabled) {
      if (!result[model.provider]) {
        result[model.provider] = new Set();
      }
      result[model.provider]!.add(model.model);
    }
  }

  return result;
}

export async function isModelEnabled(
  db: SQL,
  provider: string,
  model: string,
  useType: UseType = "coding"
): Promise<boolean> {
  try {
    await ensureEnabledModelsUseTypeColumn(db);
    const rows = (await db`
      SELECT enabled FROM enabled_models 
      WHERE provider = ${provider} AND model = ${model} AND use_type = ${useType}
      LIMIT 1
    `) as any[];

    if (rows.length === 0) {
      return true;
    }

    return rows[0].enabled === 1;
  } catch (error) {
    console.error("Failed to check if model is enabled:", error);
    return true;
  }
}

export async function updateModelEnabledStatus(
  db: SQL,
  provider: string,
  model: string,
  enabled: boolean,
  useType: UseType = "coding"
): Promise<Result<void>> {
  try {
    await ensureEnabledModelsUseTypeColumn(db);
    const now = new Date().toISOString();
    const id = `${provider}:${model}:${useType}`;

    const existing = (await db`
      SELECT id FROM enabled_models 
      WHERE provider = ${provider} AND model = ${model} AND use_type = ${useType}
      LIMIT 1
    `) as any[];

    if (existing.length > 0) {
      await db`
        UPDATE enabled_models 
        SET enabled = ${enabled ? 1 : 0}, updated_at = ${now}
        WHERE provider = ${provider} AND model = ${model} AND use_type = ${useType}
      `;
    } else {
      await db`
        INSERT INTO enabled_models (id, provider, model, use_type, enabled, created_at, updated_at)
        VALUES (${id}, ${provider}, ${model}, ${useType}, ${enabled ? 1 : 0}, ${now}, ${now})
      `;
    }

    return ok(undefined);
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
}

export async function bulkUpdateEnabledModels(
  db: SQL,
  configs: ProviderModelConfig[],
  useType: UseType = "coding"
): Promise<Result<void>> {
  try {
    await ensureEnabledModelsUseTypeColumn(db);
    const now = new Date().toISOString();

    for (const config of configs) {
      const configUseType = config.useType || useType;

      for (const modelConfig of config.models) {
        const id = `${config.provider}:${modelConfig.model}:${configUseType}`;

        const existing = (await db`
          SELECT id FROM enabled_models 
          WHERE provider = ${config.provider} AND model = ${modelConfig.model} AND use_type = ${configUseType}
          LIMIT 1
        `) as any[];

        if (existing.length > 0) {
          await db`
            UPDATE enabled_models 
            SET enabled = ${modelConfig.enabled ? 1 : 0}, updated_at = ${now}
            WHERE provider = ${config.provider} AND model = ${modelConfig.model} AND use_type = ${configUseType}
          `;
        } else {
          await db`
            INSERT INTO enabled_models (id, provider, model, use_type, enabled, created_at, updated_at)
            VALUES (${id}, ${config.provider}, ${modelConfig.model}, ${configUseType}, ${modelConfig.enabled ? 1 : 0}, ${now}, ${now})
          `;
        }
      }
    }

    return ok(undefined);
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
}
