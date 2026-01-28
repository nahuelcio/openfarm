import { addColumnSafely } from "./utils/add-column-safely";

type SQL = any;

// Type for PRAGMA table_info results
interface TableInfoRow {
  cid: number;
  name: string;
  type: string;
  notnull: number;
  dflt_value: string | number | null;
  pk: number;
}

async function migrateEnabledModelsRemoveProviderConstraint(
  db: SQL
): Promise<void> {
  try {
    const schemaResult = (await db`
      SELECT sql FROM sqlite_master 
      WHERE type='table' AND name='enabled_models'
    `) as { sql: string }[];

    if (schemaResult.length === 0) {
      return;
    }

    const currentSchema = schemaResult[0]?.sql;
    if (!currentSchema?.includes("CHECK(provider IN")) {
      return;
    }

    console.log(
      "[DB Migration] Removing legacy CHECK constraint from enabled_models.provider..."
    );

    const existingData = await db`SELECT * FROM enabled_models`;

    await db`DROP TABLE IF EXISTS enabled_models_backup`;
    await db`ALTER TABLE enabled_models RENAME TO enabled_models_backup`;

    await db`
      CREATE TABLE enabled_models (
        id TEXT PRIMARY KEY,
        provider TEXT NOT NULL,
        model TEXT NOT NULL,
        use_type TEXT NOT NULL DEFAULT 'coding' CHECK(use_type IN ('coding', 'server')),
        enabled INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE(provider, model, use_type)
      )
    `;

    for (const row of existingData as any[]) {
      await db`
        INSERT INTO enabled_models (id, provider, model, use_type, enabled, created_at, updated_at)
        VALUES (${row.id}, ${row.provider}, ${row.model}, ${row.use_type || "coding"}, ${row.enabled}, ${row.created_at}, ${row.updated_at})
      `;
    }

    await db`DROP TABLE enabled_models_backup`;
    await db`CREATE INDEX IF NOT EXISTS idx_enabled_models_provider ON enabled_models(provider)`;
    await db`CREATE INDEX IF NOT EXISTS idx_enabled_models_enabled ON enabled_models(enabled)`;
    await db`CREATE INDEX IF NOT EXISTS idx_enabled_models_use_type ON enabled_models(use_type)`;

    console.log(
      "[DB Migration] ✓ Successfully removed CHECK constraint from enabled_models.provider"
    );
  } catch (error) {
    console.error(
      "[DB Migration] Failed to remove CHECK constraint from enabled_models:",
      error
    );
  }
}

/**
 * Migrates the database schema by adding missing columns to existing tables.
 * This function is idempotent and can be safely called multiple times.
 * It checks for column existence before attempting to add them.
 *
 * @param db - The SQL database instance
 *
 * @example
 * ```typescript
 * const db = new SQL('sqlite://./data.db', { adapter: 'sqlite' });
 * await migrateSchema(db);
 * ```
 */
