// Use any type to avoid importing from bun during bundling
type SQL = any;

import { addColumnSafely } from "./utils/add-column-safely";

/**
 * Creates the database schema with all required tables and indexes.
 * This is a pure function that receives the database instance.
 *
 * @param db - The SQL database instance
 *
 * @example
 * ```typescript
 * const db = new SQL('sqlite://./data.db', { adapter: 'sqlite' });
 * await createSchema(db);
 * ```
 */
export async function createSchema(db: SQL): Promise<void> {
  // Enable foreign keys
  await db`PRAGMA foreign_keys = ON`;

  // Configure SQLite for better concurrency handling
  // WAL mode allows multiple readers and one writer simultaneously
  await db`PRAGMA journal_mode = WAL`;

  // Set busy timeout to 5 seconds (SQLite will retry locked operations)
  await db`PRAGMA busy_timeout = 5000`;

  // Enable synchronous mode for better data integrity (NORMAL is a good balance)
  await db`PRAGMA synchronous = NORMAL`;

  // Create jobs table
  await db`
        CREATE TABLE IF NOT EXISTS jobs (
            id TEXT PRIMARY KEY,
            bug_id TEXT NOT NULL,
            status TEXT NOT NULL CHECK(status IN ('pending', 'running', 'waiting_for_user', 'completed', 'failed')),
            result TEXT,
            output TEXT,
            logs TEXT,
            chat TEXT,
            questions TEXT,
            current_question_id TEXT,
            changes TEXT,
            created_at TEXT NOT NULL,
            completed_at TEXT,
            execution_time_seconds REAL,
            model TEXT,
            project TEXT,
            repository_url TEXT,
            work_item_title TEXT,
            work_item_description TEXT,
            workflow_execution_id TEXT
        )
    `;
  await db`CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status)`;
  await db`CREATE INDEX IF NOT EXISTS idx_jobs_workflow_execution_id ON jobs(workflow_execution_id)`;

  // Create agent_configurations table
  await db`
        CREATE TABLE IF NOT EXISTS agent_configurations (
            id TEXT PRIMARY KEY,
            project TEXT,
            repository_id TEXT,
            repository_url TEXT,
            model TEXT NOT NULL,
            fallback_model TEXT,
            rules TEXT,
            mcp_servers TEXT,
            prompt TEXT,
            enabled INTEGER NOT NULL DEFAULT 1,
            branch_naming_pattern TEXT,
            default_branch TEXT,
            create_pull_request INTEGER DEFAULT 0,
            push_branch INTEGER DEFAULT 1,
            workflow_id TEXT,
            provider TEXT,
            container_name TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
    `;
  await db`CREATE INDEX IF NOT EXISTS idx_agent_configurations_enabled ON agent_configurations(enabled)`;

  // Create local_work_items table
  await db`
        CREATE TABLE IF NOT EXISTS local_work_items (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            description TEXT,
            acceptance_criteria TEXT,
            work_item_type TEXT NOT NULL,
            source TEXT NOT NULL CHECK(source IN ('azure-devops', 'local', 'github')),
            status TEXT NOT NULL,
            assigned_agent_id TEXT,
            pr_url TEXT,
            branch_name TEXT,
            project TEXT NOT NULL,
            repository_url TEXT,
            azure_repository_id TEXT,
            azure_repository_project TEXT,
            tags TEXT,
            state TEXT,
            assigned_to TEXT,
            assignee_id TEXT,
            assignee_name TEXT,
            assignee_avatar_url TEXT,
            priority TEXT DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high', 'critical')),
            pre_instructions TEXT,
            original_work_item_id TEXT,
            workflow_id TEXT
        )
    `;

  // Migration: Add priority column if it doesn't exist (for existing databases)
  await addColumnSafely(
    db,
    "local_work_items",
    "priority",
    "TEXT DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high', 'critical'))"
  );

  // Migration: Add assignee columns if they don't exist (for existing databases)
  await addColumnSafely(db, "local_work_items", "assignee_id", "TEXT");
  await addColumnSafely(db, "local_work_items", "assignee_name", "TEXT");
  await addColumnSafely(db, "local_work_items", "assignee_avatar_url", "TEXT");

  // Create integrations table
  await db`
        CREATE TABLE IF NOT EXISTS integrations (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            type TEXT NOT NULL CHECK(type IN ('azure', 'github', 'gitlab')),
            credentials TEXT NOT NULL,
            organization TEXT,
            git_user_name TEXT,
            git_user_email TEXT,
            created_at TEXT NOT NULL,
            last_tested_at TEXT,
            last_test_status TEXT CHECK(last_test_status IN ('success', 'failed'))
        )
    `;

  // Create workflows table
  await db`
        CREATE TABLE IF NOT EXISTS workflows (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            steps TEXT NOT NULL,
            variables TEXT,
            parameters TEXT,
            extends TEXT,
            abstract INTEGER,
            reusable INTEGER,
            metadata TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
    `;

  // Create workflow_executions table
  await db`
        CREATE TABLE IF NOT EXISTS workflow_executions (
            id TEXT PRIMARY KEY,
            workflow_id TEXT NOT NULL,
            work_item_id TEXT NOT NULL,
            job_id TEXT NOT NULL,
            status TEXT NOT NULL CHECK(status IN ('pending', 'running', 'completed', 'failed', 'paused')),
            current_step_id TEXT,
            step_results TEXT NOT NULL,
            plan TEXT,
            waiting_message TEXT,
            worktree_path TEXT,
            branch_name TEXT,
            resume_job_id TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            completed_at TEXT
        )
    `;
  await db`CREATE INDEX IF NOT EXISTS idx_workflow_executions_status ON workflow_executions(status)`;
  await db`CREATE INDEX IF NOT EXISTS idx_workflow_executions_workflow_id ON workflow_executions(workflow_id)`;

  // Create chat_sessions table
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

  // Create chat_messages table
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

  // Create project_context_summaries table
  await db`
        CREATE TABLE IF NOT EXISTS project_context_summaries (
            id TEXT PRIMARY KEY,
            project_id TEXT NOT NULL,
            repository_url TEXT NOT NULL,
            branch_name TEXT NOT NULL,
            summary TEXT NOT NULL,
            key_points TEXT,
            file_references TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            token_count INTEGER DEFAULT 0,
            session_ids TEXT,
            expires_at TEXT
        )
    `;
  await db`CREATE INDEX IF NOT EXISTS idx_project_context_summaries_project_id ON project_context_summaries(project_id)`;
  await db`CREATE INDEX IF NOT EXISTS idx_project_context_summaries_repository_url ON project_context_summaries(repository_url)`;
  await db`CREATE INDEX IF NOT EXISTS idx_project_context_summaries_branch_name ON project_context_summaries(branch_name)`;
  await db`CREATE INDEX IF NOT EXISTS idx_project_context_summaries_updated_at ON project_context_summaries(updated_at)`;

  // Create enabled_models table for managing which models are enabled per provider and use type
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

  // Migration: Add use_type column if it doesn't exist (for existing databases)
  // MUST run BEFORE creating the use_type index
  try {
    // SQLite doesn't allow adding NOT NULL columns with CHECK constraints in ALTER TABLE
    // when there's existing data. We add it without constraints first.
    await db`ALTER TABLE enabled_models ADD COLUMN use_type TEXT DEFAULT 'coding'`;
    // Update all existing rows to have the default value
    await db`UPDATE enabled_models SET use_type = 'coding' WHERE use_type IS NULL`;
  } catch (_error) {
    // Column might already exist, ignore error
  }

  // Create use_type index AFTER ensuring the column exists
  await db`CREATE INDEX IF NOT EXISTS idx_enabled_models_use_type ON enabled_models(use_type)`;

  // Create workflow_events table for event sourcing
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

  // Create system_configurations table for storing system-wide configurations
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

  // Create kanban_columns table for WIP limits and column configuration
  await db`
    CREATE TABLE IF NOT EXISTS kanban_columns (
      id TEXT PRIMARY KEY,
      board_id TEXT NOT NULL DEFAULT 'default',
      name TEXT NOT NULL,
      lane_id TEXT NOT NULL UNIQUE,
      max_items INTEGER,
      order_num INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `;
  await db`CREATE INDEX IF NOT EXISTS idx_kanban_columns_board_id ON kanban_columns(board_id)`;
  await db`CREATE INDEX IF NOT EXISTS idx_kanban_columns_lane_id ON kanban_columns(lane_id)`;

  // Insert default columns if they don't exist
  try {
    const existingColumns =
      await db`SELECT COUNT(*) as count FROM kanban_columns`;
    if (existingColumns[0]?.count === 0) {
      await db`
        INSERT INTO kanban_columns (id, board_id, name, lane_id, max_items, order_num) VALUES
          ('col-planned', 'default', 'Planned', 'planned', 50, 1),
          ('col-doing', 'default', 'Doing', 'doing', 10, 2),
          ('col-review', 'default', 'Review', 'review', 5, 3),
          ('col-done', 'default', 'Done', 'done', NULL, 4),
          ('col-failed', 'default', 'Failed', 'failed', 10, 5)
      `;
    }
  } catch (_error) {
    // Columns might already exist, ignore error
  }

  // Create workflow_triggers table for automatic workflow execution
  await db`
    CREATE TABLE IF NOT EXISTS workflow_triggers (
      id TEXT PRIMARY KEY,
      column_id TEXT NOT NULL,
      workflow_id TEXT NOT NULL,
      auto_start BOOLEAN DEFAULT 1,
      on_success TEXT,
      on_failure TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (column_id) REFERENCES kanban_columns(id)
    )
  `;
  await db`CREATE INDEX IF NOT EXISTS idx_workflow_triggers_column_id ON workflow_triggers(column_id)`;
  await db`CREATE INDEX IF NOT EXISTS idx_workflow_triggers_workflow_id ON workflow_triggers(workflow_id)`;

  // Create external_sync_configs table for bidirectional sync configuration
  await db`
    CREATE TABLE IF NOT EXISTS external_sync_configs (
      id TEXT PRIMARY KEY,
      board_id TEXT NOT NULL DEFAULT 'default',
      provider TEXT NOT NULL CHECK(provider IN ('azure', 'github')),
      integration_id TEXT NOT NULL,
      column_mapping TEXT NOT NULL,
      sync_direction TEXT NOT NULL DEFAULT 'bidirectional' CHECK(sync_direction IN ('read', 'write', 'bidirectional')),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `;
  await db`CREATE INDEX IF NOT EXISTS idx_external_sync_configs_board_id ON external_sync_configs(board_id)`;
  await db`CREATE INDEX IF NOT EXISTS idx_external_sync_configs_provider ON external_sync_configs(provider)`;

  // Create work_item_transitions table for tracking metrics
  await db`
    CREATE TABLE IF NOT EXISTS work_item_transitions (
      id TEXT PRIMARY KEY,
      work_item_id TEXT NOT NULL,
      from_lane TEXT,
      to_lane TEXT NOT NULL,
      transitioned_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (work_item_id) REFERENCES local_work_items(id)
    )
  `;
  await db`CREATE INDEX IF NOT EXISTS idx_transitions_work_item ON work_item_transitions(work_item_id)`;
  await db`CREATE INDEX IF NOT EXISTS idx_transitions_date ON work_item_transitions(transitioned_at)`;
  await db`CREATE INDEX IF NOT EXISTS idx_transitions_to_lane ON work_item_transitions(to_lane)`;

  // Create notifications table for in-app notifications
  await db`
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT,
      work_item_id TEXT,
      read BOOLEAN DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (work_item_id) REFERENCES local_work_items(id)
    )
  `;
  await db`CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, read, created_at)`;
  await db`CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type)`;
  await db`CREATE INDEX IF NOT EXISTS idx_notifications_work_item ON notifications(work_item_id)`;

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
}
