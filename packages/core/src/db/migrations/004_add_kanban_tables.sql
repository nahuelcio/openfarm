-- Create kanban_columns table
CREATE TABLE IF NOT EXISTS kanban_columns (
    id TEXT PRIMARY KEY,
    board_id TEXT NOT NULL DEFAULT 'default',
    name TEXT NOT NULL,
    lane_id TEXT NOT NULL UNIQUE,
    max_items INTEGER,
    order_num INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_kanban_columns_board_id ON kanban_columns(board_id);
CREATE INDEX IF NOT EXISTS idx_kanban_columns_lane_id ON kanban_columns(lane_id);

-- Insert default columns if not exist
INSERT OR IGNORE INTO kanban_columns (id, board_id, name, lane_id, max_items, order_num) VALUES
    ('col-planned', 'default', 'Planned', 'planned', 50, 1),
    ('col-doing', 'default', 'Doing', 'doing', 10, 2),
    ('col-review', 'default', 'Review', 'review', 5, 3),
    ('col-done', 'default', 'Done', 'done', NULL, 4),
    ('col-failed', 'default', 'Failed', 'failed', 10, 5);

-- Create workflow_triggers table
CREATE TABLE IF NOT EXISTS workflow_triggers (
    id TEXT PRIMARY KEY,
    column_id TEXT NOT NULL,
    workflow_id TEXT NOT NULL,
    auto_start BOOLEAN DEFAULT 1,
    on_success TEXT,
    on_failure TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (column_id) REFERENCES kanban_columns(id)
);
CREATE INDEX IF NOT EXISTS idx_workflow_triggers_column_id ON workflow_triggers(column_id);
CREATE INDEX IF NOT EXISTS idx_workflow_triggers_workflow_id ON workflow_triggers(workflow_id);

-- Create external_sync_configs table
CREATE TABLE IF NOT EXISTS external_sync_configs (
    id TEXT PRIMARY KEY,
    board_id TEXT NOT NULL DEFAULT 'default',
    provider TEXT NOT NULL CHECK(provider IN ('azure', 'github')),
    integration_id TEXT NOT NULL,
    column_mapping TEXT NOT NULL,
    sync_direction TEXT NOT NULL DEFAULT 'bidirectional' CHECK(sync_direction IN ('read', 'write', 'bidirectional')),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_external_sync_configs_board_id ON external_sync_configs(board_id);
CREATE INDEX IF NOT EXISTS idx_external_sync_configs_provider ON external_sync_configs(provider);

-- Create work_item_transitions table
CREATE TABLE IF NOT EXISTS work_item_transitions (
    id TEXT PRIMARY KEY,
    work_item_id TEXT NOT NULL,
    from_lane TEXT,
    to_lane TEXT NOT NULL,
    transitioned_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (work_item_id) REFERENCES local_work_items(id)
);
CREATE INDEX IF NOT EXISTS idx_transitions_work_item ON work_item_transitions(work_item_id);
CREATE INDEX IF NOT EXISTS idx_transitions_date ON work_item_transitions(transitioned_at);
CREATE INDEX IF NOT EXISTS idx_transitions_to_lane ON work_item_transitions(to_lane);

-- Create notifications table
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
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, read, created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_work_item ON notifications(work_item_id);