export async function migrateSchema(db: SQL): Promise<void> {
  try {
    // Migrate OpenCode legacy config keys to new structure
    await migrateOpenCodeConfig(db);

    // Check if workflows table exists and add missing columns for variables/parameters
    const workflowsTableCheck = await db`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='workflows'
    `;

    if (workflowsTableCheck.length > 0) {
      await addColumnSafely(db, "workflows", "variables", "TEXT");

      await addColumnSafely(db, "workflows", "parameters", "TEXT");

      await addColumnSafely(db, "workflows", "extends", "TEXT");

      await addColumnSafely(db, "workflows", "abstract", "INTEGER");

      await addColumnSafely(db, "workflows", "reusable", "INTEGER");

      await addColumnSafely(db, "workflows", "metadata", "TEXT");
    }

    // Check if jobs table exists
    const jobsTableCheck = await db`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='jobs'
    `;

    if (jobsTableCheck.length > 0) {
      await addColumnSafely(db, "jobs", "execution_time_seconds", "REAL");

      await addColumnSafely(db, "jobs", "output", "TEXT");
    }

    // Check if workflow_executions table exists
    const workflowExecutionsTableCheck = await db`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='workflow_executions'
    `;

    if (workflowExecutionsTableCheck.length > 0) {
      await addColumnSafely(db, "workflow_executions", "plan", "TEXT");

      await addColumnSafely(db, "workflow_executions", "worktree_path", "TEXT");

      await addColumnSafely(db, "workflow_executions", "branch_name", "TEXT");

      await addColumnSafely(db, "workflow_executions", "resume_job_id", "TEXT");

      await addColumnSafely(
        db,
        "workflow_executions",
        "waiting_message",
        "TEXT"
      );

      // Check if chat_sessions table exists
      const chatSessionsTableCheck = await db`
                    SELECT name FROM sqlite_master 
                    WHERE type='table' AND name='chat_sessions'
                `;

      if (chatSessionsTableCheck.length === 0) {
        console.log("[DB Migration] Creating chat_sessions table...");
        try {
          await db`
                        CREATE TABLE IF NOT EXISTS chat_sessions (
                            id TEXT PRIMARY KEY,
                            user_id TEXT NOT NULL,
                            project_id TEXT NOT NULL,
                            repository_url TEXT NOT NULL,
                            branch_name TEXT NOT NULL,
                            status TEXT NOT NULL CHECK(status IN ('initializing', 'ready', 'archived')),
                            created_at TEXT NOT NULL,
                            expires_at TEXT NOT NULL,
                            resource_id TEXT,
                            context TEXT
                        )
                    `;
          await db`CREATE INDEX IF NOT EXISTS idx_chat_sessions_status ON chat_sessions(status)`;
          console.log(
            "[DB Migration] ✓ Successfully created chat_sessions table"
          );
        } catch (error) {
          console.error(
            "[DB Migration] Failed to create chat_sessions table:",
            error
          );
        }
      } else {
        console.log(
          "[DB Migration] chat_sessions table already exists, skipping creation"
        );
      }

      // Check if chat_messages table exists
      const chatMessagesTableCheck = await db`
                          SELECT name FROM sqlite_master 
                          WHERE type='table' AND name='chat_messages'
                      `;

      if (chatMessagesTableCheck.length === 0) {
        console.log("[DB Migration] Creating chat_messages table...");
        try {
          await db`
                              CREATE TABLE IF NOT EXISTS chat_messages (
                                  id TEXT PRIMARY KEY,
                                  session_id TEXT NOT NULL,
                                  role TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'system')),
                                  content TEXT NOT NULL,
                                  timestamp TEXT NOT NULL,
                                  cited_files TEXT,
                                  job_id TEXT
                              )
                          `;
          await db`CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id)`;
          await db`CREATE INDEX IF NOT EXISTS idx_chat_messages_timestamp ON chat_messages(timestamp)`;
          console.log(
            "[DB Migration] ✓ Successfully created chat_messages table"
          );
        } catch (error) {
          console.error(
            "[DB Migration] Failed to create chat_messages table:",
            error
          );
        }
      } else {
        console.log(
          "[DB Migration] chat_messages table already exists, skipping creation"
        );
      }
    }

    // Check if agent_configurations table exists
    const agentConfigsTableCheck = await db`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='agent_configurations'
    `;

    if (agentConfigsTableCheck.length > 0) {
      await addColumnSafely(db, "agent_configurations", "provider", "TEXT");

      await addColumnSafely(
        db,
        "agent_configurations",
        "container_name",
        "TEXT"
      );
    }
  } catch (error) {
    // Log error but don't throw - schema migration failures shouldn't prevent DB initialization
    console.error("[DB Migration] Error during schema migration:", error);
  }

  try {
    const agentsTableCheck = await db`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='opencode_agents'
    `;

    if (agentsTableCheck.length === 0) {
      console.log("[DB Migration] Creating opencode_agents table...");
      try {
        await db`
          CREATE TABLE IF NOT EXISTS opencode_agents (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            role TEXT,
            mode TEXT NOT NULL CHECK(mode IN ('primary', 'subagent', 'all')),
            system_instructions TEXT,
            permissions TEXT,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
          )
        `;
        await db`CREATE INDEX IF NOT EXISTS idx_opencode_agents_mode ON opencode_agents(mode)`;
        console.log(
          "[DB Migration] ✓ Successfully created opencode_agents table"
        );
      } catch (error) {
        console.error(
          "[DB Migration] Failed to create opencode_agents table:",
          error
        );
      }
    } else {
      console.log(
        "[DB Migration] opencode_agents table already exists, skipping creation"
      );
    }
  } catch (error) {
    console.error(
      "[DB Migration] Error checking opencode_agents table:",
      error
    );
  }

  try {
    const skillsTableCheck = await db`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='opencode_skills'
    `;

    if (skillsTableCheck.length === 0) {
      console.log("[DB Migration] Creating opencode_skills table...");
      try {
        await db`
          CREATE TABLE IF NOT EXISTS opencode_skills (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            instructions TEXT NOT NULL,
            compatibility TEXT,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
          )
        `;
        console.log(
          "[DB Migration] ✓ Successfully created opencode_skills table"
        );
      } catch (error) {
        console.error(
          "[DB Migration] Failed to create opencode_skills table:",
          error
        );
      }
    } else {
      console.log(
        "[DB Migration] opencode_skills table already exists, skipping creation"
      );
    }
  } catch (error) {
    console.error(
      "[DB Migration] Error checking opencode_skills table:",
      error
    );
  }

  // Check and create enabled_models table
  try {
    const agentsTableCheck = await db`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='opencode_agents'
    `;

    if (agentsTableCheck.length === 0) {
      console.log("[DB Migration] Creating opencode_agents table...");
      try {
        await db`
          CREATE TABLE IF NOT EXISTS opencode_agents (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            role TEXT,
            mode TEXT NOT NULL CHECK(mode IN ('primary', 'subagent', 'all')),
            system_instructions TEXT,
            permissions TEXT,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
          )
        `;
        await db`CREATE INDEX IF NOT EXISTS idx_opencode_agents_mode ON opencode_agents(mode)`;
        console.log(
          "[DB Migration] ✓ Successfully created opencode_agents table"
        );
      } catch (error) {
        console.error(
          "[DB Migration] Failed to create opencode_agents table:",
          error
        );
      }
    } else {
      console.log(
        "[DB Migration] opencode_agents table already exists, skipping creation"
      );
    }
  } catch (error) {
    console.error(
      "[DB Migration] Error checking opencode_agents table:",
      error
    );
  }

  // Check and create opencode_skills table
  try {
    const skillsTableCheck = await db`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='opencode_skills'
    `;

    if (skillsTableCheck.length === 0) {
      console.log("[DB Migration] Creating opencode_skills table...");
      try {
        await db`
          CREATE TABLE IF NOT EXISTS opencode_skills (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            instructions TEXT NOT NULL,
            compatibility TEXT,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
          )
        `;
        console.log(
          "[DB Migration] ✓ Successfully created opencode_skills table"
        );
      } catch (error) {
        console.error(
          "[DB Migration] Failed to create opencode_skills table:",
          error
        );
      }
    } else {
      console.log(
        "[DB Migration] opencode_skills table already exists, skipping creation"
      );
    }
  } catch (error) {
    console.error(
      "[DB Migration] Error checking opencode_skills table:",
      error
    );
  }

  // Check and create enabled_models table
  try {
    const enabledModelsTableCheck = await db`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='enabled_models'
    `;

    if (enabledModelsTableCheck.length === 0) {
      console.log("[DB Migration] Creating enabled_models table...");
      try {
        await db`
          CREATE TABLE IF NOT EXISTS enabled_models (
              id TEXT PRIMARY KEY,
              provider TEXT NOT NULL,
              model TEXT NOT NULL,
              use_type TEXT NOT NULL DEFAULT 'coding' CHECK(use_type IN ('coding', 'server')),
              enabled INTEGER NOT NULL DEFAULT 1,
              created_at TEXT NOT NULL,
              updated_at TEXT NOT NULL,
              UNIQUE(provider, model, use_type)
          )
        `;
        await db`CREATE INDEX IF NOT EXISTS idx_enabled_models_provider ON enabled_models(provider)`;
        await db`CREATE INDEX IF NOT EXISTS idx_enabled_models_enabled ON enabled_models(enabled)`;
        await db`CREATE INDEX IF NOT EXISTS idx_enabled_models_use_type ON enabled_models(use_type)`;
        console.log(
          "[DB Migration] ✓ Successfully created enabled_models table"
        );
      } catch (error) {
        console.error(
          "[DB Migration] Failed to create enabled_models table:",
          error
        );
      }
    } else {
      console.log(
        "[DB Migration] enabled_models table already exists, checking for missing columns"
      );

      const enabledModelsTableInfoRaw =
        await db`PRAGMA table_info(enabled_models)`;
      const enabledModelsTableInfo = Array.isArray(enabledModelsTableInfoRaw)
        ? (enabledModelsTableInfoRaw as TableInfoRow[])
        : [];
      const enabledModelsExistingColumns = new Set(
        enabledModelsTableInfo.map((col) => col.name)
      );

      if (!enabledModelsExistingColumns.has("use_type")) {
        console.log(
          "[DB Migration] Adding missing column 'use_type' to enabled_models table"
        );
        try {
          // SQLite doesn't allow adding NOT NULL columns with CHECK constraints in ALTER TABLE
          // when there's existing data. We add it without constraints first.
          await db`ALTER TABLE enabled_models ADD COLUMN use_type TEXT DEFAULT 'coding'`;

          // Update all existing rows to have the default value
          await db`UPDATE enabled_models SET use_type = 'coding' WHERE use_type IS NULL`;

          // Create index for the new column
          await db`CREATE INDEX IF NOT EXISTS idx_enabled_models_use_type ON enabled_models(use_type)`;

          console.log(
            "[DB Migration] ✓ Successfully added column 'use_type' to enabled_models"
          );
        } catch (columnError) {
          console.error(
            "[DB Migration] Failed to add column 'use_type' to enabled_models:",
            columnError
          );
        }
      }
    }

    // Migration: Remove legacy CHECK constraint on provider column
    // Old schema had: CHECK(provider IN ('aider', 'opencode', 'claude-code'))
    // New schema allows any provider (copilot, anthropic, google, openrouter, etc.)
    await migrateEnabledModelsRemoveProviderConstraint(db);
  } catch (error) {
    console.error("[DB Migration] Error checking enabled_models table:", error);
  }

  // Check and create workflow_events table for event sourcing
  try {
    const workflowEventsTableCheck = await db`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='workflow_events'
    `;

    if (workflowEventsTableCheck.length === 0) {
      console.log("[DB Migration] Creating workflow_events table...");
      try {
        await db`
          CREATE TABLE IF NOT EXISTS workflow_events (
              id TEXT PRIMARY KEY,
              execution_id TEXT NOT NULL,
              event_type TEXT NOT NULL,
              event_data TEXT NOT NULL,
              timestamp TEXT NOT NULL,
              sequence_number INTEGER NOT NULL,
              metadata TEXT
          )
        `;
        await db`CREATE INDEX IF NOT EXISTS idx_workflow_events_execution_id ON workflow_events(execution_id)`;
        await db`CREATE INDEX IF NOT EXISTS idx_workflow_events_type ON workflow_events(event_type)`;
        await db`CREATE INDEX IF NOT EXISTS idx_workflow_events_timestamp ON workflow_events(timestamp)`;
        await db`CREATE INDEX IF NOT EXISTS idx_workflow_events_execution_sequence ON workflow_events(execution_id, sequence_number)`;
        console.log(
          "[DB Migration] ✓ Successfully created workflow_events table"
        );
      } catch (error) {
        console.error(
          "[DB Migration] Failed to create workflow_events table:",
          error
        );
      }
    } else {
      console.log(
        "[DB Migration] workflow_events table already exists, skipping creation"
      );
    }
  } catch (error) {
    console.error(
      "[DB Migration] Error checking workflow_events table:",
      error
    );
  }

  // Check and add workflow_id column to local_work_items table
  try {
    const localWorkItemsTableCheck = await db`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='local_work_items'
    `;

    if (localWorkItemsTableCheck.length > 0) {
      await addColumnSafely(db, "local_work_items", "workflow_id", "TEXT");
    }
  } catch (error) {
    console.error(
      "[DB Migration] Error checking local_work_items table:",
      error
    );
  }

  // Check and create system_configurations table
  try {
    const systemConfigsTableCheck = await db`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='system_configurations'
    `;

    if (systemConfigsTableCheck.length === 0) {
      console.log("[DB Migration] Creating system_configurations table...");
      try {
        await db`
          CREATE TABLE IF NOT EXISTS system_configurations (
            id TEXT PRIMARY KEY,
            category TEXT NOT NULL,
            config_key TEXT NOT NULL,
            config_value TEXT NOT NULL,
            description TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            UNIQUE(category, config_key)
          )
        `;
        await db`CREATE INDEX IF NOT EXISTS idx_system_configurations_category ON system_configurations(category)`;
        await db`CREATE INDEX IF NOT EXISTS idx_system_configurations_key ON system_configurations(config_key)`;
        console.log(
          "[DB Migration] ✓ Successfully created system_configurations table"
        );
      } catch (error) {
        console.error(
          "[DB Migration] Failed to create system_configurations table:",
          error
        );
      }
    } else {
      console.log(
        "[DB Migration] system_configurations table already exists, skipping creation"
      );
    }
  } catch (error) {
    console.error(
      "[DB Migration] Error checking system_configurations table:",
      error
    );
  }
}

async function migrateOpenCodeConfig(db: SQL): Promise<void> {
  try {
    const tableCheck = await db`
        SELECT name FROM sqlite_master
        WHERE type='table' AND name='system_configurations'
      `;

    if (tableCheck.length === 0) {
      return;
    }

    const parseValue = (value: unknown): unknown => {
      if (typeof value !== "string") {
        return value;
      }

      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    };

    const now = new Date().toISOString();
    const rawRows = (await db`
        SELECT config_key, config_value FROM system_configurations
        WHERE category = 'opencode'
      `) as Array<{ config_key: string; config_value: unknown }>;
    const legacyMap = new Map<string, unknown>(
      rawRows.map((row) => [row.config_key, parseValue(row.config_value)])
    );

    const legacyProvider = legacyMap.get("provider");
    if (typeof legacyProvider === "string") {
      const normalized = legacyProvider.toLowerCase();
      const mappedProvider =
        normalized === "openai"
          ? "openrouter"
          : normalized === "copilot" ||
              normalized === "anthropic" ||
              normalized === "openrouter"
            ? normalized
            : null;

      if (mappedProvider) {
        const targetKey = "server.defaultProvider";
        const targetId = `opencode:${targetKey}`;
        if (legacyMap.has(targetKey)) {
          console.warn(
            "[DB Migration] Legacy OpenCode key 'provider' detected but new key already exists. Skipping migration."
          );
        } else {
          console.warn(
            `[DB Migration] Legacy OpenCode key 'provider' detected. Migrating to ${targetKey}=${mappedProvider}`
          );
          await db`
              INSERT INTO system_configurations (
                id, category, config_key, config_value, created_at, updated_at
              ) VALUES (
                ${targetId}, 'opencode', ${targetKey}, ${JSON.stringify(mappedProvider)}, ${now}, ${now}
              )
              ON CONFLICT(id) DO NOTHING
            `;
          legacyMap.set(targetKey, mappedProvider);
        }
      } else {
        console.warn(
          `[DB Migration] Legacy OpenCode key 'provider' has unsupported value '${legacyProvider}'. Skipping migration.`
        );
      }
    }

    const legacyOpenAiKey = legacyMap.get("openaiApiKey");
    if (typeof legacyOpenAiKey === "string" && legacyOpenAiKey.length > 0) {
      const targetKey = "providers.openrouter.apiKey";
      const targetId = `opencode:${targetKey}`;
      if (legacyMap.has(targetKey)) {
        console.warn(
          "[DB Migration] Legacy OpenCode key 'openaiApiKey' detected but new key already exists. Skipping migration."
        );
      } else {
        console.warn(
          "[DB Migration] Legacy OpenCode key 'openaiApiKey' detected. Migrating to providers.openrouter.apiKey."
        );
        await db`
            INSERT INTO system_configurations (
              id, category, config_key, config_value, created_at, updated_at
            ) VALUES (
              ${targetId}, 'opencode', ${targetKey}, ${JSON.stringify(legacyOpenAiKey)}, ${now}, ${now}
            )
            ON CONFLICT(id) DO NOTHING
          `;
        legacyMap.set(targetKey, legacyOpenAiKey);
      }
    }

    const legacyCopilotToken = legacyMap.get("copilotToken");
    if (
      typeof legacyCopilotToken === "string" &&
      legacyCopilotToken.length > 0
    ) {
      const targetKey = "providers.copilot.token";
      const targetId = `opencode:${targetKey}`;
      if (legacyMap.has(targetKey)) {
        console.warn(
          "[DB Migration] Legacy OpenCode key 'copilotToken' detected but new key already exists. Skipping migration."
        );
      } else {
        console.warn(
          "[DB Migration] Legacy OpenCode key 'copilotToken' detected. Migrating to providers.copilot.token."
        );
        await db`
            INSERT INTO system_configurations (
              id, category, config_key, config_value, created_at, updated_at
            ) VALUES (
              ${targetId}, 'opencode', ${targetKey}, ${JSON.stringify(legacyCopilotToken)}, ${now}, ${now}
            )
            ON CONFLICT(id) DO NOTHING
          `;
        legacyMap.set(targetKey, legacyCopilotToken);
      }
    }

    const defaults: Record<string, string> = {
      "server.defaultProvider": '"zai"',
      "server.defaultModel": '"zai/glm-4.7"',
      "tui.defaultProvider": '"zai"',
      "tui.defaultModel": '"zai/glm-4.7"',
      "tui.maxIterations": "5",
      "tui.timeoutSeconds": "300",
      "providers.copilot.enabled": "true",
      "providers.anthropic.enabled": "false",
      "providers.openrouter.enabled": "false",
      "providers.zai.enabled": "true",
    };

    for (const [key, defaultValue] of Object.entries(defaults)) {
      const id = `opencode:${key}`;
      try {
        await db`
            INSERT INTO system_configurations (
              id, category, config_key, config_value, created_at, updated_at
            ) VALUES (
              ${id}, 'opencode', ${key}, ${defaultValue}, ${now}, ${now}
            )
            ON CONFLICT(id) DO NOTHING
          `;
      } catch {
        // Key might already exist, ignore
      }
    }
  } catch (error) {
    console.error("[DB Migration] Error migrating OpenCode config:", error);
  }
}
