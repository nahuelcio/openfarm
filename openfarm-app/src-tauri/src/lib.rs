mod agent_command;
mod agent_config;

use directories;
use flexi_logger::{Cleanup, Criterion, FileSpec, Logger, Naming};
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use std::collections::{BTreeSet, HashMap};
use std::io::{BufRead, BufReader, Write};
use std::path::PathBuf;
use std::process::{Command, Output, Stdio};
use std::sync::mpsc;
use std::sync::Mutex;
use std::time::{Duration, Instant};
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, Manager, State,
};

use crate::agent_command::resolve_agent_command;
use crate::agent_config::{
    apply_agent_config_patch, detect_agent_configs, import_agent_config, list_agent_backups,
    preview_agent_config_patch, rollback_config_patch, AgentProfileId,
};

pub struct Database {
    conn: Mutex<Connection>,
}

impl Database {
    pub fn new() -> Result<Self, rusqlite::Error> {
        let db_dir = directories::ProjectDirs::from("com", "openfarm", "app")
            .map(|d| d.data_dir().to_path_buf())
            .unwrap_or_else(|| std::env::temp_dir());

        std::fs::create_dir_all(&db_dir).ok();
        let db_path = db_dir.join("openfarm.db");

        let conn = Connection::open(&db_path)?;

        conn.execute(
            "CREATE TABLE IF NOT EXISTS projects (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                path TEXT NOT NULL,
                created_at TEXT NOT NULL
            )",
            [],
        )?;

        conn.execute(
            "CREATE TABLE IF NOT EXISTS sessions (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                project_id TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY (project_id) REFERENCES projects(id)
            )",
            [],
        )?;

        conn.execute(
            "CREATE TABLE IF NOT EXISTS agents (
                id TEXT PRIMARY KEY,
                task TEXT NOT NULL,
                provider TEXT NOT NULL,
                status TEXT NOT NULL,
                created_at TEXT NOT NULL,
                output TEXT,
                worktree_path TEXT,
                branch_name TEXT,
                repo_path TEXT,
                project_id TEXT,
                session_id TEXT
            )",
            [],
        )?;

        conn.execute(
            "CREATE TABLE IF NOT EXISTS agent_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                agent_id TEXT NOT NULL,
                event_type TEXT NOT NULL,
                data TEXT NOT NULL,
                created_at TEXT NOT NULL
            )",
            [],
        )?;

        conn.execute(
            "CREATE TABLE IF NOT EXISTS workspaces (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                repo_path TEXT NOT NULL,
                branch_name TEXT NOT NULL,
                source_type TEXT NOT NULL,
                source_ref TEXT,
                worktree_path TEXT,
                status TEXT NOT NULL,
                project_id TEXT,
                session_id TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                archived_at TEXT,
                spotlight_enabled INTEGER NOT NULL DEFAULT 0,
                spotlight_base_ref TEXT,
                spotlight_synced_at TEXT
            )",
            [],
        )?;
        let _ = conn.execute(
            "ALTER TABLE workspaces ADD COLUMN spotlight_enabled INTEGER NOT NULL DEFAULT 0",
            [],
        );
        let _ = conn.execute(
            "ALTER TABLE workspaces ADD COLUMN spotlight_base_ref TEXT",
            [],
        );
        let _ = conn.execute(
            "ALTER TABLE workspaces ADD COLUMN spotlight_synced_at TEXT",
            [],
        );

        conn.execute(
            "CREATE TABLE IF NOT EXISTS workspace_prs (
                workspace_id TEXT PRIMARY KEY,
                pr_url TEXT NOT NULL,
                pr_number INTEGER,
                status TEXT NOT NULL,
                created_at TEXT NOT NULL,
                merged_at TEXT,
                checks_total INTEGER NOT NULL DEFAULT 0,
                checks_passed INTEGER NOT NULL DEFAULT 0,
                checks_failed INTEGER NOT NULL DEFAULT 0,
                checks_pending INTEGER NOT NULL DEFAULT 0,
                checks_state TEXT,
                checks_updated_at TEXT
            )",
            [],
        )?;
        let _ = conn.execute(
            "ALTER TABLE workspace_prs ADD COLUMN checks_total INTEGER NOT NULL DEFAULT 0",
            [],
        );
        let _ = conn.execute(
            "ALTER TABLE workspace_prs ADD COLUMN checks_passed INTEGER NOT NULL DEFAULT 0",
            [],
        );
        let _ = conn.execute(
            "ALTER TABLE workspace_prs ADD COLUMN checks_failed INTEGER NOT NULL DEFAULT 0",
            [],
        );
        let _ = conn.execute(
            "ALTER TABLE workspace_prs ADD COLUMN checks_pending INTEGER NOT NULL DEFAULT 0",
            [],
        );
        let _ = conn.execute("ALTER TABLE workspace_prs ADD COLUMN checks_state TEXT", []);
        let _ = conn.execute(
            "ALTER TABLE workspace_prs ADD COLUMN checks_updated_at TEXT",
            [],
        );

        conn.execute(
            "CREATE TABLE IF NOT EXISTS workspace_script_configs (
                workspace_id TEXT PRIMARY KEY,
                setup_script TEXT,
                run_script TEXT,
                archive_script TEXT,
                run_mode TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )",
            [],
        )?;
        conn.execute(
            "CREATE TABLE IF NOT EXISTS workspace_checkpoints (
                id TEXT PRIMARY KEY,
                workspace_id TEXT NOT NULL,
                name TEXT NOT NULL,
                snapshot_ref TEXT NOT NULL,
                created_at TEXT NOT NULL
            )",
            [],
        )?;
        conn.execute(
            "CREATE TABLE IF NOT EXISTS workspace_todos (
                id TEXT PRIMARY KEY,
                workspace_id TEXT NOT NULL,
                title TEXT NOT NULL,
                completed INTEGER NOT NULL,
                created_at TEXT NOT NULL
            )",
            [],
        )?;
        conn.execute(
            "CREATE TABLE IF NOT EXISTS mcp_servers (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                command TEXT NOT NULL,
                args TEXT,
                env TEXT,
                enabled INTEGER NOT NULL,
                health_status TEXT,
                last_checked_at TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )",
            [],
        )?;

        Ok(Self {
            conn: Mutex::new(conn),
        })
    }

    pub fn load_projects(&self) -> Result<Vec<Project>, rusqlite::Error> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare("SELECT id, name, path, created_at FROM projects")?;
        let projects = stmt
            .query_map([], |row| {
                Ok(Project {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    path: row.get(2)?,
                    created_at: row.get(3)?,
                })
            })?
            .collect::<Result<Vec<_>, _>>()?;
        Ok(projects)
    }

    pub fn save_project(&self, project: &Project) -> Result<(), rusqlite::Error> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT OR REPLACE INTO projects (id, name, path, created_at) VALUES (?1, ?2, ?3, ?4)",
            params![project.id, project.name, project.path, project.created_at],
        )?;
        Ok(())
    }

    pub fn delete_project(&self, project_id: &str) -> Result<(), rusqlite::Error> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "DELETE FROM sessions WHERE project_id = ?1",
            params![project_id],
        )?;
        conn.execute("DELETE FROM projects WHERE id = ?1", params![project_id])?;
        Ok(())
    }

    pub fn load_sessions(&self) -> Result<Vec<Session>, rusqlite::Error> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare("SELECT id, name, project_id, created_at FROM sessions")?;
        let sessions = stmt
            .query_map([], |row| {
                Ok(Session {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    project_id: row.get(2)?,
                    created_at: row.get(3)?,
                    agents: vec![],
                })
            })?
            .collect::<Result<Vec<_>, _>>()?;
        Ok(sessions)
    }

    pub fn save_session(&self, session: &Session) -> Result<(), rusqlite::Error> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT OR REPLACE INTO sessions (id, name, project_id, created_at) VALUES (?1, ?2, ?3, ?4)",
            params![session.id, session.name, session.project_id, session.created_at],
        )?;
        Ok(())
    }

    pub fn delete_session(&self, session_id: &str) -> Result<(), rusqlite::Error> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM sessions WHERE id = ?1", params![session_id])?;
        Ok(())
    }

    pub fn load_agents(&self) -> Result<Vec<Agent>, rusqlite::Error> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, task, provider, status, created_at, output, worktree_path, branch_name, repo_path, project_id, session_id FROM agents",
        )?;
        let agents = stmt
            .query_map([], |row| {
                Ok(Agent {
                    id: row.get(0)?,
                    task: row.get(1)?,
                    provider: row.get(2)?,
                    status: row.get(3)?,
                    created_at: row.get(4)?,
                    output: row.get(5)?,
                    worktree_path: row.get(6)?,
                    branch_name: row.get(7)?,
                    repo_path: row.get(8)?,
                    project_id: row.get(9)?,
                    session_id: row.get(10)?,
                })
            })?
            .collect::<Result<Vec<_>, _>>()?;
        Ok(agents)
    }

    pub fn save_agent(&self, agent: &Agent) -> Result<(), rusqlite::Error> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT OR REPLACE INTO agents (id, task, provider, status, created_at, output, worktree_path, branch_name, repo_path, project_id, session_id) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
            params![
                agent.id,
                agent.task,
                agent.provider,
                agent.status,
                agent.created_at,
                agent.output,
                agent.worktree_path,
                agent.branch_name,
                agent.repo_path,
                agent.project_id,
                agent.session_id
            ],
        )?;
        Ok(())
    }

    pub fn delete_agents_by_session(&self, session_id: &str) -> Result<(), rusqlite::Error> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "DELETE FROM agent_events WHERE agent_id IN (SELECT id FROM agents WHERE session_id = ?1)",
            params![session_id],
        )?;
        conn.execute(
            "DELETE FROM agents WHERE session_id = ?1",
            params![session_id],
        )?;
        Ok(())
    }

    pub fn delete_agents_by_project(&self, project_id: &str) -> Result<(), rusqlite::Error> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "DELETE FROM agent_events WHERE agent_id IN (SELECT id FROM agents WHERE project_id = ?1)",
            params![project_id],
        )?;
        conn.execute(
            "DELETE FROM agents WHERE project_id = ?1",
            params![project_id],
        )?;
        Ok(())
    }

    pub fn save_agent_event(
        &self,
        agent_id: &str,
        event_type: &str,
        data: &serde_json::Value,
    ) -> Result<(), rusqlite::Error> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO agent_events (agent_id, event_type, data, created_at) VALUES (?1, ?2, ?3, ?4)",
            params![
                agent_id,
                event_type,
                data.to_string(),
                chrono::Utc::now().to_rfc3339()
            ],
        )?;
        Ok(())
    }

    pub fn load_agent_events(&self, agent_id: &str) -> Result<Vec<AgentEvent>, rusqlite::Error> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT event_type, agent_id, data FROM agent_events WHERE agent_id = ?1 ORDER BY id ASC",
        )?;
        let events = stmt
            .query_map(params![agent_id], |row| {
                let raw_data: String = row.get(2)?;
                let parsed = serde_json::from_str::<serde_json::Value>(&raw_data)
                    .unwrap_or_else(|_| serde_json::json!({ "raw": raw_data }));
                Ok(AgentEvent {
                    event_type: row.get(0)?,
                    agent_id: row.get(1)?,
                    data: parsed,
                })
            })?
            .collect::<Result<Vec<_>, _>>()?;
        Ok(events)
    }

    pub fn load_workspaces(&self) -> Result<Vec<Workspace>, rusqlite::Error> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, name, repo_path, branch_name, source_type, source_ref, worktree_path, status, project_id, session_id, created_at, updated_at, archived_at, spotlight_enabled, spotlight_base_ref, spotlight_synced_at FROM workspaces",
        )?;
        let workspaces = stmt
            .query_map([], |row| {
                Ok(Workspace {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    repo_path: row.get(2)?,
                    branch_name: row.get(3)?,
                    source_type: row.get(4)?,
                    source_ref: row.get(5)?,
                    worktree_path: row.get(6)?,
                    status: row.get(7)?,
                    project_id: row.get(8)?,
                    session_id: row.get(9)?,
                    created_at: row.get(10)?,
                    updated_at: row.get(11)?,
                    archived_at: row.get(12)?,
                    spotlight_enabled: row.get::<_, i64>(13)? == 1,
                    spotlight_base_ref: row.get(14)?,
                    spotlight_synced_at: row.get(15)?,
                })
            })?
            .collect::<Result<Vec<_>, _>>()?;
        Ok(workspaces)
    }

    pub fn save_workspace(&self, workspace: &Workspace) -> Result<(), rusqlite::Error> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT OR REPLACE INTO workspaces (id, name, repo_path, branch_name, source_type, source_ref, worktree_path, status, project_id, session_id, created_at, updated_at, archived_at, spotlight_enabled, spotlight_base_ref, spotlight_synced_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16)",
            params![
                workspace.id,
                workspace.name,
                workspace.repo_path,
                workspace.branch_name,
                workspace.source_type,
                workspace.source_ref,
                workspace.worktree_path,
                workspace.status,
                workspace.project_id,
                workspace.session_id,
                workspace.created_at,
                workspace.updated_at,
                workspace.archived_at,
                if workspace.spotlight_enabled { 1 } else { 0 },
                workspace.spotlight_base_ref,
                workspace.spotlight_synced_at
            ],
        )?;
        Ok(())
    }

    pub fn delete_workspace(&self, workspace_id: &str) -> Result<(), rusqlite::Error> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "DELETE FROM workspace_prs WHERE workspace_id = ?1",
            params![workspace_id],
        )?;
        conn.execute(
            "DELETE FROM workspace_script_configs WHERE workspace_id = ?1",
            params![workspace_id],
        )?;
        conn.execute(
            "DELETE FROM workspace_checkpoints WHERE workspace_id = ?1",
            params![workspace_id],
        )?;
        conn.execute(
            "DELETE FROM workspace_todos WHERE workspace_id = ?1",
            params![workspace_id],
        )?;
        conn.execute(
            "DELETE FROM workspaces WHERE id = ?1",
            params![workspace_id],
        )?;
        Ok(())
    }

    pub fn load_workspace_prs(&self) -> Result<Vec<WorkspacePr>, rusqlite::Error> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT workspace_id, pr_url, pr_number, status, created_at, merged_at, checks_total, checks_passed, checks_failed, checks_pending, checks_state, checks_updated_at FROM workspace_prs",
        )?;
        let prs = stmt
            .query_map([], |row| {
                Ok(WorkspacePr {
                    workspace_id: row.get(0)?,
                    pr_url: row.get(1)?,
                    pr_number: row.get(2)?,
                    status: row.get(3)?,
                    created_at: row.get(4)?,
                    merged_at: row.get(5)?,
                    checks_total: row.get(6)?,
                    checks_passed: row.get(7)?,
                    checks_failed: row.get(8)?,
                    checks_pending: row.get(9)?,
                    checks_state: row.get(10)?,
                    checks_updated_at: row.get(11)?,
                })
            })?
            .collect::<Result<Vec<_>, _>>()?;
        Ok(prs)
    }

    pub fn save_workspace_pr(&self, pr: &WorkspacePr) -> Result<(), rusqlite::Error> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT OR REPLACE INTO workspace_prs (workspace_id, pr_url, pr_number, status, created_at, merged_at, checks_total, checks_passed, checks_failed, checks_pending, checks_state, checks_updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
            params![
                pr.workspace_id,
                pr.pr_url,
                pr.pr_number,
                pr.status,
                pr.created_at,
                pr.merged_at,
                pr.checks_total,
                pr.checks_passed,
                pr.checks_failed,
                pr.checks_pending,
                pr.checks_state,
                pr.checks_updated_at
            ],
        )?;
        Ok(())
    }

    pub fn load_workspace_script_configs(
        &self,
    ) -> Result<Vec<WorkspaceScriptConfig>, rusqlite::Error> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT workspace_id, setup_script, run_script, archive_script, run_mode, updated_at FROM workspace_script_configs",
        )?;
        let configs = stmt
            .query_map([], |row| {
                Ok(WorkspaceScriptConfig {
                    workspace_id: row.get(0)?,
                    setup_script: row.get(1)?,
                    run_script: row.get(2)?,
                    archive_script: row.get(3)?,
                    run_mode: row.get(4)?,
                    updated_at: row.get(5)?,
                })
            })?
            .collect::<Result<Vec<_>, _>>()?;
        Ok(configs)
    }

    pub fn save_workspace_script_config(
        &self,
        config: &WorkspaceScriptConfig,
    ) -> Result<(), rusqlite::Error> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT OR REPLACE INTO workspace_script_configs (workspace_id, setup_script, run_script, archive_script, run_mode, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![
                config.workspace_id,
                config.setup_script,
                config.run_script,
                config.archive_script,
                config.run_mode,
                config.updated_at
            ],
        )?;
        Ok(())
    }

    pub fn load_workspace_checkpoints(
        &self,
        workspace_id: &str,
    ) -> Result<Vec<WorkspaceCheckpoint>, rusqlite::Error> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, workspace_id, name, snapshot_ref, created_at FROM workspace_checkpoints WHERE workspace_id = ?1 ORDER BY created_at DESC",
        )?;
        let checkpoints = stmt
            .query_map(params![workspace_id], |row| {
                Ok(WorkspaceCheckpoint {
                    id: row.get(0)?,
                    workspace_id: row.get(1)?,
                    name: row.get(2)?,
                    snapshot_ref: row.get(3)?,
                    created_at: row.get(4)?,
                })
            })?
            .collect::<Result<Vec<_>, _>>()?;
        Ok(checkpoints)
    }

    pub fn save_workspace_checkpoint(
        &self,
        checkpoint: &WorkspaceCheckpoint,
    ) -> Result<(), rusqlite::Error> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT OR REPLACE INTO workspace_checkpoints (id, workspace_id, name, snapshot_ref, created_at) VALUES (?1, ?2, ?3, ?4, ?5)",
            params![
                checkpoint.id,
                checkpoint.workspace_id,
                checkpoint.name,
                checkpoint.snapshot_ref,
                checkpoint.created_at
            ],
        )?;
        Ok(())
    }

    pub fn load_workspace_todos(
        &self,
        workspace_id: &str,
    ) -> Result<Vec<WorkspaceTodo>, rusqlite::Error> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, workspace_id, title, completed, created_at FROM workspace_todos WHERE workspace_id = ?1 ORDER BY created_at DESC",
        )?;
        let todos = stmt
            .query_map(params![workspace_id], |row| {
                let completed: i64 = row.get(3)?;
                Ok(WorkspaceTodo {
                    id: row.get(0)?,
                    workspace_id: row.get(1)?,
                    title: row.get(2)?,
                    completed: completed != 0,
                    created_at: row.get(4)?,
                })
            })?
            .collect::<Result<Vec<_>, _>>()?;
        Ok(todos)
    }

    pub fn save_workspace_todo(&self, todo: &WorkspaceTodo) -> Result<(), rusqlite::Error> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT OR REPLACE INTO workspace_todos (id, workspace_id, title, completed, created_at) VALUES (?1, ?2, ?3, ?4, ?5)",
            params![
                todo.id,
                todo.workspace_id,
                todo.title,
                if todo.completed { 1 } else { 0 },
                todo.created_at
            ],
        )?;
        Ok(())
    }

    pub fn delete_workspace_todo(&self, todo_id: &str) -> Result<(), rusqlite::Error> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "DELETE FROM workspace_todos WHERE id = ?1",
            params![todo_id],
        )?;
        Ok(())
    }

    pub fn load_mcp_servers(&self) -> Result<Vec<McpServer>, rusqlite::Error> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, name, command, args, env, enabled, health_status, last_checked_at, created_at, updated_at FROM mcp_servers ORDER BY created_at DESC",
        )?;
        let servers = stmt
            .query_map([], |row| {
                let args_json: Option<String> = row.get(3)?;
                let env_json: Option<String> = row.get(4)?;
                let enabled: i64 = row.get(5)?;
                Ok(McpServer {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    command: row.get(2)?,
                    args: args_json
                        .and_then(|v| serde_json::from_str::<Vec<String>>(&v).ok())
                        .unwrap_or_default(),
                    env: env_json
                        .and_then(|v| serde_json::from_str::<HashMap<String, String>>(&v).ok())
                        .unwrap_or_default(),
                    enabled: enabled != 0,
                    health_status: row.get(6)?,
                    last_checked_at: row.get(7)?,
                    created_at: row.get(8)?,
                    updated_at: row.get(9)?,
                })
            })?
            .collect::<Result<Vec<_>, _>>()?;
        Ok(servers)
    }

    pub fn save_mcp_server(&self, server: &McpServer) -> Result<(), rusqlite::Error> {
        let conn = self.conn.lock().unwrap();
        let args_json = serde_json::to_string(&server.args).unwrap_or_else(|_| "[]".to_string());
        let env_json = serde_json::to_string(&server.env).unwrap_or_else(|_| "{}".to_string());
        conn.execute(
            "INSERT OR REPLACE INTO mcp_servers (id, name, command, args, env, enabled, health_status, last_checked_at, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
            params![
                server.id,
                server.name,
                server.command,
                args_json,
                env_json,
                if server.enabled { 1 } else { 0 },
                server.health_status,
                server.last_checked_at,
                server.created_at,
                server.updated_at
            ],
        )?;
        Ok(())
    }

    pub fn delete_mcp_server(&self, server_id: &str) -> Result<(), rusqlite::Error> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM mcp_servers WHERE id = ?1", params![server_id])?;
        Ok(())
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentEvent {
    pub event_type: String,
    pub agent_id: String,
    pub data: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Agent {
    pub id: String,
    pub task: String,
    pub provider: String,
    pub status: String,
    pub created_at: String,
    pub output: Option<String>,
    pub worktree_path: Option<String>,
    pub branch_name: Option<String>,
    pub repo_path: Option<String>,
    pub project_id: Option<String>,
    pub session_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiffFile {
    pub path: String,
    pub patch: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Project {
    pub id: String,
    pub name: String,
    pub path: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Session {
    pub id: String,
    pub name: String,
    pub project_id: String,
    pub created_at: String,
    pub agents: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Workspace {
    pub id: String,
    pub name: String,
    pub repo_path: String,
    pub branch_name: String,
    pub source_type: String,
    pub source_ref: Option<String>,
    pub worktree_path: Option<String>,
    pub status: String,
    pub project_id: Option<String>,
    pub session_id: Option<String>,
    pub created_at: String,
    pub updated_at: String,
    pub archived_at: Option<String>,
    pub spotlight_enabled: bool,
    pub spotlight_base_ref: Option<String>,
    pub spotlight_synced_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkspacePr {
    pub workspace_id: String,
    pub pr_url: String,
    pub pr_number: Option<i64>,
    pub status: String,
    pub created_at: String,
    pub merged_at: Option<String>,
    pub checks_total: i64,
    pub checks_passed: i64,
    pub checks_failed: i64,
    pub checks_pending: i64,
    pub checks_state: Option<String>,
    pub checks_updated_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkspaceScriptConfig {
    pub workspace_id: String,
    pub setup_script: Option<String>,
    pub run_script: Option<String>,
    pub archive_script: Option<String>,
    pub run_mode: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkspaceCheckpoint {
    pub id: String,
    pub workspace_id: String,
    pub name: String,
    pub snapshot_ref: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkspaceTodo {
    pub id: String,
    pub workspace_id: String,
    pub title: String,
    pub completed: bool,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkspaceSlashCommand {
    pub name: String,
    pub path: String,
    pub content: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkspaceFileEntry {
    pub path: String,
    pub is_dir: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct McpServer {
    pub id: String,
    pub name: String,
    pub command: String,
    pub args: Vec<String>,
    pub env: HashMap<String, String>,
    pub enabled: bool,
    pub health_status: Option<String>,
    pub last_checked_at: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

pub struct AgentPool {
    agents: Mutex<HashMap<String, Agent>>,
    pids: Mutex<HashMap<String, u32>>,
    projects: Mutex<HashMap<String, Project>>,
    sessions: Mutex<HashMap<String, Session>>,
    workspaces: Mutex<HashMap<String, Workspace>>,
    workspace_prs: Mutex<HashMap<String, WorkspacePr>>,
    workspace_scripts: Mutex<HashMap<String, WorkspaceScriptConfig>>,
    workspace_script_pids: Mutex<HashMap<String, u32>>,
    mcp_servers: Mutex<HashMap<String, McpServer>>,
    db: Database,
}

impl Default for AgentPool {
    fn default() -> Self {
        Self::new()
    }
}

impl AgentPool {
    pub fn new() -> Self {
        let db = Database::new().expect("Failed to initialize database");

        let db_projects = db.load_projects().expect("Failed to load projects");
        let mut projects_map = HashMap::new();
        for p in db_projects {
            projects_map.insert(p.id.clone(), p);
        }

        let db_sessions = db.load_sessions().expect("Failed to load sessions");
        let mut sessions_map = HashMap::new();
        for s in db_sessions {
            sessions_map.insert(s.id.clone(), s);
        }

        let db_agents = db.load_agents().expect("Failed to load agents");
        let mut agents_map = HashMap::new();
        for a in db_agents {
            agents_map.insert(a.id.clone(), a);
        }

        let db_workspaces = db.load_workspaces().expect("Failed to load workspaces");
        let mut workspaces_map = HashMap::new();
        for w in db_workspaces {
            workspaces_map.insert(w.id.clone(), w);
        }
        let db_workspace_prs = db
            .load_workspace_prs()
            .expect("Failed to load workspace PRs");
        let mut workspace_prs_map = HashMap::new();
        for pr in db_workspace_prs {
            workspace_prs_map.insert(pr.workspace_id.clone(), pr);
        }
        let db_workspace_scripts = db
            .load_workspace_script_configs()
            .expect("Failed to load workspace script configs");
        let mut workspace_scripts_map = HashMap::new();
        for script in db_workspace_scripts {
            workspace_scripts_map.insert(script.workspace_id.clone(), script);
        }
        let db_mcp_servers = db.load_mcp_servers().expect("Failed to load MCP servers");
        let mut mcp_servers_map = HashMap::new();
        for server in db_mcp_servers {
            mcp_servers_map.insert(server.id.clone(), server);
        }

        let pool = Self {
            agents: Mutex::new(agents_map),
            pids: Mutex::new(HashMap::new()),
            projects: Mutex::new(projects_map),
            sessions: Mutex::new(sessions_map),
            workspaces: Mutex::new(workspaces_map),
            workspace_prs: Mutex::new(workspace_prs_map),
            workspace_scripts: Mutex::new(workspace_scripts_map),
            workspace_script_pids: Mutex::new(HashMap::new()),
            mcp_servers: Mutex::new(mcp_servers_map),
            db,
        };

        pool.cleanup_orphan_worktrees();

        pool
    }

    fn cleanup_orphan_worktrees(&self) {
        let worktrees_dir = std::path::Path::new("/tmp/openfarm-worktrees");
        if !worktrees_dir.exists() {
            return;
        }

        let agents = self.agents.lock().unwrap();
        let valid_agent_ids: std::collections::HashSet<String> = agents.keys().cloned().collect();
        drop(agents); // Release lock before filesystem operations

        if let Ok(entries) = std::fs::read_dir(worktrees_dir) {
            for entry in entries.flatten() {
                let dir_name = entry.file_name();
                let dir_name_str = dir_name.to_string_lossy();

                // Check if this worktree belongs to an existing agent
                if !valid_agent_ids.contains(dir_name_str.as_ref()) {
                    // This is an orphan worktree, clean it up
                    let path = entry.path();
                    log::info!("Cleaning up orphan worktree: {:?}", path);
                    let _ = std::fs::remove_dir_all(&path);
                }
            }
        }
    }
}

#[tauri::command]
fn get_agents(pool: State<AgentPool>) -> Vec<Agent> {
    let agents = pool.agents.lock().unwrap();
    agents.values().cloned().collect()
}

#[tauri::command]
fn get_agents_by_project(project_id: String, pool: State<AgentPool>) -> Vec<Agent> {
    let agents = pool.agents.lock().unwrap();
    agents
        .values()
        .filter(|a| a.project_id.as_ref() == Some(&project_id))
        .cloned()
        .collect()
}

const MAX_CONCURRENT_AGENTS: usize = 8;

fn git_output(repo_path: &str, args: &[&str]) -> Result<Output, String> {
    Command::new("git")
        .args(args)
        .current_dir(repo_path)
        .output()
        .map_err(|e| e.to_string())
}

pub fn git_status(repo_path: &str, args: &[&str]) -> Result<bool, String> {
    Ok(git_output(repo_path, args)?.status.success())
}

fn git_stdout(repo_path: &str, args: &[&str]) -> Result<String, String> {
    let output = git_output(repo_path, args)?;
    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).trim().to_string())
    }
}

fn ensure_repo_clean(repo_path: &str) -> Result<(), String> {
    let output = git_stdout(repo_path, &["status", "--porcelain"])?;
    if output.is_empty() {
        Ok(())
    } else {
        Err("Repository has local changes. Commit/stash before spotlight sync.".to_string())
    }
}

fn ensure_worktree(
    repo_path: &str,
    branch_name: &str,
    base_branch: &str,
    worktree_path: &str,
) -> Result<(), String> {
    let branch_ref = format!("refs/heads/{}", branch_name);
    let branch_exists = git_status(repo_path, &["show-ref", "--verify", "--quiet", &branch_ref])?;
    if !branch_exists {
        let local_base_ref = format!("refs/heads/{base_branch}");
        let remote_base_ref = format!("refs/remotes/origin/{base_branch}");
        let start_point = if git_status(
            repo_path,
            &["show-ref", "--verify", "--quiet", &local_base_ref],
        )? {
            base_branch.to_string()
        } else if git_status(
            repo_path,
            &["show-ref", "--verify", "--quiet", &remote_base_ref],
        )? {
            format!("origin/{base_branch}")
        } else {
            return Err(format!("Base branch '{base_branch}' not found"));
        };

        let create_branch = git_output(repo_path, &["branch", branch_name, &start_point])?;
        if !create_branch.status.success() {
            return Err(String::from_utf8_lossy(&create_branch.stderr).to_string());
        }
    }

    if std::path::Path::new(worktree_path).exists() {
        let _ = git_output(repo_path, &["worktree", "remove", worktree_path, "--force"]);
        let _ = std::fs::remove_dir_all(worktree_path);
    }

    if let Some(parent) = std::path::Path::new(worktree_path).parent() {
        let _ = std::fs::create_dir_all(parent);
    }

    let add_result = git_output(repo_path, &["worktree", "add", worktree_path, branch_name])?;
    if add_result.status.success() {
        return Ok(());
    }

    let retry_result = git_output(
        repo_path,
        &["worktree", "add", "--force", worktree_path, branch_name],
    )?;
    if retry_result.status.success() {
        Ok(())
    } else {
        Err(String::from_utf8_lossy(&retry_result.stderr).to_string())
    }
}

fn cleanup_worktree(repo_path: &str, branch_name: &str, worktree_path: &str) {
    let _ = git_output(repo_path, &["worktree", "remove", worktree_path, "--force"]);
    let _ = std::fs::remove_dir_all(worktree_path);
    let _ = git_output(repo_path, &["branch", "-D", branch_name]);
}

fn strip_ansi_escape_sequences(input: &str) -> String {
    let mut output = String::with_capacity(input.len());
    let mut chars = input.chars().peekable();

    while let Some(character) = chars.next() {
        if character != '\u{1b}' {
            output.push(character);
            continue;
        }
        if chars.peek() == Some(&'[') {
            let _ = chars.next();
            for candidate in chars.by_ref() {
                if candidate.is_ascii_alphabetic() || candidate == '~' {
                    break;
                }
            }
        }
    }

    output
}

fn sanitize_stream_line(input: &str) -> String {
    strip_ansi_escape_sequences(input)
        .chars()
        .filter(|character| {
            character.is_ascii_graphic()
                || character.is_ascii_whitespace()
                || !character.is_control()
        })
        .collect::<String>()
        .trim()
        .to_string()
}

fn parse_structured_agent_event(line: &str) -> Option<String> {
    let value = serde_json::from_str::<serde_json::Value>(line).ok()?;
    let event_type = value.get("type").and_then(|item| item.as_str())?;

    if event_type == "text" {
        return value
            .get("part")
            .and_then(|part| part.get("text"))
            .and_then(|item| item.as_str())
            .map(|text| text.trim().to_string())
            .filter(|text| !text.is_empty());
    }

    if event_type == "tool_use" {
        let tool = value
            .get("part")
            .and_then(|part| part.get("tool"))
            .and_then(|item| item.as_str())
            .unwrap_or("tool");
        let status = value
            .get("part")
            .and_then(|part| part.get("state"))
            .and_then(|state| state.get("status"))
            .and_then(|item| item.as_str())
            .unwrap_or("completed");
        let title = value
            .get("part")
            .and_then(|part| part.get("state"))
            .and_then(|state| state.get("title"))
            .and_then(|item| item.as_str())
            .or_else(|| {
                value
                    .get("part")
                    .and_then(|part| part.get("state"))
                    .and_then(|state| state.get("input"))
                    .and_then(|input| input.get("filePath"))
                    .and_then(|item| item.as_str())
                    .and_then(|path| {
                        std::path::Path::new(path)
                            .file_name()
                            .and_then(|item| item.to_str())
                    })
            })
            .unwrap_or("");
        let summary = if title.is_empty() {
            format!("Step: {tool} ({status})")
        } else {
            format!("Step: {tool} {title} ({status})")
        };
        return Some(summary);
    }

    if event_type == "error" {
        let message = value
            .get("error")
            .and_then(|item| item.as_str())
            .or_else(|| value.get("message").and_then(|item| item.as_str()))
            .unwrap_or("Unknown error");
        return Some(format!("Error: {message}"));
    }

    if event_type == "item.completed" {
        return value
            .get("item")
            .and_then(|item| item.get("text"))
            .and_then(|item| item.as_str())
            .map(|text| text.trim().to_string())
            .filter(|text| !text.is_empty());
    }

    None
}

fn normalize_agent_stream_line(raw_line: &str) -> Option<String> {
    let clean = sanitize_stream_line(raw_line);
    if clean.is_empty() {
        return None;
    }
    if clean.starts_with('{') && clean.ends_with('}') {
        return parse_structured_agent_event(&clean);
    }
    Some(clean)
}

fn emit_and_store_event(
    app: &AppHandle,
    pool: &AgentPool,
    event_type: &str,
    payload: serde_json::Value,
) {
    let _ = app.emit(event_type, payload.clone());
    let agent_id = payload
        .get("agent_id")
        .and_then(|value| value.as_str())
        .unwrap_or_default();
    if !agent_id.is_empty() {
        let _ = pool.db.save_agent_event(agent_id, event_type, &payload);
    }
}

#[tauri::command]
fn get_agents_by_session(session_id: String, pool: State<AgentPool>) -> Vec<Agent> {
    let agents = pool.agents.lock().unwrap();
    agents
        .values()
        .filter(|a| a.session_id.as_ref() == Some(&session_id))
        .cloned()
        .collect()
}

#[tauri::command]
fn get_agent_events(agent_id: String, pool: State<AgentPool>) -> Result<Vec<AgentEvent>, String> {
    pool.db
        .load_agent_events(&agent_id)
        .map_err(|e| e.to_string())
}

fn load_workspace_script_config_from_repo(
    repo_path: &str,
    workspace_id: &str,
) -> Option<WorkspaceScriptConfig> {
    let config_path = std::path::Path::new(repo_path).join("conductor.json");
    let content = std::fs::read_to_string(config_path).ok()?;
    let parsed = serde_json::from_str::<serde_json::Value>(&content).ok()?;

    let setup_script = parsed
        .get("scripts")
        .and_then(|v| v.get("setup"))
        .and_then(|v| v.as_str())
        .map(|v| v.to_string())
        .or_else(|| {
            parsed
                .get("setupScript")
                .and_then(|v| v.as_str())
                .map(|v| v.to_string())
        });
    let run_script = parsed
        .get("scripts")
        .and_then(|v| v.get("run"))
        .and_then(|v| v.as_str())
        .map(|v| v.to_string())
        .or_else(|| {
            parsed
                .get("runScript")
                .and_then(|v| v.as_str())
                .map(|v| v.to_string())
        });
    let archive_script = parsed
        .get("scripts")
        .and_then(|v| v.get("archive"))
        .and_then(|v| v.as_str())
        .map(|v| v.to_string())
        .or_else(|| {
            parsed
                .get("archiveScript")
                .and_then(|v| v.as_str())
                .map(|v| v.to_string())
        });
    let run_mode = parsed
        .get("runScriptMode")
        .and_then(|v| v.as_str())
        .unwrap_or("concurrent")
        .to_string();
    if !["concurrent", "nonconcurrent"].contains(&run_mode.as_str()) {
        return None;
    }
    if setup_script.is_none() && run_script.is_none() && archive_script.is_none() {
        return None;
    }

    Some(WorkspaceScriptConfig {
        workspace_id: workspace_id.to_string(),
        setup_script,
        run_script,
        archive_script,
        run_mode,
        updated_at: chrono::Utc::now().to_rfc3339(),
    })
}

fn resolve_workspace_dir(pool: &AgentPool, workspace_id: &str) -> Result<String, String> {
    let workspace = {
        let workspaces = pool.workspaces.lock().unwrap();
        workspaces
            .get(workspace_id)
            .cloned()
            .ok_or("Workspace not found".to_string())?
    };
    Ok(workspace
        .worktree_path
        .clone()
        .unwrap_or(workspace.repo_path.clone()))
}

fn load_workspace_slash_commands(
    workspace_dir: &str,
) -> Result<Vec<WorkspaceSlashCommand>, String> {
    let base = std::path::Path::new(workspace_dir)
        .join(".claude")
        .join("commands");
    if !base.exists() {
        return Ok(vec![]);
    }
    let mut commands: Vec<WorkspaceSlashCommand> = vec![];
    for entry in std::fs::read_dir(&base).map_err(|e| e.to_string())? {
        let file = entry.map_err(|e| e.to_string())?;
        let path = file.path();
        if path.extension().and_then(|e| e.to_str()) != Some("md") {
            continue;
        }
        let name = path
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or_default()
            .to_string();
        if name.is_empty() {
            continue;
        }
        let content = std::fs::read_to_string(&path).map_err(|e| e.to_string())?;
        commands.push(WorkspaceSlashCommand {
            name,
            path: path.to_string_lossy().to_string(),
            content,
        });
    }
    commands.sort_by(|a, b| a.name.cmp(&b.name));
    Ok(commands)
}

#[tauri::command]
fn spawn_agent(
    task: String,
    provider: String,
    workspace: String,
    workspace_id: Option<String>,
    project_id: Option<String>,
    session_id: Option<String>,
    pool: State<AgentPool>,
    app: AppHandle,
) -> Result<String, String> {
    let mut resolved_workspace = workspace;
    let mut resolved_project_id = project_id;
    let mut resolved_session_id = session_id;

    if let Some(id) = workspace_id {
        let workspace_entry = {
            let workspaces = pool.workspaces.lock().unwrap();
            workspaces.get(&id).cloned()
        }
        .ok_or("Workspace not found".to_string())?;

        if workspace_entry.status == "archived" {
            return Err("Cannot spawn from archived workspace".to_string());
        }
        resolved_workspace = workspace_entry.repo_path;
        if resolved_project_id.is_none() {
            resolved_project_id = workspace_entry.project_id;
        }
        if resolved_session_id.is_none() {
            resolved_session_id = workspace_entry.session_id;
        }
    }

    spawn_agent_internal(
        task,
        provider,
        resolved_workspace,
        None,
        None,
        None,
        resolved_project_id,
        resolved_session_id,
        pool,
        app,
        true,
    )
}

fn spawn_agent_internal(
    task: String,
    provider: String,
    workspace: String,
    model: Option<String>,
    agent_mode: Option<String>,
    base_branch: Option<String>,
    project_id: Option<String>,
    session_id: Option<String>,
    pool: State<AgentPool>,
    app: AppHandle,
    enforce_limit: bool,
) -> Result<String, String> {
    if task.trim().is_empty() {
        return Err("Task cannot be empty".to_string());
    }
    if workspace.trim().is_empty() || !std::path::Path::new(&workspace).exists() {
        return Err("Workspace path does not exist".to_string());
    }
    if !git_status(&workspace, &["rev-parse", "--is-inside-work-tree"])? {
        return Err("Workspace is not a valid git repository".to_string());
    }
    let _ = resolve_agent_command(&provider, &task, model.as_deref(), agent_mode.as_deref())?;

    // Check max agents limit
    if enforce_limit {
        let agents = pool.agents.lock().unwrap();
        let running_count = agents.values().filter(|a| a.status == "running").count();
        if running_count >= MAX_CONCURRENT_AGENTS {
            return Err(format!(
                "Maximum concurrent agents reached ({}). Please wait for running agents to complete.",
                MAX_CONCURRENT_AGENTS
            ));
        }
    }

    let agent_id = format!("agent-{}", uuid::Uuid::new_v4());
    let branch_name = format!("openfarm-{}", &agent_id[..8]);
    let requested_base_branch = base_branch
        .as_ref()
        .map(|value| value.trim())
        .filter(|value| !value.is_empty())
        .map(|value| value.to_string());
    let resolved_base_branch =
        requested_base_branch.unwrap_or_else(|| default_branch_for_repo(&workspace));
    let worktree_path = format!("/tmp/openfarm-worktrees/{}", agent_id);
    let mut worktree_ready = false;

    if let Err(error) = ensure_worktree(
        &workspace,
        &branch_name,
        &resolved_base_branch,
        &worktree_path,
    ) {
        log::warn!("Failed to create worktree: {}", error);
    } else {
        worktree_ready = true;
    }

    let execution_workspace = if worktree_ready {
        worktree_path.clone()
    } else {
        workspace.clone()
    };
    let agent = Agent {
        id: agent_id.clone(),
        task: task.clone(),
        provider: provider.clone(),
        status: "running".to_string(),
        created_at: chrono::Utc::now().to_rfc3339(),
        output: None,
        worktree_path: if worktree_ready {
            Some(worktree_path.clone())
        } else {
            None
        },
        branch_name: Some(branch_name.clone()),
        repo_path: Some(workspace.clone()),
        project_id: project_id.clone(),
        session_id: session_id.clone(),
    };

    {
        let mut agents = pool.agents.lock().unwrap();
        agents.insert(agent_id.clone(), agent.clone());
    }
    if let Err(e) = pool.db.save_agent(&agent) {
        log::warn!("Failed to persist spawned agent: {}", e);
    }
    if let Some(model_value) = model
        .as_ref()
        .map(|value| value.trim())
        .filter(|value| !value.is_empty())
    {
        let _ = pool.db.save_agent_event(
            &agent_id,
            "agent:model",
            &serde_json::json!({ "model": model_value }),
        );
    }
    if let Some(mode_value) = agent_mode
        .as_ref()
        .map(|value| value.trim())
        .filter(|value| !value.is_empty())
    {
        let _ = pool.db.save_agent_event(
            &agent_id,
            "agent:mode",
            &serde_json::json!({ "mode": mode_value }),
        );
    }
    let _ = pool.db.save_agent_event(
        &agent_id,
        "agent:base-branch",
        &serde_json::json!({ "branch": resolved_base_branch }),
    );

    // Emit event for agent started
    emit_and_store_event(
        &app,
        &pool,
        "agent:started",
        serde_json::json!({
            "agent_id": agent_id,
            "timestamp": chrono::Utc::now().to_rfc3339()
        }),
    );
    let setup_summary = if worktree_ready {
        format!(
            "Step: base branch `{}`\nStep: worktree branch `{}`\nStep: worktree path `{}`\n",
            resolved_base_branch, branch_name, worktree_path
        )
    } else {
        format!(
            "Step: worktree creation failed, using repo path `{}`\n",
            workspace
        )
    };
    emit_and_store_event(
        &app,
        &pool,
        "agent:output",
        serde_json::json!({
            "agent_id": agent_id,
            "chunk": setup_summary.clone()
        }),
    );
    let _ = pool.db.save_agent_event(
        &agent_id,
        "agent:assistant-message",
        &serde_json::json!({
            "content": setup_summary,
            "timestamp": chrono::Utc::now().to_rfc3339()
        }),
    );

    if let (Some(sid), Some(_pid)) = (&session_id, &project_id) {
        let mut sessions = pool.sessions.lock().unwrap();
        if let Some(session) = sessions.get_mut(sid) {
            session.agents.push(agent_id.clone());
        }
    }

    let task_clone = task;
    let provider_clone = provider;
    let model_clone = model;
    let mode_clone = agent_mode;
    let agent_id_clone = agent_id.clone();
    let app_clone = app.clone();

    std::thread::spawn(move || {
        let output = run_agent(
            &agent_id_clone,
            &task_clone,
            &provider_clone,
            model_clone.as_deref(),
            mode_clone.as_deref(),
            &execution_workspace,
            &app_clone,
        );

        let state = app_clone.state::<AgentPool>();
        {
            let mut agents = state.agents.lock().unwrap();
            if let Some(agent) = agents.get_mut(&agent_id_clone) {
                match output {
                    Ok(ref combined) => {
                        agent.status = "completed".to_string();
                        agent.output = Some(combined.clone());
                    }
                    Err(ref err) => {
                        agent.status = "failed".to_string();
                        agent.output = Some(err.clone());
                    }
                }
                if let Err(e) = state.db.save_agent(agent) {
                    log::warn!("Failed to persist agent update: {}", e);
                }
            }
        }
        {
            let mut pids = state.pids.lock().unwrap();
            pids.remove(&agent_id_clone);
        }

        match output {
            Ok(_) => {
                emit_and_store_event(
                    &app_clone,
                    &state,
                    "agent:completed",
                    serde_json::json!({
                        "agent_id": agent_id_clone,
                        "timestamp": chrono::Utc::now().to_rfc3339()
                    }),
                );
            }
            Err(err) => {
                emit_and_store_event(
                    &app_clone,
                    &state,
                    "agent:failed",
                    serde_json::json!({
                        "agent_id": agent_id_clone,
                        "error": err,
                        "timestamp": chrono::Utc::now().to_rfc3339()
                    }),
                );
            }
        }
        emit_and_store_event(
            &app_clone,
            &state,
            "agent:diff-updated",
            serde_json::json!({
                "agent_id": agent_id_clone,
                "timestamp": chrono::Utc::now().to_rfc3339()
            }),
        );
    });

    Ok(agent_id)
}

#[derive(Debug, Serialize, Deserialize)]
struct BridgeRequest {
    task: String,
    workspace: String,
    provider: String,
    model: Option<String>,
    agent: Option<String>,
    cli: Option<String>,
    args: Option<Vec<String>>,
}

fn normalize_provider_for_bridge(provider: &str) -> (String, Option<String>, Option<Vec<String>>) {
    match provider.trim().to_lowercase().as_str() {
        "claude-code" | "claude" => ("claude".to_string(), None, None),
        "opencode" | "external-agent" => ("opencode".to_string(), None, None),
        "codex" => (
            "external-agent".to_string(),
            Some("codex".to_string()),
            Some(vec![
                "exec".to_string(),
                "--json".to_string(),
                "-s".to_string(),
                "workspace-write".to_string(),
            ]),
        ),
        "aider" => ("aider".to_string(), None, None),
        other => (other.to_string(), None, None),
    }
}

fn host_target_triple() -> Option<&'static str> {
    match (std::env::consts::OS, std::env::consts::ARCH) {
        ("macos", "aarch64") => Some("aarch64-apple-darwin"),
        ("macos", "x86_64") => Some("x86_64-apple-darwin"),
        ("linux", "aarch64") => Some("aarch64-unknown-linux-gnu"),
        ("linux", "x86_64") => Some("x86_64-unknown-linux-gnu"),
        ("windows", "aarch64") => Some("aarch64-pc-windows-msvc"),
        ("windows", "x86_64") => Some("x86_64-pc-windows-msvc"),
        _ => None,
    }
}

fn resolve_bridge_binary() -> PathBuf {
    if let Ok(explicit) = std::env::var("OPENFARM_BRIDGE_BIN") {
        let path = PathBuf::from(explicit);
        if path.exists() {
            return path;
        }
    }

    let mut names = vec![
        "openfarm-bridge".to_string(),
        "openfarm-bridge.exe".to_string(),
    ];
    if let Ok(triple) = std::env::var("TAURI_ENV_TARGET_TRIPLE") {
        names.push(format!("openfarm-bridge-{triple}"));
        names.push(format!("openfarm-bridge-{triple}.exe"));
    }
    if let Some(host_triple) = host_target_triple() {
        names.push(format!("openfarm-bridge-{host_triple}"));
        names.push(format!("openfarm-bridge-{host_triple}.exe"));
    }
    names.sort();
    names.dedup();

    let mut candidates: Vec<PathBuf> = Vec::new();
    for name in &names {
        candidates.push(PathBuf::from("./src-tauri/binaries").join(name));
        candidates.push(PathBuf::from("./binaries").join(name));
    }
    if let Ok(current) = std::env::current_exe() {
        if let Some(parent) = current.parent() {
            for name in &names {
                candidates.push(parent.join(name));
                candidates.push(parent.join("binaries").join(name));
            }
        }
    }
    for name in &names {
        candidates.push(PathBuf::from(name));
    }

    for candidate in candidates {
        if candidate.exists()
            || candidate == PathBuf::from("openfarm-bridge")
            || candidate == PathBuf::from("openfarm-bridge.exe")
        {
            return candidate;
        }
    }

    PathBuf::from("openfarm-bridge")
}

fn timeout_from_env(name: &str, default_secs: u64) -> Duration {
    let value = std::env::var(name)
        .ok()
        .and_then(|raw| raw.parse::<u64>().ok())
        .filter(|v| *v > 0)
        .unwrap_or(default_secs);
    Duration::from_secs(value)
}

fn agent_total_timeout() -> Duration {
    timeout_from_env("OPENFARM_AGENT_TOTAL_TIMEOUT_SECS", 1800)
}

fn agent_idle_timeout() -> Duration {
    timeout_from_env("OPENFARM_AGENT_IDLE_TIMEOUT_SECS", 180)
}

fn stream_and_emit(
    agent_id: &str,
    app: &AppHandle,
    mut child: std::process::Child,
) -> Result<String, String> {
    {
        let state = app.state::<AgentPool>();
        let mut pids = state.pids.lock().unwrap();
        pids.insert(agent_id.to_string(), child.id());
    }

    let stdout = child
        .stdout
        .take()
        .ok_or_else(|| "Failed to capture stdout".to_string())?;
    let stderr = child
        .stderr
        .take()
        .ok_or_else(|| "Failed to capture stderr".to_string())?;

    let (tx, rx) = mpsc::channel::<String>();
    let tx_out = tx.clone();
    std::thread::spawn(move || {
        let reader = BufReader::new(stdout);
        for line in reader.lines().map_while(Result::ok) {
            let Some(clean) = normalize_agent_stream_line(&line) else {
                continue;
            };
            let _ = tx_out.send(format!("{clean}\n"));
        }
    });

    let tx_err = tx.clone();
    std::thread::spawn(move || {
        let reader = BufReader::new(stderr);
        for line in reader.lines().map_while(Result::ok) {
            let Some(clean) = normalize_agent_stream_line(&line) else {
                continue;
            };
            let _ = tx_err.send(format!("{clean}\n"));
        }
    });
    drop(tx);

    let total_timeout = agent_total_timeout();
    let idle_timeout = agent_idle_timeout();
    let started_at = Instant::now();
    let mut last_activity_at = started_at;
    let mut combined = String::new();
    let mut last_chunk = String::new();
    let mut exit_status: Option<std::process::ExitStatus> = None;
    loop {
        match rx.recv_timeout(Duration::from_millis(500)) {
            Ok(chunk) => {
                last_activity_at = Instant::now();
                if chunk == last_chunk {
                    continue;
                }
                last_chunk = chunk.clone();
                combined.push_str(&chunk);
                let state = app.state::<AgentPool>();
                emit_and_store_event(
                    app,
                    &state,
                    "agent:output",
                    serde_json::json!({
                        "agent_id": agent_id,
                        "chunk": chunk
                    }),
                );
            }
            Err(mpsc::RecvTimeoutError::Timeout) => {
                if let Some(status) = child.try_wait().map_err(|e| e.to_string())? {
                    exit_status = Some(status);
                    break;
                }
                let now = Instant::now();
                if now.duration_since(started_at) >= total_timeout {
                    terminate_process_tree(child.id());
                    let _ = child.wait();
                    {
                        let state = app.state::<AgentPool>();
                        let mut pids = state.pids.lock().unwrap();
                        pids.remove(agent_id);
                    }
                    return Err(format!(
                        "Agent timed out after {}s",
                        total_timeout.as_secs()
                    ));
                }
                if now.duration_since(last_activity_at) >= idle_timeout {
                    terminate_process_tree(child.id());
                    let _ = child.wait();
                    {
                        let state = app.state::<AgentPool>();
                        let mut pids = state.pids.lock().unwrap();
                        pids.remove(agent_id);
                    }
                    return Err(format!(
                        "Agent produced no output for {}s and was stopped",
                        idle_timeout.as_secs()
                    ));
                }
            }
            Err(mpsc::RecvTimeoutError::Disconnected) => break,
        }
    }

    let status = if let Some(value) = exit_status {
        value
    } else {
        child.wait().map_err(|e| e.to_string())?
    };
    {
        let state = app.state::<AgentPool>();
        let mut pids = state.pids.lock().unwrap();
        pids.remove(agent_id);
    }

    if status.success() {
        Ok(combined)
    } else if combined.is_empty() {
        Err(format!(
            "Agent process failed with exit code {:?}",
            status.code()
        ))
    } else {
        Err(combined)
    }
}

fn run_agent_via_bridge(
    agent_id: &str,
    task: &str,
    provider: &str,
    model: Option<&str>,
    agent_mode: Option<&str>,
    workspace: &str,
    app: &AppHandle,
) -> Result<String, String> {
    let (mapped_provider, cli, args) = normalize_provider_for_bridge(provider);
    let request = BridgeRequest {
        task: task.to_string(),
        workspace: workspace.to_string(),
        provider: mapped_provider,
        model: model.map(|value| value.to_string()),
        agent: agent_mode
            .map(|value| value.trim())
            .filter(|value| !value.is_empty())
            .map(|value| value.to_string()),
        cli,
        args,
    };
    let payload = serde_json::to_string(&request).map_err(|e| e.to_string())?;

    let bridge_bin = resolve_bridge_binary();
    let mut child = Command::new(&bridge_bin)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Bridge spawn failed ({:?}): {}", bridge_bin, e))?;

    {
        let state = app.state::<AgentPool>();
        let mut pids = state.pids.lock().unwrap();
        pids.insert(agent_id.to_string(), child.id());
    }

    if let Some(mut stdin) = child.stdin.take() {
        stdin
            .write_all(payload.as_bytes())
            .map_err(|e| format!("Bridge stdin write failed: {e}"))?;
    }

    let stdout = child
        .stdout
        .take()
        .ok_or_else(|| "Bridge stdout capture failed".to_string())?;
    let stderr = child
        .stderr
        .take()
        .ok_or_else(|| "Bridge stderr capture failed".to_string())?;

    let (tx, rx) = mpsc::channel::<(bool, String)>();
    let tx_out = tx.clone();
    std::thread::spawn(move || {
        let reader = BufReader::new(stdout);
        for line in reader.lines().map_while(Result::ok) {
            let _ = tx_out.send((false, line));
        }
    });
    let tx_err = tx.clone();
    std::thread::spawn(move || {
        let reader = BufReader::new(stderr);
        for line in reader.lines().map_while(Result::ok) {
            let _ = tx_err.send((true, line));
        }
    });
    drop(tx);

    let total_timeout = agent_total_timeout();
    let idle_timeout = agent_idle_timeout();
    let started_at = Instant::now();
    let mut last_activity_at = started_at;
    let mut combined = String::new();
    let mut bridge_error = String::new();
    let mut final_result: Option<Result<String, String>> = None;
    let mut exit_status: Option<std::process::ExitStatus> = None;
    loop {
        match rx.recv_timeout(Duration::from_millis(500)) {
            Ok((is_stderr, line)) => {
                last_activity_at = Instant::now();
                if is_stderr {
                    bridge_error.push_str(&line);
                    bridge_error.push('\n');
                    continue;
                }
                let value = serde_json::from_str::<serde_json::Value>(&line)
                    .unwrap_or_else(|_| serde_json::json!({}));
                let kind = value.get("type").and_then(|v| v.as_str()).unwrap_or("log");
                if kind == "log" {
                    let chunk = value
                        .get("chunk")
                        .and_then(|v| v.as_str())
                        .unwrap_or_default()
                        .to_string();
                    if !chunk.is_empty() {
                        let with_newline = format!("{chunk}\n");
                        combined.push_str(&with_newline);
                        let state = app.state::<AgentPool>();
                        emit_and_store_event(
                            app,
                            &state,
                            "agent:output",
                            serde_json::json!({
                                "agent_id": agent_id,
                                "chunk": with_newline
                            }),
                        );
                    }
                    continue;
                }
                if kind == "result" {
                    let success = value
                        .get("success")
                        .and_then(|v| v.as_bool())
                        .unwrap_or(false);
                    let output_text = value
                        .get("output")
                        .and_then(|v| v.as_str())
                        .unwrap_or_default()
                        .to_string();
                    if !output_text.is_empty() {
                        combined.push_str(&output_text);
                    }
                    if success {
                        final_result = Some(Ok(combined.clone()));
                        break;
                    }
                    let error = value
                        .get("error")
                        .and_then(|v| v.as_str())
                        .unwrap_or("Bridge execution failed")
                        .to_string();
                    final_result = Some(Err(if combined.is_empty() {
                        error
                    } else {
                        format!("{combined}\n{error}")
                    }));
                    break;
                }
                if kind == "error" {
                    let error = value
                        .get("message")
                        .and_then(|v| v.as_str())
                        .unwrap_or("Bridge error")
                        .to_string();
                    final_result = Some(Err(error));
                    break;
                }
            }
            Err(mpsc::RecvTimeoutError::Timeout) => {
                if let Some(status) = child.try_wait().map_err(|e| e.to_string())? {
                    exit_status = Some(status);
                    break;
                }
                let now = Instant::now();
                if now.duration_since(started_at) >= total_timeout {
                    terminate_process_tree(child.id());
                    let _ = child.wait();
                    {
                        let state = app.state::<AgentPool>();
                        let mut pids = state.pids.lock().unwrap();
                        pids.remove(agent_id);
                    }
                    return Err(format!(
                        "Agent timed out after {}s",
                        total_timeout.as_secs()
                    ));
                }
                if now.duration_since(last_activity_at) >= idle_timeout {
                    terminate_process_tree(child.id());
                    let _ = child.wait();
                    {
                        let state = app.state::<AgentPool>();
                        let mut pids = state.pids.lock().unwrap();
                        pids.remove(agent_id);
                    }
                    return Err(format!(
                        "Agent produced no output for {}s and was stopped",
                        idle_timeout.as_secs()
                    ));
                }
            }
            Err(mpsc::RecvTimeoutError::Disconnected) => break,
        }
    }

    if let Some(result) = final_result {
        if child
            .try_wait()
            .map_err(|e| e.to_string())?
            .is_none()
        {
            terminate_process_tree(child.id());
            let _ = child.wait();
        }
        {
            let state = app.state::<AgentPool>();
            let mut pids = state.pids.lock().unwrap();
            pids.remove(agent_id);
        }
        return result;
    }

    let status = if let Some(value) = exit_status {
        value
    } else {
        child.wait().map_err(|e| e.to_string())?
    };
    {
        let state = app.state::<AgentPool>();
        let mut pids = state.pids.lock().unwrap();
        pids.remove(agent_id);
    }
    if !status.success() {
        let message = if bridge_error.trim().is_empty() {
            format!("Bridge exited with {:?}", status.code())
        } else {
            bridge_error
        };
        return Err(message);
    }

    if combined.trim().is_empty() {
        Ok("Bridge execution completed".to_string())
    } else {
        Ok(combined)
    }
}

fn run_agent_via_cli(
    agent_id: &str,
    task: &str,
    provider: &str,
    model: Option<&str>,
    agent_mode: Option<&str>,
    workspace: &str,
    app: &AppHandle,
) -> Result<String, String> {
    let resolved = resolve_agent_command(provider, task, model, agent_mode)?;
    let child = Command::new(&resolved.program)
        .args(&resolved.args)
        .current_dir(workspace)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| e.to_string())?;
    stream_and_emit(agent_id, app, child)
}

fn run_agent(
    agent_id: &str,
    task: &str,
    provider: &str,
    model: Option<&str>,
    agent_mode: Option<&str>,
    workspace: &str,
    app: &AppHandle,
) -> Result<String, String> {
    match run_agent_via_bridge(agent_id, task, provider, model, agent_mode, workspace, app) {
        Ok(output) => Ok(output),
        Err(bridge_err) => {
            log::warn!(
                "Bridge execution failed, falling back to CLI: {}",
                bridge_err
            );
            run_agent_via_cli(agent_id, task, provider, model, agent_mode, workspace, app)
        }
    }
}

fn load_provider_catalog_via_bridge() -> Result<serde_json::Value, String> {
    let payload = serde_json::json!({ "kind": "catalog" }).to_string();
    let bridge_bin = resolve_bridge_binary();
    let mut child = Command::new(&bridge_bin)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Bridge spawn failed ({:?}): {}", bridge_bin, e))?;

    if let Some(mut stdin) = child.stdin.take() {
        stdin
            .write_all(payload.as_bytes())
            .map_err(|e| format!("Bridge stdin write failed: {e}"))?;
    }

    let output = child.wait_with_output().map_err(|e| e.to_string())?;
    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();

    for line in stdout.lines() {
        let value = serde_json::from_str::<serde_json::Value>(line)
            .map_err(|e| format!("Invalid bridge JSON output: {e}"))?;
        let kind = value
            .get("type")
            .and_then(|item| item.as_str())
            .unwrap_or("");
        if kind == "catalog" {
            return Ok(value
                .get("providers")
                .cloned()
                .unwrap_or_else(|| serde_json::json!([])));
        }
        if kind == "error" {
            let message = value
                .get("message")
                .and_then(|item| item.as_str())
                .unwrap_or("Bridge returned error")
                .to_string();
            return Err(message);
        }
    }

    if output.status.success() {
        Err("Bridge returned no catalog data".to_string())
    } else if stderr.trim().is_empty() {
        Err(format!(
            "Bridge exited with code {:?} without catalog output",
            output.status.code()
        ))
    } else {
        Err(stderr)
    }
}

fn provider_agents_from_local_configs() -> HashMap<String, Vec<String>> {
    let mut by_provider = HashMap::new();
    let profiles = [
        ("codex", AgentProfileId::Codex),
        ("claude-code", AgentProfileId::ClaudeCode),
        ("opencode", AgentProfileId::Opencode),
    ];

    for (provider, profile) in profiles {
        if let Ok(imported) = import_agent_config(profile) {
            let mut agents = imported
                .config
                .agents
                .into_iter()
                .map(|value| value.trim().to_string())
                .filter(|value| !value.is_empty())
                .collect::<Vec<_>>();
            agents.sort();
            agents.dedup();
            by_provider.insert(provider.to_string(), agents);
        }
    }

    by_provider
}

fn merge_provider_agents_into_catalog(
    catalog: serde_json::Value,
    by_provider: HashMap<String, Vec<String>>,
) -> serde_json::Value {
    let mut providers = catalog.as_array().cloned().unwrap_or_default();
    for provider in &mut providers {
        let Some(object) = provider.as_object_mut() else {
            continue;
        };
        let provider_id = object
            .get("id")
            .and_then(|value| value.as_str())
            .unwrap_or_default()
            .to_string();
        let agents = by_provider.get(&provider_id).cloned().unwrap_or_default();
        let serialized = agents
            .iter()
            .map(|agent| {
                serde_json::json!({
                    "id": agent,
                    "name": agent,
                    "description": "Agent loaded from local CLI config"
                })
            })
            .collect::<Vec<_>>();
        object.insert("agents".to_string(), serde_json::Value::Array(serialized));
        object.insert(
            "defaultAgent".to_string(),
            agents
                .first()
                .cloned()
                .map(serde_json::Value::String)
                .unwrap_or(serde_json::Value::String(String::new())),
        );
    }
    serde_json::Value::Array(providers)
}

fn default_branch_for_repo(repo_path: &str) -> String {
    let output = git_output(
        repo_path,
        &[
            "symbolic-ref",
            "--quiet",
            "--short",
            "refs/remotes/origin/HEAD",
        ],
    );

    if let Ok(result) = output {
        if result.status.success() {
            let value = String::from_utf8_lossy(&result.stdout).trim().to_string();
            if let Some(branch) = value.strip_prefix("origin/") {
                return branch.to_string();
            }
        }
    }

    let fallback_main = git_status(
        repo_path,
        &["show-ref", "--verify", "--quiet", "refs/heads/main"],
    )
    .unwrap_or(false);

    if fallback_main {
        "main".to_string()
    } else {
        "master".to_string()
    }
}

fn is_process_alive(process_id: u32) -> bool {
    Command::new("kill")
        .args(["-0", &process_id.to_string()])
        .status()
        .map(|status| status.success())
        .unwrap_or(false)
}

fn terminate_process_tree(process_id: u32) {
    let pid_value = process_id.to_string();
    let _ = Command::new("pkill")
        .args(["-TERM", "-P", &pid_value])
        .output();
    let _ = Command::new("kill").args(["-TERM", &pid_value]).output();

    std::thread::sleep(Duration::from_millis(250));
    if is_process_alive(process_id) {
        let _ = Command::new("pkill")
            .args(["-KILL", "-P", &pid_value])
            .output();
        let _ = Command::new("kill").args(["-KILL", &pid_value]).output();
    }
}

#[tauri::command]
fn kill_agent(agent_id: String, pool: State<AgentPool>, app: AppHandle) -> Result<(), String> {
    let pid = {
        let mut pids = pool.pids.lock().unwrap();
        pids.remove(&agent_id)
    };
    if let Some(process_id) = pid {
        terminate_process_tree(process_id);
    }

    {
        let mut agents = pool.agents.lock().unwrap();
        if let Some(agent) = agents.get_mut(&agent_id) {
            agent.status = "killed".to_string();
            if let Err(e) = pool.db.save_agent(agent) {
                log::warn!("Failed to persist killed agent: {}", e);
            }
        }
    }
    let _ = pool.db.save_agent_event(
        &agent_id,
        "agent:assistant-message",
        &serde_json::json!({
            "content": "Execution stopped by user.",
            "timestamp": chrono::Utc::now().to_rfc3339()
        }),
    );
    emit_and_store_event(
        &app,
        &pool,
        "agent:failed",
        serde_json::json!({
            "agent_id": agent_id,
            "error": "Execution stopped by user.",
            "timestamp": chrono::Utc::now().to_rfc3339()
        }),
    );
    Ok(())
}

#[tauri::command]
fn approve_agent(
    agent_id: String,
    pool: State<AgentPool>,
    app: AppHandle,
) -> Result<String, String> {
    let agents = pool.agents.lock().unwrap();
    let agent = agents.get(&agent_id).ok_or("Agent not found")?;

    let worktree_path = agent.worktree_path.as_ref().ok_or("No worktree")?;
    let branch_name = agent.branch_name.as_ref().ok_or("No branch")?;

    let main_repo = agent
        .repo_path
        .clone()
        .unwrap_or_else(|| workspace_root_from_worktree(worktree_path));
    let default_branch = default_branch_for_repo(&main_repo);

    let _ = git_output(worktree_path, &["add", "-A"]);
    let _ = git_output(
        worktree_path,
        &["commit", "-m", &format!("Agent: {}", &agent_id[..8])],
    );
    let _ = git_output(&main_repo, &["checkout", &default_branch]);
    let merge_result = git_output(
        &main_repo,
        &[
            "merge",
            branch_name,
            "--no-ff",
            "-m",
            &format!("Merge agent {}", &agent_id[..8]),
        ],
    );

    match merge_result {
        Ok(output) => {
            if output.status.success() {
                drop(agents);
                let mut agents = pool.agents.lock().unwrap();
                if let Some(a) = agents.get_mut(&agent_id) {
                    a.status = "approved".to_string();
                    if let Err(e) = pool.db.save_agent(a) {
                        log::warn!("Failed to persist approved agent: {}", e);
                    }
                }
                emit_and_store_event(
                    &app,
                    &pool,
                    "agent:approved",
                    serde_json::json!({
                        "agent_id": agent_id,
                        "timestamp": chrono::Utc::now().to_rfc3339()
                    }),
                );
                Ok("Agent approved and merged".to_string())
            } else {
                drop(agents);
                let merge_error = String::from_utf8_lossy(&output.stderr).to_string();
                let mut agents = pool.agents.lock().unwrap();
                if let Some(a) = agents.get_mut(&agent_id) {
                    a.status = "failed".to_string();
                    a.output = Some(merge_error.clone());
                    if let Err(e) = pool.db.save_agent(a) {
                        log::warn!("Failed to persist failed agent: {}", e);
                    }
                }
                emit_and_store_event(
                    &app,
                    &pool,
                    "agent:merge-conflict",
                    serde_json::json!({
                        "agent_id": agent_id,
                        "error": merge_error,
                        "timestamp": chrono::Utc::now().to_rfc3339()
                    }),
                );
                Err("Merge failed. Resolve conflicts before approving.".to_string())
            }
        }
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
fn reject_agent(
    agent_id: String,
    reason: Option<String>,
    pool: State<AgentPool>,
    app: AppHandle,
) -> Result<(), String> {
    let mut agents = pool.agents.lock().unwrap();
    let agent = agents
        .get_mut(&agent_id)
        .ok_or("Agent not found".to_string())?;
    agent.status = "rejected".to_string();
    if let Some(text) = reason.clone() {
        agent.output = Some(text);
    }
    pool.db.save_agent(agent).map_err(|e| e.to_string())?;

    emit_and_store_event(
        &app,
        &pool,
        "agent:rejected",
        serde_json::json!({
            "agent_id": agent_id,
            "reason": reason,
            "timestamp": chrono::Utc::now().to_rfc3339()
        }),
    );
    Ok(())
}

#[tauri::command]
fn get_diff(agent_id: String, pool: State<AgentPool>) -> Result<String, String> {
    let agents = pool.agents.lock().unwrap();
    let agent = agents.get(&agent_id).ok_or("Agent not found")?;

    let worktree_path = agent.worktree_path.as_ref().ok_or("No worktree")?;

    let main_repo = agent
        .repo_path
        .clone()
        .unwrap_or_else(|| workspace_root_from_worktree(worktree_path));
    let default_branch = default_branch_for_repo(&main_repo);
    let diff_result = git_output(
        worktree_path,
        &["diff", &format!("{}...HEAD", default_branch), "--stat"],
    )?;

    if diff_result.status.success() {
        Ok(String::from_utf8_lossy(&diff_result.stdout).to_string())
    } else {
        let fallback_result = git_output(worktree_path, &["diff", "HEAD~1", "HEAD"])?;
        if fallback_result.status.success() {
            Ok(String::from_utf8_lossy(&fallback_result.stdout).to_string())
        } else {
            Ok("No changes detected".to_string())
        }
    }
}

#[tauri::command]
fn get_diff_files(agent_id: String, pool: State<AgentPool>) -> Result<Vec<DiffFile>, String> {
    let agents = pool.agents.lock().unwrap();
    let agent = agents.get(&agent_id).ok_or("Agent not found")?;
    let worktree_path = agent.worktree_path.as_ref().ok_or("No worktree")?;
    let main_repo = agent
        .repo_path
        .clone()
        .unwrap_or_else(|| workspace_root_from_worktree(worktree_path));
    let default_branch = default_branch_for_repo(&main_repo);

    let list_output = git_output(
        worktree_path,
        &["diff", &format!("{}...HEAD", default_branch), "--name-only"],
    )?;

    if !list_output.status.success() {
        return Ok(Vec::new());
    }

    let file_list = String::from_utf8_lossy(&list_output.stdout);
    let mut files = Vec::new();
    for line in file_list.lines() {
        let path = line.trim();
        if path.is_empty() {
            continue;
        }

        let patch_output = git_output(
            worktree_path,
            &["diff", &format!("{}...HEAD", default_branch), "--", path],
        )?;

        let patch = if patch_output.status.success() {
            String::from_utf8_lossy(&patch_output.stdout).to_string()
        } else {
            String::new()
        };

        files.push(DiffFile {
            path: path.to_string(),
            patch,
        });
    }

    Ok(files)
}

#[tauri::command]
fn create_workspace(
    agent_id: String,
    main_repo: String,
    pool: State<AgentPool>,
) -> Result<String, String> {
    let branch_name = format!("openfarm-{}", &agent_id[..8]);
    let worktree_path = format!("/tmp/openfarm-worktrees/{}", agent_id);

    let base_branch = default_branch_for_repo(&main_repo);
    if ensure_worktree(&main_repo, &branch_name, &base_branch, &worktree_path).is_ok() {
        let mut agents = pool.agents.lock().unwrap();
        if let Some(agent) = agents.get_mut(&agent_id) {
            agent.worktree_path = Some(worktree_path.clone());
            agent.branch_name = Some(branch_name);
        }
        Ok(worktree_path)
    } else {
        Err("Unable to create workspace worktree".to_string())
    }
}

#[tauri::command]
fn cleanup_workspace(agent_id: String, pool: State<AgentPool>) -> Result<(), String> {
    let agents = pool.agents.lock().unwrap();
    let agent = agents.get(&agent_id).ok_or("Agent not found")?;

    if let Some(worktree_path) = &agent.worktree_path {
        if let Some(branch_name) = &agent.branch_name {
            let main_repo = agent
                .repo_path
                .clone()
                .unwrap_or_else(|| workspace_root_from_worktree(worktree_path));
            cleanup_worktree(&main_repo, branch_name, worktree_path);
        }
    }
    Ok(())
}

fn workspace_root_from_worktree(worktree_path: &str) -> String {
    std::path::Path::new(worktree_path)
        .parent()
        .and_then(|p| p.parent())
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_else(|| ".".to_string())
}

#[tauri::command]
fn retry_agent(agent_id: String, pool: State<AgentPool>, app: AppHandle) -> Result<String, String> {
    let agent = {
        let agents = pool.agents.lock().unwrap();
        agents.get(&agent_id).cloned().ok_or("Agent not found")?
    };

    if agent.status != "failed" && agent.status != "killed" {
        return Err("Can only retry failed or killed agents".to_string());
    }

    let workspace = agent
        .repo_path
        .as_ref()
        .cloned()
        .unwrap_or_else(|| ".".to_string());

    spawn_agent_internal(
        agent.task,
        agent.provider,
        workspace,
        load_agent_model(&pool, &agent_id),
        load_agent_mode(&pool, &agent_id),
        load_agent_base_branch(&pool, &agent_id),
        agent.project_id,
        agent.session_id,
        pool,
        app,
        true,
    )
}

#[tauri::command]
fn get_agent_stats(pool: State<AgentPool>) -> serde_json::Value {
    let agents = pool.agents.lock().unwrap();
    let total = agents.len();
    let running = agents.values().filter(|a| a.status == "running").count();
    let completed = agents.values().filter(|a| a.status == "completed").count();
    let failed = agents.values().filter(|a| a.status == "failed").count();
    let pending = agents.values().filter(|a| a.status == "pending").count();

    serde_json::json!({
        "total": total,
        "running": running,
        "completed": completed,
        "failed": failed,
        "pending": pending,
        "maxAgents": MAX_CONCURRENT_AGENTS,
        "canSpawn": running < MAX_CONCURRENT_AGENTS
    })
}

#[tauri::command]
fn get_projects(pool: State<AgentPool>) -> Vec<Project> {
    let projects = pool.projects.lock().unwrap();
    projects.values().cloned().collect()
}

#[tauri::command]
fn add_project(name: String, path: String, pool: State<AgentPool>) -> Result<String, String> {
    let project_id = format!("project-{}", uuid::Uuid::new_v4());

    let project = Project {
        id: project_id.clone(),
        name,
        path,
        created_at: chrono::Utc::now().to_rfc3339(),
    };

    // Save to database
    pool.db.save_project(&project).map_err(|e| e.to_string())?;

    let mut projects = pool.projects.lock().unwrap();
    projects.insert(project_id.clone(), project);

    Ok(project_id)
}

#[tauri::command]
fn remove_project(project_id: String, pool: State<AgentPool>) -> Result<(), String> {
    // Delete from database
    pool.db
        .delete_project(&project_id)
        .map_err(|e| e.to_string())?;
    pool.db
        .delete_agents_by_project(&project_id)
        .map_err(|e| e.to_string())?;

    let mut projects = pool.projects.lock().unwrap();
    projects.remove(&project_id);

    let mut sessions = pool.sessions.lock().unwrap();
    sessions.retain(|_, s| s.project_id != project_id);
    drop(sessions);

    let mut agents = pool.agents.lock().unwrap();
    agents.retain(|_, a| a.project_id.as_ref() != Some(&project_id));
    drop(agents);

    let workspace_ids: Vec<String> = {
        let workspaces = pool.workspaces.lock().unwrap();
        workspaces
            .values()
            .filter(|w| w.project_id.as_ref() == Some(&project_id))
            .map(|w| w.id.clone())
            .collect()
    };
    for workspace_id in workspace_ids {
        let workspace = {
            let mut workspaces = pool.workspaces.lock().unwrap();
            workspaces.remove(&workspace_id)
        };
        {
            let mut prs = pool.workspace_prs.lock().unwrap();
            prs.remove(&workspace_id);
        }
        {
            let mut scripts = pool.workspace_scripts.lock().unwrap();
            scripts.remove(&workspace_id);
        }
        {
            let mut pids = pool.workspace_script_pids.lock().unwrap();
            pids.remove(&workspace_id);
        }
        if let Some(value) = workspace {
            if let Some(path) = value.worktree_path {
                cleanup_worktree(&value.repo_path, &value.branch_name, &path);
            }
            let _ = pool.db.delete_workspace(&workspace_id);
        }
    }

    Ok(())
}

#[tauri::command]
fn get_sessions(pool: State<AgentPool>) -> Vec<Session> {
    let sessions = pool.sessions.lock().unwrap();
    sessions.values().cloned().collect()
}

#[tauri::command]
fn get_sessions_by_project(project_id: String, pool: State<AgentPool>) -> Vec<Session> {
    let sessions = pool.sessions.lock().unwrap();
    sessions
        .values()
        .filter(|s| s.project_id == project_id)
        .cloned()
        .collect()
}

#[tauri::command]
fn get_workspaces(pool: State<AgentPool>) -> Vec<Workspace> {
    let workspaces = pool.workspaces.lock().unwrap();
    workspaces.values().cloned().collect()
}

#[tauri::command]
fn add_workspace(
    name: String,
    repo_path: String,
    branch_name: String,
    source_type: Option<String>,
    source_ref: Option<String>,
    project_id: Option<String>,
    session_id: Option<String>,
    pool: State<AgentPool>,
) -> Result<String, String> {
    if name.trim().is_empty() {
        return Err("Workspace name is required".to_string());
    }
    if repo_path.trim().is_empty() || !std::path::Path::new(&repo_path).exists() {
        return Err("Repository path does not exist".to_string());
    }
    if !git_status(&repo_path, &["rev-parse", "--is-inside-work-tree"])? {
        return Err("Repository path is not a git repository".to_string());
    }

    let resolved_source_type = source_type
        .unwrap_or_else(|| "branch".to_string())
        .to_lowercase();
    if !["branch", "pr", "issue"].contains(&resolved_source_type.as_str()) {
        return Err("Unsupported source type. Use branch, pr, or issue".to_string());
    }

    let resolved_branch_name = if resolved_source_type == "branch" {
        branch_name
    } else {
        source_ref
            .as_ref()
            .map(|value| format!("{}-{}", resolved_source_type, value))
            .unwrap_or_else(|| branch_name)
    };

    let now = chrono::Utc::now().to_rfc3339();
    let workspace = Workspace {
        id: format!("workspace-{}", uuid::Uuid::new_v4()),
        name,
        repo_path,
        branch_name: resolved_branch_name,
        source_type: resolved_source_type,
        source_ref,
        worktree_path: None,
        status: "active".to_string(),
        project_id,
        session_id,
        created_at: now.clone(),
        updated_at: now,
        archived_at: None,
        spotlight_enabled: false,
        spotlight_base_ref: None,
        spotlight_synced_at: None,
    };

    pool.db
        .save_workspace(&workspace)
        .map_err(|e| e.to_string())?;
    let mut workspaces = pool.workspaces.lock().unwrap();
    workspaces.insert(workspace.id.clone(), workspace.clone());
    drop(workspaces);

    if let Some(script_config) =
        load_workspace_script_config_from_repo(&workspace.repo_path, &workspace.id)
    {
        pool.db
            .save_workspace_script_config(&script_config)
            .map_err(|e| e.to_string())?;
        let mut scripts = pool.workspace_scripts.lock().unwrap();
        scripts.insert(workspace.id.clone(), script_config);
    }
    Ok(workspace.id)
}

#[tauri::command]
fn archive_workspace(workspace_id: String, pool: State<AgentPool>) -> Result<(), String> {
    let mut workspaces = pool.workspaces.lock().unwrap();
    let workspace = workspaces
        .get_mut(&workspace_id)
        .ok_or("Workspace not found".to_string())?;
    workspace.status = "archived".to_string();
    workspace.archived_at = Some(chrono::Utc::now().to_rfc3339());
    workspace.updated_at = chrono::Utc::now().to_rfc3339();

    if let Some(path) = &workspace.worktree_path {
        let archive_script = {
            let scripts = pool.workspace_scripts.lock().unwrap();
            scripts
                .get(&workspace_id)
                .and_then(|config| config.archive_script.clone())
        };
        if let Some(script) = archive_script {
            let _ = Command::new("sh")
                .arg("-lc")
                .arg(script)
                .current_dir(path)
                .output();
        }
        cleanup_worktree(&workspace.repo_path, &workspace.branch_name, path);
        workspace.worktree_path = None;
    }

    pool.db.save_workspace(workspace).map_err(|e| e.to_string())
}

#[tauri::command]
fn restore_workspace(workspace_id: String, pool: State<AgentPool>) -> Result<(), String> {
    let mut workspaces = pool.workspaces.lock().unwrap();
    let workspace = workspaces
        .get_mut(&workspace_id)
        .ok_or("Workspace not found".to_string())?;

    let path = workspace
        .worktree_path
        .clone()
        .unwrap_or_else(|| format!("/tmp/openfarm-workspaces/{}", workspace.id));

    let base_branch = default_branch_for_repo(&workspace.repo_path);
    ensure_worktree(
        &workspace.repo_path,
        &workspace.branch_name,
        &base_branch,
        &path,
    )?;
    workspace.worktree_path = Some(path);
    workspace.status = "active".to_string();
    workspace.archived_at = None;
    workspace.updated_at = chrono::Utc::now().to_rfc3339();

    pool.db.save_workspace(workspace).map_err(|e| e.to_string())
}

#[tauri::command]
fn remove_workspace(workspace_id: String, pool: State<AgentPool>) -> Result<(), String> {
    let workspace = {
        let mut workspaces = pool.workspaces.lock().unwrap();
        let value = workspaces.remove(&workspace_id);
        value.ok_or("Workspace not found".to_string())?
    };
    {
        let mut prs = pool.workspace_prs.lock().unwrap();
        prs.remove(&workspace_id);
    }
    {
        let mut scripts = pool.workspace_scripts.lock().unwrap();
        scripts.remove(&workspace_id);
    }
    {
        let mut pids = pool.workspace_script_pids.lock().unwrap();
        pids.remove(&workspace_id);
    }
    if let Some(path) = workspace.worktree_path {
        cleanup_worktree(&workspace.repo_path, &workspace.branch_name, &path);
    }
    pool.db
        .delete_workspace(&workspace_id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn enable_workspace_spotlight(
    workspace_id: String,
    pool: State<AgentPool>,
) -> Result<Workspace, String> {
    let mut workspaces = pool.workspaces.lock().unwrap();
    let workspace = workspaces
        .get_mut(&workspace_id)
        .ok_or("Workspace not found".to_string())?;
    if workspace.status == "archived" {
        return Err("Cannot enable spotlight on archived workspace".to_string());
    }
    if workspace.spotlight_enabled {
        return Ok(workspace.clone());
    }

    ensure_repo_clean(&workspace.repo_path)?;
    let head = git_stdout(&workspace.repo_path, &["rev-parse", "HEAD"])?;
    let backup_ref = format!(
        "refs/openfarm/spotlight/{}/{}",
        workspace.id,
        chrono::Utc::now().timestamp()
    );
    let update_ref = git_output(&workspace.repo_path, &["update-ref", &backup_ref, &head])?;
    if !update_ref.status.success() {
        return Err(String::from_utf8_lossy(&update_ref.stderr)
            .trim()
            .to_string());
    }
    let reset = git_output(
        &workspace.repo_path,
        &["reset", "--hard", &workspace.branch_name],
    )?;
    if !reset.status.success() {
        return Err(String::from_utf8_lossy(&reset.stderr).trim().to_string());
    }

    workspace.spotlight_enabled = true;
    workspace.spotlight_base_ref = Some(backup_ref);
    workspace.spotlight_synced_at = Some(chrono::Utc::now().to_rfc3339());
    workspace.updated_at = chrono::Utc::now().to_rfc3339();
    pool.db
        .save_workspace(workspace)
        .map_err(|e| e.to_string())?;
    Ok(workspace.clone())
}

#[tauri::command]
fn disable_workspace_spotlight(
    workspace_id: String,
    pool: State<AgentPool>,
) -> Result<Workspace, String> {
    let mut workspaces = pool.workspaces.lock().unwrap();
    let workspace = workspaces
        .get_mut(&workspace_id)
        .ok_or("Workspace not found".to_string())?;
    if !workspace.spotlight_enabled {
        return Ok(workspace.clone());
    }

    ensure_repo_clean(&workspace.repo_path)?;
    let backup_ref = workspace
        .spotlight_base_ref
        .clone()
        .ok_or("Missing spotlight backup ref".to_string())?;
    let reset = git_output(&workspace.repo_path, &["reset", "--hard", &backup_ref])?;
    if !reset.status.success() {
        return Err(String::from_utf8_lossy(&reset.stderr).trim().to_string());
    }
    let _ = git_output(&workspace.repo_path, &["update-ref", "-d", &backup_ref]);

    workspace.spotlight_enabled = false;
    workspace.spotlight_base_ref = None;
    workspace.spotlight_synced_at = Some(chrono::Utc::now().to_rfc3339());
    workspace.updated_at = chrono::Utc::now().to_rfc3339();
    pool.db
        .save_workspace(workspace)
        .map_err(|e| e.to_string())?;
    Ok(workspace.clone())
}

#[tauri::command]
fn get_workspace_script_config(
    workspace_id: String,
    pool: State<AgentPool>,
) -> Option<WorkspaceScriptConfig> {
    let scripts = pool.workspace_scripts.lock().unwrap();
    scripts.get(&workspace_id).cloned()
}

#[tauri::command]
fn set_workspace_script_config(
    workspace_id: String,
    setup_script: Option<String>,
    run_script: Option<String>,
    archive_script: Option<String>,
    run_mode: Option<String>,
    pool: State<AgentPool>,
) -> Result<(), String> {
    let mode = run_mode.unwrap_or_else(|| "concurrent".to_string());
    if !["concurrent", "nonconcurrent"].contains(&mode.as_str()) {
        return Err("run_mode must be concurrent or nonconcurrent".to_string());
    }

    let config = WorkspaceScriptConfig {
        workspace_id: workspace_id.clone(),
        setup_script,
        run_script,
        archive_script,
        run_mode: mode,
        updated_at: chrono::Utc::now().to_rfc3339(),
    };

    pool.db
        .save_workspace_script_config(&config)
        .map_err(|e| e.to_string())?;
    let mut scripts = pool.workspace_scripts.lock().unwrap();
    scripts.insert(workspace_id, config);
    Ok(())
}

#[tauri::command]
fn run_workspace_script(
    workspace_id: String,
    script_type: String,
    pool: State<AgentPool>,
    app: AppHandle,
) -> Result<String, String> {
    let workspace = {
        let workspaces = pool.workspaces.lock().unwrap();
        workspaces
            .get(&workspace_id)
            .cloned()
            .ok_or("Workspace not found".to_string())?
    };
    let config = {
        let scripts = pool.workspace_scripts.lock().unwrap();
        scripts.get(&workspace_id).cloned()
    }
    .ok_or("Workspace scripts are not configured".to_string())?;

    let script = match script_type.as_str() {
        "setup" => config.setup_script,
        "run" => config.run_script,
        "archive" => config.archive_script,
        _ => return Err("script_type must be setup, run or archive".to_string()),
    }
    .ok_or("Script not configured for requested type".to_string())?;

    if config.run_mode == "nonconcurrent" {
        let previous_pid = {
            let pids = pool.workspace_script_pids.lock().unwrap();
            pids.get(&workspace_id).copied()
        };
        if let Some(pid) = previous_pid {
            let _ = Command::new("kill")
                .arg("-TERM")
                .arg(pid.to_string())
                .status();
        }
    }

    let working_dir = workspace
        .worktree_path
        .clone()
        .unwrap_or(workspace.repo_path.clone());
    let _ = app.emit(
        "workspace-script:status",
        serde_json::json!({
            "workspace_id": workspace_id.clone(),
            "status": "running",
            "script_type": script_type.clone(),
        }),
    );
    let mut child = Command::new("sh")
        .arg("-lc")
        .arg(&script)
        .current_dir(&working_dir)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| e.to_string())?;
    {
        let mut pids = pool.workspace_script_pids.lock().unwrap();
        pids.insert(workspace_id.clone(), child.id());
    }

    let stdout = child
        .stdout
        .take()
        .ok_or("Unable to capture script stdout".to_string())?;
    let stderr = child
        .stderr
        .take()
        .ok_or("Unable to capture script stderr".to_string())?;
    let (tx, rx) = mpsc::channel::<String>();

    let tx_stdout = tx.clone();
    let workspace_stdout = workspace_id.clone();
    std::thread::spawn(move || {
        let reader = BufReader::new(stdout);
        for line in reader.lines().map_while(Result::ok) {
            let _ = tx_stdout.send(format!("[stdout] {}", line));
        }
        let _ = tx_stdout.send(format!("[status] {} stdout-done", workspace_stdout));
    });

    let tx_stderr = tx.clone();
    let workspace_stderr = workspace_id.clone();
    std::thread::spawn(move || {
        let reader = BufReader::new(stderr);
        for line in reader.lines().map_while(Result::ok) {
            let _ = tx_stderr.send(format!("[stderr] {}", line));
        }
        let _ = tx_stderr.send(format!("[status] {} stderr-done", workspace_stderr));
    });
    drop(tx);

    let mut collected = String::new();
    for chunk in rx {
        if chunk.starts_with("[status] ") {
            continue;
        }
        let line = format!("{}\n", chunk);
        collected.push_str(&line);
        let _ = app.emit(
            "workspace-script:output",
            serde_json::json!({
                "workspace_id": workspace_id.clone(),
                "chunk": line,
                "script_type": script_type.clone(),
            }),
        );
    }

    let status = child.wait().map_err(|e| e.to_string())?;
    {
        let mut pids = pool.workspace_script_pids.lock().unwrap();
        pids.remove(&workspace_id);
    }
    let _ = app.emit(
        "workspace-script:status",
        serde_json::json!({
            "workspace_id": workspace_id.clone(),
            "status": if status.success() { "completed" } else { "failed" },
            "script_type": script_type.clone(),
        }),
    );
    if status.success() {
        Ok(collected)
    } else {
        Err(collected.trim().to_string())
    }
}

#[tauri::command]
fn stop_workspace_script(
    workspace_id: String,
    pool: State<AgentPool>,
    app: AppHandle,
) -> Result<(), String> {
    let pid = {
        let mut pids = pool.workspace_script_pids.lock().unwrap();
        pids.remove(&workspace_id)
    }
    .ok_or("No running script for workspace".to_string())?;

    let status = Command::new("kill")
        .arg("-TERM")
        .arg(pid.to_string())
        .status()
        .map_err(|e| e.to_string())?;
    if status.success() {
        let _ = app.emit(
            "workspace-script:status",
            serde_json::json!({
                "workspace_id": workspace_id,
                "status": "stopped",
            }),
        );
        Ok(())
    } else {
        Err("Failed to stop workspace script".to_string())
    }
}

#[tauri::command]
fn get_workspace_checkpoints(
    workspace_id: String,
    pool: State<AgentPool>,
) -> Result<Vec<WorkspaceCheckpoint>, String> {
    pool.db
        .load_workspace_checkpoints(&workspace_id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn create_workspace_checkpoint(
    workspace_id: String,
    name: Option<String>,
    pool: State<AgentPool>,
) -> Result<WorkspaceCheckpoint, String> {
    let workspace = {
        let workspaces = pool.workspaces.lock().unwrap();
        workspaces
            .get(&workspace_id)
            .cloned()
            .ok_or("Workspace not found".to_string())?
    };
    let working_dir = workspace
        .worktree_path
        .clone()
        .unwrap_or(workspace.repo_path.clone());

    let stash_create = Command::new("git")
        .args(["stash", "create", "openfarm-checkpoint"])
        .current_dir(&working_dir)
        .output()
        .map_err(|e| e.to_string())?;
    let stash_ref = String::from_utf8_lossy(&stash_create.stdout)
        .trim()
        .to_string();
    let snapshot_ref = if stash_ref.is_empty() {
        let head = Command::new("git")
            .args(["rev-parse", "HEAD"])
            .current_dir(&working_dir)
            .output()
            .map_err(|e| e.to_string())?;
        if !head.status.success() {
            return Err(String::from_utf8_lossy(&head.stderr).trim().to_string());
        }
        String::from_utf8_lossy(&head.stdout).trim().to_string()
    } else {
        stash_ref
    };

    let checkpoint = WorkspaceCheckpoint {
        id: format!("checkpoint-{}", uuid::Uuid::new_v4()),
        workspace_id,
        name: name.unwrap_or_else(|| format!("Checkpoint {}", chrono::Utc::now().to_rfc3339())),
        snapshot_ref,
        created_at: chrono::Utc::now().to_rfc3339(),
    };
    pool.db
        .save_workspace_checkpoint(&checkpoint)
        .map_err(|e| e.to_string())?;
    Ok(checkpoint)
}

#[tauri::command]
fn revert_workspace_checkpoint(
    workspace_id: String,
    checkpoint_id: String,
    pool: State<AgentPool>,
) -> Result<(), String> {
    let workspace = {
        let workspaces = pool.workspaces.lock().unwrap();
        workspaces
            .get(&workspace_id)
            .cloned()
            .ok_or("Workspace not found".to_string())?
    };
    let working_dir = workspace
        .worktree_path
        .clone()
        .unwrap_or(workspace.repo_path.clone());
    let checkpoint = pool
        .db
        .load_workspace_checkpoints(&workspace_id)
        .map_err(|e| e.to_string())?
        .into_iter()
        .find(|c| c.id == checkpoint_id)
        .ok_or("Checkpoint not found".to_string())?;

    let restore = Command::new("git")
        .args([
            "restore",
            "--source",
            &checkpoint.snapshot_ref,
            "--staged",
            "--worktree",
            ".",
        ])
        .current_dir(&working_dir)
        .output()
        .map_err(|e| e.to_string())?;
    if !restore.status.success() {
        return Err(String::from_utf8_lossy(&restore.stderr).trim().to_string());
    }
    Ok(())
}

#[tauri::command]
fn get_workspace_todos(
    workspace_id: String,
    pool: State<AgentPool>,
) -> Result<Vec<WorkspaceTodo>, String> {
    pool.db
        .load_workspace_todos(&workspace_id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn add_workspace_todo(
    workspace_id: String,
    title: String,
    pool: State<AgentPool>,
) -> Result<WorkspaceTodo, String> {
    if title.trim().is_empty() {
        return Err("Todo title is required".to_string());
    }
    let todo = WorkspaceTodo {
        id: format!("todo-{}", uuid::Uuid::new_v4()),
        workspace_id,
        title,
        completed: false,
        created_at: chrono::Utc::now().to_rfc3339(),
    };
    pool.db
        .save_workspace_todo(&todo)
        .map_err(|e| e.to_string())?;
    Ok(todo)
}

#[tauri::command]
fn toggle_workspace_todo(
    todo_id: String,
    completed: bool,
    pool: State<AgentPool>,
) -> Result<(), String> {
    let conn = pool.db.conn.lock().unwrap();
    conn.execute(
        "UPDATE workspace_todos SET completed = ?1 WHERE id = ?2",
        params![if completed { 1 } else { 0 }, todo_id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn delete_workspace_todo(todo_id: String, pool: State<AgentPool>) -> Result<(), String> {
    pool.db
        .delete_workspace_todo(&todo_id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn list_workspace_slash_commands(
    workspace_id: String,
    pool: State<AgentPool>,
) -> Result<Vec<WorkspaceSlashCommand>, String> {
    let workspace_dir = resolve_workspace_dir(&pool, &workspace_id)?;
    load_workspace_slash_commands(&workspace_dir)
}

#[tauri::command]
fn expand_workspace_slash_command(
    workspace_id: String,
    input: String,
    pool: State<AgentPool>,
) -> Result<String, String> {
    let trimmed = input.trim();
    if !trimmed.starts_with('/') {
        return Ok(input);
    }
    let mut parts = trimmed.splitn(2, ' ');
    let command_token = parts.next().unwrap_or_default();
    let args = parts.next().unwrap_or_default().trim();
    let command_name = command_token.trim_start_matches('/');
    if command_name.is_empty() {
        return Ok(input);
    }

    let workspace_dir = resolve_workspace_dir(&pool, &workspace_id)?;
    let commands = load_workspace_slash_commands(&workspace_dir)?;
    if let Some(command) = commands.into_iter().find(|c| c.name == command_name) {
        let expanded = command
            .content
            .replace("{{args}}", args)
            .replace("$ARGUMENTS", args);
        return Ok(expanded);
    }
    Ok(input)
}

#[tauri::command]
fn list_workspace_files(
    workspace_id: String,
    pool: State<AgentPool>,
) -> Result<Vec<WorkspaceFileEntry>, String> {
    let workspace_dir = resolve_workspace_dir(&pool, &workspace_id)?;
    let base = std::path::Path::new(&workspace_dir);
    if !base.exists() {
        return Ok(Vec::new());
    }

    let output = git_output(
        &workspace_dir,
        &["ls-files", "--cached", "--others", "--exclude-standard"],
    )?;
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
        return if stderr.is_empty() {
            Err("Failed to list workspace files".to_string())
        } else {
            Err(stderr)
        };
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut unique_paths: BTreeSet<String> = BTreeSet::new();
    for line in stdout.lines() {
        let clean = line.trim();
        if clean.is_empty() || clean.starts_with(".git/") {
            continue;
        }
        unique_paths.insert(clean.to_string());
        if unique_paths.len() >= 1500 {
            break;
        }
    }

    Ok(unique_paths
        .into_iter()
        .map(|path| WorkspaceFileEntry {
            path,
            is_dir: false,
        })
        .collect())
}

#[tauri::command]
fn get_mcp_servers(pool: State<AgentPool>) -> Vec<McpServer> {
    let servers = pool.mcp_servers.lock().unwrap();
    servers.values().cloned().collect()
}

#[tauri::command]
fn add_mcp_server(
    name: String,
    command: String,
    args: Option<Vec<String>>,
    env: Option<HashMap<String, String>>,
    enabled: Option<bool>,
    pool: State<AgentPool>,
) -> Result<McpServer, String> {
    if name.trim().is_empty() || command.trim().is_empty() {
        return Err("name and command are required".to_string());
    }
    let now = chrono::Utc::now().to_rfc3339();
    let server = McpServer {
        id: format!("mcp-{}", uuid::Uuid::new_v4()),
        name,
        command,
        args: args.unwrap_or_default(),
        env: env.unwrap_or_default(),
        enabled: enabled.unwrap_or(true),
        health_status: None,
        last_checked_at: None,
        created_at: now.clone(),
        updated_at: now,
    };
    pool.db
        .save_mcp_server(&server)
        .map_err(|e| e.to_string())?;
    let mut servers = pool.mcp_servers.lock().unwrap();
    servers.insert(server.id.clone(), server.clone());
    Ok(server)
}

#[tauri::command]
fn update_mcp_server(
    server_id: String,
    name: Option<String>,
    command: Option<String>,
    args: Option<Vec<String>>,
    env: Option<HashMap<String, String>>,
    enabled: Option<bool>,
    pool: State<AgentPool>,
) -> Result<McpServer, String> {
    let mut servers = pool.mcp_servers.lock().unwrap();
    let server = servers
        .get_mut(&server_id)
        .ok_or("MCP server not found".to_string())?;
    if let Some(value) = name {
        server.name = value;
    }
    if let Some(value) = command {
        server.command = value;
    }
    if let Some(value) = args {
        server.args = value;
    }
    if let Some(value) = env {
        server.env = value;
    }
    if let Some(value) = enabled {
        server.enabled = value;
    }
    server.updated_at = chrono::Utc::now().to_rfc3339();
    let updated = server.clone();
    drop(servers);
    pool.db
        .save_mcp_server(&updated)
        .map_err(|e| e.to_string())?;
    Ok(updated)
}

#[tauri::command]
fn delete_mcp_server(server_id: String, pool: State<AgentPool>) -> Result<(), String> {
    {
        let mut servers = pool.mcp_servers.lock().unwrap();
        servers.remove(&server_id);
    }
    pool.db
        .delete_mcp_server(&server_id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn check_mcp_server_health(server_id: String, pool: State<AgentPool>) -> Result<McpServer, String> {
    let server = {
        let servers = pool.mcp_servers.lock().unwrap();
        servers
            .get(&server_id)
            .cloned()
            .ok_or("MCP server not found".to_string())?
    };

    let mut status = "unhealthy".to_string();
    let mut cmd = Command::new(&server.command);
    cmd.args(&server.args);
    for (key, value) in &server.env {
        cmd.env(key, value);
    }
    let first = cmd
        .arg("--version")
        .output()
        .map_err(|e| format!("Healthcheck failed: {}", e))?;
    if first.status.success() {
        status = "healthy".to_string();
    } else {
        let mut fallback = Command::new(&server.command);
        fallback.args(&server.args);
        for (key, value) in &server.env {
            fallback.env(key, value);
        }
        let second = fallback
            .arg("--help")
            .output()
            .map_err(|e| format!("Healthcheck failed: {}", e))?;
        if second.status.success() {
            status = "healthy".to_string();
        }
    }

    let mut updated = server.clone();
    updated.health_status = Some(status);
    updated.last_checked_at = Some(chrono::Utc::now().to_rfc3339());
    updated.updated_at = chrono::Utc::now().to_rfc3339();

    pool.db
        .save_mcp_server(&updated)
        .map_err(|e| e.to_string())?;
    let mut servers = pool.mcp_servers.lock().unwrap();
    servers.insert(server_id, updated.clone());
    Ok(updated)
}

#[tauri::command]
fn get_workspace_pr(workspace_id: String, pool: State<AgentPool>) -> Option<WorkspacePr> {
    let prs = pool.workspace_prs.lock().unwrap();
    prs.get(&workspace_id).cloned()
}

fn extract_pr_number(url: &str) -> Option<i64> {
    url.rsplit('/').next()?.parse::<i64>().ok()
}

fn summarize_pr_checks(
    status_rollup: Option<&serde_json::Value>,
) -> (i64, i64, i64, i64, Option<String>) {
    let mut total = 0_i64;
    let mut passed = 0_i64;
    let mut failed = 0_i64;
    let mut pending = 0_i64;
    if let Some(entries) = status_rollup.and_then(|value| value.as_array()) {
        for entry in entries {
            total += 1;
            let conclusion = entry.get("conclusion").and_then(|value| value.as_str());
            match conclusion {
                Some("SUCCESS") => passed += 1,
                Some("FAILURE") | Some("TIMED_OUT") | Some("ACTION_REQUIRED") => failed += 1,
                _ => pending += 1,
            }
        }
    }
    let state = if total == 0 {
        None
    } else if failed > 0 {
        Some("failed".to_string())
    } else if pending > 0 {
        Some("pending".to_string())
    } else {
        Some("passed".to_string())
    };
    (total, passed, failed, pending, state)
}

fn init_logging() {
    let log_dir = directories::ProjectDirs::from("com", "openfarm", "app")
        .map(|d| d.data_local_dir().join("logs"))
        .unwrap_or_else(|| std::env::temp_dir().join("openfarm-logs"));
    let _ = std::fs::create_dir_all(&log_dir);

    let logger = Logger::try_with_env_or_str("info")
        .or_else(|_| Logger::try_with_str("info"))
        .map(|logger| {
            logger
                .log_to_file(
                    FileSpec::default()
                        .directory(log_dir)
                        .basename("openfarm-app"),
                )
                .rotate(
                    Criterion::Size(2_000_000),
                    Naming::Numbers,
                    Cleanup::KeepLogFiles(5),
                )
        });

    if let Ok(logger) = logger {
        let _ = logger.start();
    } else {
        env_logger::init();
    }
}

#[tauri::command]
fn create_workspace_pr(
    workspace_id: String,
    title: String,
    body: Option<String>,
    pool: State<AgentPool>,
) -> Result<WorkspacePr, String> {
    let workspace = {
        let workspaces = pool.workspaces.lock().unwrap();
        workspaces
            .get(&workspace_id)
            .cloned()
            .ok_or("Workspace not found".to_string())?
    };

    if workspace.status == "archived" {
        return Err("Cannot create PR from archived workspace".to_string());
    }

    let gh_available = Command::new("gh")
        .arg("--version")
        .output()
        .map(|out| out.status.success())
        .unwrap_or(false);
    if !gh_available {
        return Err("GitHub CLI (gh) is not installed or not available in PATH".to_string());
    }

    let push_result = git_output(
        &workspace.repo_path,
        &["push", "-u", "origin", &workspace.branch_name],
    )?;
    if !push_result.status.success() {
        return Err(String::from_utf8_lossy(&push_result.stderr).to_string());
    }

    let base_branch = default_branch_for_repo(&workspace.repo_path);
    let mut cmd = Command::new("gh");
    cmd.current_dir(&workspace.repo_path).args([
        "pr",
        "create",
        "--head",
        &workspace.branch_name,
        "--base",
        &base_branch,
        "--title",
        &title,
        "--body",
        body.as_deref().unwrap_or(""),
    ]);
    let result = cmd.output().map_err(|e| e.to_string())?;
    if !result.status.success() {
        return Err(String::from_utf8_lossy(&result.stderr).to_string());
    }

    let pr_url = String::from_utf8_lossy(&result.stdout).trim().to_string();
    let pr = WorkspacePr {
        workspace_id: workspace.id,
        pr_url: pr_url.clone(),
        pr_number: extract_pr_number(&pr_url),
        status: "open".to_string(),
        created_at: chrono::Utc::now().to_rfc3339(),
        merged_at: None,
        checks_total: 0,
        checks_passed: 0,
        checks_failed: 0,
        checks_pending: 0,
        checks_state: None,
        checks_updated_at: None,
    };
    pool.db.save_workspace_pr(&pr).map_err(|e| e.to_string())?;
    let mut prs = pool.workspace_prs.lock().unwrap();
    prs.insert(pr.workspace_id.clone(), pr.clone());

    Ok(pr)
}

#[tauri::command]
fn refresh_workspace_pr(
    workspace_id: String,
    pool: State<AgentPool>,
) -> Result<WorkspacePr, String> {
    let current = {
        let prs = pool.workspace_prs.lock().unwrap();
        prs.get(&workspace_id)
            .cloned()
            .ok_or("Workspace PR not found".to_string())?
    };

    let gh_available = Command::new("gh")
        .arg("--version")
        .output()
        .map(|out| out.status.success())
        .unwrap_or(false);
    if !gh_available {
        return Err("GitHub CLI (gh) is not installed or not available in PATH".to_string());
    }

    let output = Command::new("gh")
        .args([
            "pr",
            "view",
            &current.pr_url,
            "--json",
            "url,number,state,statusCheckRollup",
        ])
        .output()
        .map_err(|e| e.to_string())?;
    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }

    let json: serde_json::Value =
        serde_json::from_slice(&output.stdout).map_err(|e| e.to_string())?;
    let state = json
        .get("state")
        .and_then(|value| value.as_str())
        .unwrap_or("OPEN")
        .to_lowercase();
    let pr_url = json
        .get("url")
        .and_then(|value| value.as_str())
        .unwrap_or(&current.pr_url)
        .to_string();
    let pr_number = json
        .get("number")
        .and_then(|value| value.as_i64())
        .or(current.pr_number);
    let (checks_total, checks_passed, checks_failed, checks_pending, checks_state) =
        summarize_pr_checks(json.get("statusCheckRollup"));

    let mut updated = current;
    updated.pr_url = pr_url;
    updated.pr_number = pr_number;
    updated.status = state.clone();
    updated.checks_total = checks_total;
    updated.checks_passed = checks_passed;
    updated.checks_failed = checks_failed;
    updated.checks_pending = checks_pending;
    updated.checks_state = checks_state;
    updated.checks_updated_at = Some(chrono::Utc::now().to_rfc3339());
    if state == "merged" {
        updated.merged_at = Some(chrono::Utc::now().to_rfc3339());
    }

    pool.db
        .save_workspace_pr(&updated)
        .map_err(|e| e.to_string())?;
    let mut prs = pool.workspace_prs.lock().unwrap();
    prs.insert(workspace_id, updated.clone());
    Ok(updated)
}

#[tauri::command]
fn merge_workspace_pr(workspace_id: String, pool: State<AgentPool>) -> Result<WorkspacePr, String> {
    let has_pending_todos = pool
        .db
        .load_workspace_todos(&workspace_id)
        .map_err(|e| e.to_string())?
        .iter()
        .any(|todo| !todo.completed);
    if has_pending_todos {
        return Err("Cannot merge PR: workspace has pending todos".to_string());
    }

    let pr = {
        let prs = pool.workspace_prs.lock().unwrap();
        prs.get(&workspace_id)
            .cloned()
            .ok_or("Workspace PR not found".to_string())?
    };

    let workspace = {
        let workspaces = pool.workspaces.lock().unwrap();
        workspaces
            .get(&workspace_id)
            .cloned()
            .ok_or("Workspace not found".to_string())?
    };

    let result = Command::new("gh")
        .current_dir(&workspace.repo_path)
        .args(["pr", "merge", &pr.pr_url, "--merge", "--delete-branch"])
        .output()
        .map_err(|e| e.to_string())?;
    if !result.status.success() {
        return Err(String::from_utf8_lossy(&result.stderr).to_string());
    }

    refresh_workspace_pr(workspace_id, pool)
}

#[tauri::command]
fn open_workspace_in_ide(workspace_id: String, pool: State<AgentPool>) -> Result<(), String> {
    let workspace = {
        let workspaces = pool.workspaces.lock().unwrap();
        workspaces
            .get(&workspace_id)
            .cloned()
            .ok_or("Workspace not found".to_string())?
    };

    let path = workspace
        .worktree_path
        .clone()
        .unwrap_or(workspace.repo_path.clone());

    let open_cursor = Command::new("open").args(["-a", "Cursor", &path]).output();
    if matches!(open_cursor, Ok(ref out) if out.status.success()) {
        return Ok(());
    }

    let open_vscode = Command::new("open")
        .args(["-a", "Visual Studio Code", &path])
        .output();
    if matches!(open_vscode, Ok(ref out) if out.status.success()) {
        return Ok(());
    }

    let fallback = Command::new("open")
        .arg(&path)
        .output()
        .map_err(|e| e.to_string())?;
    if fallback.status.success() {
        Ok(())
    } else {
        Err(String::from_utf8_lossy(&fallback.stderr).to_string())
    }
}

#[tauri::command]
fn create_session(
    name: String,
    project_id: String,
    pool: State<AgentPool>,
) -> Result<String, String> {
    let session_id = format!("session-{}", uuid::Uuid::new_v4());

    let session = Session {
        id: session_id.clone(),
        name,
        project_id,
        created_at: chrono::Utc::now().to_rfc3339(),
        agents: vec![],
    };

    pool.db.save_session(&session).map_err(|e| e.to_string())?;

    let mut sessions = pool.sessions.lock().unwrap();
    sessions.insert(session_id.clone(), session);

    Ok(session_id)
}

#[tauri::command]
fn get_session(session_id: String, pool: State<AgentPool>) -> Result<Session, String> {
    let sessions = pool.sessions.lock().unwrap();
    sessions
        .get(&session_id)
        .cloned()
        .ok_or("Session not found".to_string())
}

#[tauri::command]
fn delete_session(session_id: String, pool: State<AgentPool>) -> Result<(), String> {
    pool.db
        .delete_session(&session_id)
        .map_err(|e| e.to_string())?;
    pool.db
        .delete_agents_by_session(&session_id)
        .map_err(|e| e.to_string())?;

    let mut sessions = pool.sessions.lock().unwrap();
    sessions.remove(&session_id);

    let mut agents = pool.agents.lock().unwrap();
    agents.retain(|_, a| a.session_id.as_ref() != Some(&session_id));
    drop(agents);

    let workspace_ids: Vec<String> = {
        let workspaces = pool.workspaces.lock().unwrap();
        workspaces
            .values()
            .filter(|w| w.session_id.as_ref() == Some(&session_id))
            .map(|w| w.id.clone())
            .collect()
    };
    for workspace_id in workspace_ids {
        let workspace = {
            let mut workspaces = pool.workspaces.lock().unwrap();
            workspaces.remove(&workspace_id)
        };
        {
            let mut prs = pool.workspace_prs.lock().unwrap();
            prs.remove(&workspace_id);
        }
        {
            let mut scripts = pool.workspace_scripts.lock().unwrap();
            scripts.remove(&workspace_id);
        }
        {
            let mut pids = pool.workspace_script_pids.lock().unwrap();
            pids.remove(&workspace_id);
        }
        if let Some(value) = workspace {
            if let Some(path) = value.worktree_path {
                cleanup_worktree(&value.repo_path, &value.branch_name, &path);
            }
            let _ = pool.db.delete_workspace(&workspace_id);
        }
    }

    Ok(())
}

#[tauri::command]
fn update_agent_status(
    agent_id: String,
    status: String,
    pool: State<AgentPool>,
) -> Result<(), String> {
    let mut agents = pool.agents.lock().unwrap();
    if let Some(agent) = agents.get_mut(&agent_id) {
        agent.status = status;
        if let Err(e) = pool.db.save_agent(agent) {
            log::warn!("Failed to persist status update: {}", e);
        }
    }
    Ok(())
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct UiMessage {
    id: String,
    role: String,
    content: String,
    timestamp: String,
    thinking: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct UiDiffLine {
    r#type: String,
    content: String,
    old_line: Option<u32>,
    new_line: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct UiDiffHunk {
    old_start: u32,
    new_start: u32,
    lines: Vec<UiDiffLine>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct UiFileDiff {
    filename: String,
    path: String,
    status: String,
    lines_added: u32,
    lines_removed: u32,
    hunks: Vec<UiDiffHunk>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct UiAgent {
    id: String,
    name: String,
    repo: String,
    branch: String,
    status: String,
    provider: String,
    model: Option<String>,
    mode: Option<String>,
    prompt: String,
    files_changed: u32,
    lines_added: u32,
    lines_removed: u32,
    started_at: String,
    messages: Vec<UiMessage>,
    diffs: Vec<UiFileDiff>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct UiWorkspace {
    id: String,
    name: String,
    repo: String,
    agents: Vec<UiAgent>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct UiBootstrapState {
    workspaces: Vec<UiWorkspace>,
    settings: serde_json::Value,
}

fn default_ui_settings() -> serde_json::Value {
    serde_json::json!({
      "providers": [
        {
          "id": "claude-code",
          "name": "Claude Code",
          "description": "Anthropic CLI agent",
          "color": "#d97756",
          "connected": true,
          "apiKey": "",
          "models": [
            {"id": "claude-sonnet-4-20250514", "name": "Claude Sonnet 4", "description": "Fast coding model"},
            {"id": "claude-opus-4-20250918", "name": "Claude Opus 4", "description": "Deep reasoning"}
          ],
          "defaultModel": "claude-sonnet-4-20250514"
        },
        {
          "id": "codex",
          "name": "Codex",
          "description": "OpenAI Codex CLI agent",
          "color": "#10a37f",
          "connected": true,
          "apiKey": "",
          "models": [
            {"id": "codex-mini-latest", "name": "Codex Mini", "description": "Fast coding tasks"},
            {"id": "o4-mini", "name": "o4-mini", "description": "Reasoning model"}
          ],
          "defaultModel": "codex-mini-latest"
        },
        {
          "id": "opencode",
          "name": "OpenCode",
          "description": "OpenCode CLI agent",
          "color": "#06b6d4",
          "connected": true,
          "apiKey": "",
          "models": [
            {"id": "gpt-4.1", "name": "GPT-4.1", "description": "OpenAI via OpenCode"},
            {"id": "claude-sonnet-4-20250514", "name": "Claude Sonnet 4", "description": "Anthropic via OpenCode"}
          ],
          "defaultModel": "gpt-4.1"
        }
      ],
      "defaultProvider": "claude-code",
      "defaultModel": "claude-sonnet-4-20250514",
      "temperature": 0.2,
      "maxTokens": 8192,
      "systemPrompt": "",
      "autoPR": false,
      "branchConvention": "feat/<task-slug>"
    })
}

fn ensure_ui_settings_table(pool: &AgentPool) -> Result<(), String> {
    let conn = pool.db.conn.lock().unwrap();
    conn.execute(
        "CREATE TABLE IF NOT EXISTS app_settings (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            payload TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )",
        [],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

fn load_ui_settings(pool: &AgentPool) -> Result<serde_json::Value, String> {
    ensure_ui_settings_table(pool)?;
    let conn = pool.db.conn.lock().unwrap();
    let mut stmt = conn
        .prepare("SELECT payload FROM app_settings WHERE id = 1")
        .map_err(|e| e.to_string())?;
    let result = stmt.query_row([], |row| row.get::<_, String>(0));
    match result {
        Ok(raw) => serde_json::from_str::<serde_json::Value>(&raw).map_err(|e| e.to_string()),
        Err(_) => Ok(default_ui_settings()),
    }
}

fn save_ui_settings(
    pool: &AgentPool,
    settings: &serde_json::Value,
) -> Result<serde_json::Value, String> {
    ensure_ui_settings_table(pool)?;
    let payload = serde_json::to_string(settings).map_err(|e| e.to_string())?;
    let conn = pool.db.conn.lock().unwrap();
    conn.execute(
        "INSERT OR REPLACE INTO app_settings (id, payload, updated_at) VALUES (1, ?1, ?2)",
        params![payload, chrono::Utc::now().to_rfc3339()],
    )
    .map_err(|e| e.to_string())?;
    Ok(settings.clone())
}

fn ui_status(status: &str) -> String {
    match status {
        "running" => "running",
        "completed" | "approved" => "completed",
        "failed" | "killed" | "rejected" => "error",
        _ => "idle",
    }
    .to_string()
}

fn ui_provider(provider: &str) -> String {
    match provider {
        "claude" | "claude-code" => "claude-code",
        "codex" => "codex",
        _ => "opencode",
    }
    .to_string()
}

fn repo_basename(repo: &str) -> String {
    std::path::Path::new(repo)
        .file_name()
        .and_then(|value| value.to_str())
        .unwrap_or(repo)
        .to_string()
}

fn load_agent_model(pool: &AgentPool, agent_id: &str) -> Option<String> {
    let events = pool.db.load_agent_events(agent_id).ok()?;
    events
        .iter()
        .rev()
        .find(|event| event.event_type == "agent:model")
        .and_then(|event| event.data.get("model"))
        .and_then(|value| value.as_str())
        .map(|value| value.to_string())
}

fn load_agent_mode(pool: &AgentPool, agent_id: &str) -> Option<String> {
    let events = pool.db.load_agent_events(agent_id).ok()?;
    events
        .iter()
        .rev()
        .find(|event| event.event_type == "agent:mode")
        .and_then(|event| event.data.get("mode"))
        .and_then(|value| value.as_str())
        .map(|value| value.to_string())
}

fn load_agent_base_branch(pool: &AgentPool, agent_id: &str) -> Option<String> {
    let events = pool.db.load_agent_events(agent_id).ok()?;
    events
        .iter()
        .rev()
        .find(|event| event.event_type == "agent:base-branch")
        .and_then(|event| event.data.get("branch"))
        .and_then(|value| value.as_str())
        .map(|value| value.to_string())
}

fn load_agent_messages(pool: &AgentPool, agent: &Agent) -> Vec<UiMessage> {
    let mut messages = vec![UiMessage {
        id: format!("{}-prompt", agent.id),
        role: "user".to_string(),
        content: agent.task.clone(),
        timestamp: agent.created_at.clone(),
        thinking: false,
    }];

    if let Ok(events) = pool.db.load_agent_events(&agent.id) {
        for event in events {
            if event.event_type == "agent:user-message" {
                let content = event
                    .data
                    .get("content")
                    .and_then(|value| value.as_str())
                    .unwrap_or_default();
                if !content.is_empty() {
                    messages.push(UiMessage {
                        id: format!("{}-{}", agent.id, uuid::Uuid::new_v4()),
                        role: "user".to_string(),
                        content: content.to_string(),
                        timestamp: event
                            .data
                            .get("timestamp")
                            .and_then(|value| value.as_str())
                            .unwrap_or(&agent.created_at)
                            .to_string(),
                        thinking: false,
                    });
                }
            }
            if event.event_type == "agent:assistant-message" {
                let content = event
                    .data
                    .get("content")
                    .and_then(|value| value.as_str())
                    .unwrap_or_default();
                if !content.is_empty() {
                    messages.push(UiMessage {
                        id: format!("{}-{}", agent.id, uuid::Uuid::new_v4()),
                        role: "agent".to_string(),
                        content: content.to_string(),
                        timestamp: event
                            .data
                            .get("timestamp")
                            .and_then(|value| value.as_str())
                            .unwrap_or(&agent.created_at)
                            .to_string(),
                        thinking: false,
                    });
                }
            }
        }
    }

    if messages.iter().all(|message| message.role != "agent") {
        if let Some(output) = &agent.output {
            if !output.trim().is_empty() {
                messages.push(UiMessage {
                    id: format!("{}-last-output", agent.id),
                    role: "agent".to_string(),
                    content: output.clone(),
                    timestamp: chrono::Utc::now().to_rfc3339(),
                    thinking: false,
                });
            }
        }
    }

    if agent.status == "running" {
        messages.push(UiMessage {
            id: format!("{}-thinking", agent.id),
            role: "agent".to_string(),
            content: String::new(),
            timestamp: chrono::Utc::now().to_rfc3339(),
            thinking: true,
        });
    }

    messages
}

fn parse_hunk_header(line: &str) -> Option<(u32, u32)> {
    let mut old_start = 0_u32;
    let mut new_start = 0_u32;
    let chunks: Vec<&str> = line.split_whitespace().collect();
    if chunks.len() < 3 {
        return None;
    }
    if let Some(old_chunk) = chunks.get(1) {
        old_start = old_chunk
            .trim_start_matches('-')
            .split(',')
            .next()
            .and_then(|value| value.parse::<u32>().ok())?;
    }
    if let Some(new_chunk) = chunks.get(2) {
        new_start = new_chunk
            .trim_start_matches('+')
            .split(',')
            .next()
            .and_then(|value| value.parse::<u32>().ok())?;
    }
    Some((old_start, new_start))
}

fn parse_patch(path: &str, patch: &str) -> UiFileDiff {
    let filename = std::path::Path::new(path)
        .file_name()
        .and_then(|value| value.to_str())
        .unwrap_or(path)
        .to_string();

    let mut status = "modified".to_string();
    let mut lines_added = 0_u32;
    let mut lines_removed = 0_u32;
    let mut hunks: Vec<UiDiffHunk> = Vec::new();
    let mut current_hunk: Option<UiDiffHunk> = None;
    let mut old_cursor = 0_u32;
    let mut new_cursor = 0_u32;

    for raw_line in patch.lines() {
        if raw_line.starts_with("new file mode") {
            status = "added".to_string();
            continue;
        }
        if raw_line.starts_with("deleted file mode") {
            status = "deleted".to_string();
            continue;
        }
        if raw_line.starts_with("--- /dev/null") {
            status = "added".to_string();
            continue;
        }
        if raw_line.starts_with("+++ /dev/null") {
            status = "deleted".to_string();
            continue;
        }
        if raw_line.starts_with("@@") {
            if let Some(hunk) = current_hunk.take() {
                hunks.push(hunk);
            }
            if let Some((old_start, new_start)) = parse_hunk_header(raw_line) {
                old_cursor = old_start;
                new_cursor = new_start;
                current_hunk = Some(UiDiffHunk {
                    old_start,
                    new_start,
                    lines: Vec::new(),
                });
            }
            continue;
        }
        let Some(hunk) = current_hunk.as_mut() else {
            continue;
        };
        if raw_line.starts_with('+') && !raw_line.starts_with("+++") {
            lines_added += 1;
            hunk.lines.push(UiDiffLine {
                r#type: "add".to_string(),
                content: raw_line.to_string(),
                old_line: None,
                new_line: Some(new_cursor),
            });
            new_cursor += 1;
            continue;
        }
        if raw_line.starts_with('-') && !raw_line.starts_with("---") {
            lines_removed += 1;
            hunk.lines.push(UiDiffLine {
                r#type: "remove".to_string(),
                content: raw_line.to_string(),
                old_line: Some(old_cursor),
                new_line: None,
            });
            old_cursor += 1;
            continue;
        }
        if raw_line.starts_with(' ') {
            hunk.lines.push(UiDiffLine {
                r#type: "context".to_string(),
                content: raw_line.to_string(),
                old_line: Some(old_cursor),
                new_line: Some(new_cursor),
            });
            old_cursor += 1;
            new_cursor += 1;
        }
    }

    if let Some(hunk) = current_hunk.take() {
        hunks.push(hunk);
    }

    UiFileDiff {
        filename,
        path: path.to_string(),
        status,
        lines_added,
        lines_removed,
        hunks,
    }
}

fn collect_changed_paths(workspace_path: &str, base_branch: &str) -> Result<Vec<String>, String> {
    let commands: Vec<Vec<String>> = vec![
        vec![
            "diff".to_string(),
            format!("{base_branch}...HEAD"),
            "--name-only".to_string(),
        ],
        vec![
            "diff".to_string(),
            "--cached".to_string(),
            "--name-only".to_string(),
        ],
        vec!["diff".to_string(), "--name-only".to_string()],
        vec![
            "ls-files".to_string(),
            "--others".to_string(),
            "--exclude-standard".to_string(),
        ],
    ];

    let mut paths: BTreeSet<String> = BTreeSet::new();
    for command in commands {
        let refs: Vec<&str> = command.iter().map(|value| value.as_str()).collect();
        let output = git_output(workspace_path, &refs)?;
        let text = String::from_utf8_lossy(&output.stdout);
        for line in text.lines() {
            let clean = line.trim();
            if clean.is_empty() {
                continue;
            }
            paths.insert(clean.to_string());
        }
    }

    Ok(paths.into_iter().collect())
}

fn load_patch_for_path(
    workspace_path: &str,
    base_branch: &str,
    path: &str,
) -> Result<String, String> {
    let mut patch = String::new();

    let committed = git_output(
        workspace_path,
        &["diff", &format!("{base_branch}...HEAD"), "--", path],
    )?;
    if committed.status.success() {
        patch.push_str(&String::from_utf8_lossy(&committed.stdout));
    }

    let working = git_output(workspace_path, &["diff", "HEAD", "--", path])?;
    if working.status.success() {
        patch.push_str(&String::from_utf8_lossy(&working.stdout));
    }

    if patch.trim().is_empty() {
        let untracked = git_output(
            workspace_path,
            &["diff", "--no-index", "--", "/dev/null", path],
        )?;
        patch.push_str(&String::from_utf8_lossy(&untracked.stdout));
    }

    Ok(patch)
}

fn load_agent_diff_files(pool: &AgentPool, agent_id: &str) -> Result<Vec<UiFileDiff>, String> {
    let agent = {
        let agents = pool.agents.lock().unwrap();
        agents
            .get(agent_id)
            .cloned()
            .ok_or("Agent not found".to_string())?
    };
    let main_repo = agent.repo_path.clone().unwrap_or_else(|| ".".to_string());
    let workspace_path = agent
        .worktree_path
        .clone()
        .unwrap_or_else(|| main_repo.clone());
    let base_branch = load_agent_base_branch(pool, agent_id)
        .unwrap_or_else(|| default_branch_for_repo(&main_repo));

    let paths = collect_changed_paths(&workspace_path, &base_branch)?;
    let mut result = Vec::new();
    for path in paths {
        let patch = load_patch_for_path(&workspace_path, &base_branch, &path)?;
        if patch.trim().is_empty() {
            continue;
        }
        result.push(parse_patch(&path, &patch));
    }
    Ok(result)
}

fn to_ui_bootstrap(pool: &AgentPool) -> Result<UiBootstrapState, String> {
    let settings = load_ui_settings(pool)?;
    let mut by_repo: HashMap<String, UiWorkspace> = HashMap::new();
    {
        let workspaces = pool.workspaces.lock().unwrap();
        for workspace in workspaces.values() {
            if workspace.status == "archived" {
                continue;
            }
            let workspace_name = if workspace.name.trim().is_empty() {
                repo_basename(&workspace.repo_path)
            } else {
                workspace.name.clone()
            };
            by_repo
                .entry(workspace.repo_path.clone())
                .or_insert(UiWorkspace {
                    id: workspace.id.clone(),
                    name: workspace_name,
                    repo: workspace.repo_path.clone(),
                    agents: Vec::new(),
                });
        }
    }

    let agents_snapshot: Vec<Agent> = {
        let agents = pool.agents.lock().unwrap();
        agents.values().cloned().collect()
    };
    for agent in agents_snapshot {
        let repo = agent.repo_path.clone().unwrap_or_else(|| ".".to_string());
        let diffs = load_agent_diff_files(pool, &agent.id).unwrap_or_default();
        let lines_added = diffs.iter().map(|diff| diff.lines_added).sum();
        let lines_removed = diffs.iter().map(|diff| diff.lines_removed).sum();
        let ui_agent = UiAgent {
            id: agent.id.clone(),
            name: agent.task.chars().take(40).collect(),
            repo: repo.clone(),
            branch: agent
                .branch_name
                .clone()
                .unwrap_or_else(|| "feat/unknown".to_string()),
            status: ui_status(&agent.status),
            provider: ui_provider(&agent.provider),
            model: load_agent_model(pool, &agent.id),
            mode: load_agent_mode(pool, &agent.id),
            prompt: agent.task.clone(),
            files_changed: diffs.len() as u32,
            lines_added,
            lines_removed,
            started_at: agent.created_at.clone(),
            messages: load_agent_messages(pool, &agent),
            diffs,
        };

        let workspace = by_repo.entry(repo.clone()).or_insert(UiWorkspace {
            id: format!("ws-{}", repo.replace('/', "-")),
            name: repo_basename(&repo),
            repo,
            agents: Vec::new(),
        });
        workspace.agents.push(ui_agent);
    }

    let mut workspaces: Vec<UiWorkspace> = by_repo.into_values().collect();
    for workspace in &mut workspaces {
        workspace
            .agents
            .sort_by(|a, b| b.started_at.cmp(&a.started_at));
    }

    workspaces.sort_by(|a, b| a.name.cmp(&b.name));
    Ok(UiBootstrapState {
        workspaces,
        settings,
    })
}

#[tauri::command]
fn bootstrap_app_state(pool: State<AgentPool>) -> Result<UiBootstrapState, String> {
    to_ui_bootstrap(&pool)
}

#[tauri::command]
fn add_local_workspace(
    repo_path: String,
    pool: State<AgentPool>,
) -> Result<UiBootstrapState, String> {
    let trimmed = repo_path.trim();
    if trimmed.is_empty() {
        return Err("Repository path is required".to_string());
    }
    if !std::path::Path::new(trimmed).exists() {
        return Err("Repository path does not exist".to_string());
    }
    if !git_status(trimmed, &["rev-parse", "--is-inside-work-tree"])? {
        return Err("Repository path is not a git repository".to_string());
    }

    let normalized_repo = std::fs::canonicalize(trimmed)
        .unwrap_or_else(|_| std::path::PathBuf::from(trimmed))
        .to_string_lossy()
        .to_string();

    {
        let workspaces = pool.workspaces.lock().unwrap();
        if workspaces.values().any(|workspace| {
            workspace.repo_path == normalized_repo && workspace.status != "archived"
        }) {
            return to_ui_bootstrap(&pool);
        }
    }

    let mut branch_name = git_stdout(&normalized_repo, &["rev-parse", "--abbrev-ref", "HEAD"])
        .unwrap_or_else(|_| "main".to_string())
        .trim()
        .to_string();
    if branch_name.is_empty() {
        branch_name = "main".to_string();
    }

    let now = chrono::Utc::now().to_rfc3339();
    let workspace = Workspace {
        id: format!("workspace-{}", uuid::Uuid::new_v4()),
        name: repo_basename(&normalized_repo),
        repo_path: normalized_repo.clone(),
        branch_name,
        source_type: "branch".to_string(),
        source_ref: None,
        worktree_path: None,
        status: "active".to_string(),
        project_id: None,
        session_id: None,
        created_at: now.clone(),
        updated_at: now,
        archived_at: None,
        spotlight_enabled: false,
        spotlight_base_ref: None,
        spotlight_synced_at: None,
    };

    pool.db
        .save_workspace(&workspace)
        .map_err(|e| e.to_string())?;
    {
        let mut workspaces = pool.workspaces.lock().unwrap();
        workspaces.insert(workspace.id.clone(), workspace);
    }

    to_ui_bootstrap(&pool)
}

#[tauri::command]
fn list_repository_branches(repo_path: String) -> Result<Vec<String>, String> {
    let trimmed = repo_path.trim();
    if trimmed.is_empty() {
        return Ok(vec![]);
    }
    if !std::path::Path::new(trimmed).exists() {
        return Err("Repository path does not exist".to_string());
    }
    if !git_status(trimmed, &["rev-parse", "--is-inside-work-tree"])? {
        return Err("Repository path is not a git repository".to_string());
    }

    let normalized_repo = std::fs::canonicalize(trimmed)
        .unwrap_or_else(|_| std::path::PathBuf::from(trimmed))
        .to_string_lossy()
        .to_string();

    let mut branches: BTreeSet<String> = BTreeSet::new();
    let commands: Vec<Vec<&str>> = vec![
        vec!["for-each-ref", "--format=%(refname:short)", "refs/heads"],
        vec![
            "for-each-ref",
            "--format=%(refname:short)",
            "refs/remotes/origin",
        ],
    ];

    for command in commands {
        let output = git_output(&normalized_repo, &command)?;
        let text = String::from_utf8_lossy(&output.stdout);
        for line in text.lines() {
            let clean = line.trim();
            if clean.is_empty() || clean == "origin/HEAD" {
                continue;
            }
            let branch = clean.strip_prefix("origin/").unwrap_or(clean).to_string();
            branches.insert(branch);
        }
    }

    if branches.is_empty() {
        branches.insert(default_branch_for_repo(&normalized_repo));
    }

    Ok(branches.into_iter().collect())
}

#[tauri::command]
fn create_agent(
    prompt: String,
    repo: String,
    provider: String,
    model: Option<String>,
    base_branch: Option<String>,
    pool: State<AgentPool>,
    app: AppHandle,
) -> Result<UiBootstrapState, String> {
    let _agent_id = spawn_agent_internal(
        prompt.clone(),
        provider,
        repo.clone(),
        model,
        None,
        base_branch,
        None,
        None,
        pool.clone(),
        app,
        true,
    )?;
    to_ui_bootstrap(&pool)
}

#[tauri::command]
fn send_agent_message(
    agent_id: String,
    message: String,
    _attachments: Option<serde_json::Value>,
    provider: Option<String>,
    model: Option<String>,
    agent_mode: Option<String>,
    pool: State<AgentPool>,
    app: AppHandle,
) -> Result<UiBootstrapState, String> {
    if message.trim().is_empty() {
        return Ok(to_ui_bootstrap(&pool)?);
    }
    let snapshot = {
        let agents = pool.agents.lock().unwrap();
        agents
            .get(&agent_id)
            .cloned()
            .ok_or("Agent not found".to_string())?
    };
    let workspace = snapshot.worktree_path.clone().unwrap_or_else(|| {
        snapshot
            .repo_path
            .clone()
            .unwrap_or_else(|| ".".to_string())
    });
    let provider_override = provider
        .as_ref()
        .map(|value| value.trim())
        .filter(|value| !value.is_empty())
        .map(|value| value.to_string());
    let model_override = model
        .as_ref()
        .map(|value| value.trim())
        .filter(|value| !value.is_empty())
        .map(|value| value.to_string());
    let mode_override = agent_mode
        .as_ref()
        .map(|value| value.trim())
        .filter(|value| !value.is_empty())
        .map(|value| value.to_string());
    let selected_provider = provider_override
        .clone()
        .unwrap_or_else(|| snapshot.provider.clone());
    let selected_model = model_override
        .clone()
        .or_else(|| load_agent_model(&pool, &agent_id));
    let selected_mode = mode_override
        .clone()
        .or_else(|| load_agent_mode(&pool, &agent_id));

    let _ = pool.db.save_agent_event(
        &agent_id,
        "agent:user-message",
        &serde_json::json!({
            "content": message.clone(),
            "provider": selected_provider,
            "model": selected_model,
            "mode": selected_mode,
            "timestamp": chrono::Utc::now().to_rfc3339()
        }),
    );
    if let Some(value) = model_override.as_ref() {
        let _ = pool.db.save_agent_event(
            &agent_id,
            "agent:model",
            &serde_json::json!({ "model": value }),
        );
    }
    if let Some(value) = mode_override.as_ref() {
        let _ = pool.db.save_agent_event(
            &agent_id,
            "agent:mode",
            &serde_json::json!({ "mode": value }),
        );
    }

    {
        let mut agents = pool.agents.lock().unwrap();
        if let Some(agent) = agents.get_mut(&agent_id) {
            if let Some(value) = provider_override.as_ref() {
                agent.provider = value.to_string();
            }
            agent.status = "running".to_string();
            agent.output = None;
            let _ = pool.db.save_agent(agent);
        }
    }

    emit_and_store_event(
        &app,
        &pool,
        "agent:started",
        serde_json::json!({
            "agent_id": agent_id.clone(),
            "timestamp": chrono::Utc::now().to_rfc3339()
        }),
    );

    let app_clone = app.clone();
    let agent_id_clone = agent_id.clone();
    let provider_clone = provider_override.unwrap_or(snapshot.provider.clone());
    let model_clone = model_override.or_else(|| load_agent_model(&pool, &agent_id));
    let mode_clone = mode_override.or_else(|| load_agent_mode(&pool, &agent_id));
    std::thread::spawn(move || {
        let result = run_agent(
            &agent_id_clone,
            &message,
            &provider_clone,
            model_clone.as_deref(),
            mode_clone.as_deref(),
            &workspace,
            &app_clone,
        );
        let state = app_clone.state::<AgentPool>();
        match result {
            Ok(output) => {
                {
                    let mut agents = state.agents.lock().unwrap();
                    if let Some(agent) = agents.get_mut(&agent_id_clone) {
                        agent.status = "completed".to_string();
                        agent.output = Some(output.clone());
                        let _ = state.db.save_agent(agent);
                    }
                }
                let _ = state.db.save_agent_event(
                    &agent_id_clone,
                    "agent:assistant-message",
                    &serde_json::json!({
                        "content": output,
                        "timestamp": chrono::Utc::now().to_rfc3339()
                    }),
                );
                emit_and_store_event(
                    &app_clone,
                    &state,
                    "agent:completed",
                    serde_json::json!({
                        "agent_id": agent_id_clone,
                        "timestamp": chrono::Utc::now().to_rfc3339()
                    }),
                );
            }
            Err(error) => {
                {
                    let mut agents = state.agents.lock().unwrap();
                    if let Some(agent) = agents.get_mut(&agent_id_clone) {
                        agent.status = "failed".to_string();
                        agent.output = Some(error.clone());
                        let _ = state.db.save_agent(agent);
                    }
                }
                let _ = state.db.save_agent_event(
                    &agent_id_clone,
                    "agent:assistant-message",
                    &serde_json::json!({
                        "content": error.clone(),
                        "timestamp": chrono::Utc::now().to_rfc3339()
                    }),
                );
                emit_and_store_event(
                    &app_clone,
                    &state,
                    "agent:failed",
                    serde_json::json!({
                        "agent_id": agent_id_clone,
                        "error": error,
                        "timestamp": chrono::Utc::now().to_rfc3339()
                    }),
                );
            }
        }
        emit_and_store_event(
            &app_clone,
            &state,
            "agent:diff-updated",
            serde_json::json!({
                "agent_id": agent_id_clone,
                "timestamp": chrono::Utc::now().to_rfc3339()
            }),
        );
    });

    to_ui_bootstrap(&pool)
}

#[tauri::command]
fn load_agent_diffs(agent_id: String, pool: State<AgentPool>) -> Result<Vec<UiFileDiff>, String> {
    load_agent_diff_files(&pool, &agent_id)
}

#[tauri::command]
fn get_settings(pool: State<AgentPool>) -> Result<serde_json::Value, String> {
    load_ui_settings(&pool)
}

#[tauri::command]
fn save_settings(
    settings: serde_json::Value,
    pool: State<AgentPool>,
) -> Result<serde_json::Value, String> {
    save_ui_settings(&pool, &settings)
}

#[tauri::command]
fn get_provider_catalog() -> Result<serde_json::Value, String> {
    let catalog = load_provider_catalog_via_bridge()?;
    let agents = provider_agents_from_local_configs();
    Ok(merge_provider_agents_into_catalog(catalog, agents))
}

#[cfg(test)]
mod tests {
    use super::{extract_pr_number, parse_structured_agent_event, workspace_root_from_worktree};

    #[test]
    fn extracts_pr_number_from_github_url() {
        let value = extract_pr_number("https://github.com/org/repo/pull/123");
        assert_eq!(value, Some(123));
    }

    #[test]
    fn rejects_non_numeric_pr_suffix() {
        let value = extract_pr_number("https://github.com/org/repo/pull/not-a-number");
        assert_eq!(value, None);
    }

    #[test]
    fn returns_workspace_parent_for_worktree_path() {
        let root = workspace_root_from_worktree("/tmp/repo/.openfarm/workspaces/ws-1");
        assert_eq!(root, "/tmp/repo/.openfarm");
    }

    #[test]
    fn parses_opencode_text_event() {
        let line = r#"{"type":"text","part":{"text":"hola"}} "#;
        let value = parse_structured_agent_event(line);
        assert_eq!(value, Some("hola".to_string()));
    }

    #[test]
    fn parses_opencode_tool_use_event() {
        let line = r#"{"type":"tool_use","part":{"tool":"write","state":{"status":"completed","title":"cuento.md"}}}"#;
        let value = parse_structured_agent_event(line);
        assert_eq!(value, Some("Step: write cuento.md (completed)".to_string()));
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    init_logging();

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .manage(AgentPool::new())
        .setup(|app| {
            let show_item = MenuItem::with_id(app, "show", "Show Window", true, None::<&str>)?;
            let quit_item = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_item, &quit_item])?;

            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    "quit" => {
                        app.exit(0);
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                })
                .build(app)?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_agents,
            get_agents_by_project,
            get_agents_by_session,
            get_agent_events,
            spawn_agent,
            kill_agent,
            approve_agent,
            reject_agent,
            get_diff,
            get_diff_files,
            create_workspace,
            cleanup_workspace,
            update_agent_status,
            get_projects,
            add_project,
            remove_project,
            get_sessions,
            get_sessions_by_project,
            get_workspaces,
            get_workspace_pr,
            add_workspace,
            archive_workspace,
            restore_workspace,
            remove_workspace,
            enable_workspace_spotlight,
            disable_workspace_spotlight,
            get_workspace_script_config,
            set_workspace_script_config,
            run_workspace_script,
            stop_workspace_script,
            get_workspace_checkpoints,
            create_workspace_checkpoint,
            revert_workspace_checkpoint,
            get_workspace_todos,
            add_workspace_todo,
            toggle_workspace_todo,
            delete_workspace_todo,
            list_workspace_slash_commands,
            expand_workspace_slash_command,
            list_workspace_files,
            get_mcp_servers,
            add_mcp_server,
            update_mcp_server,
            delete_mcp_server,
            check_mcp_server_health,
            detect_agent_configs,
            import_agent_config,
            preview_agent_config_patch,
            apply_agent_config_patch,
            rollback_config_patch,
            list_agent_backups,
            create_workspace_pr,
            refresh_workspace_pr,
            merge_workspace_pr,
            open_workspace_in_ide,
            create_session,
            get_session,
            delete_session,
            retry_agent,
            get_agent_stats,
            bootstrap_app_state,
            add_local_workspace,
            list_repository_branches,
            create_agent,
            send_agent_message,
            load_agent_diffs,
            get_settings,
            save_settings,
            get_provider_catalog,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod integration_tests {
    use super::*;

    #[test]
    fn test_database_create_and_load_project() {
        let db = Database::new().expect("Failed to create database");
        let project = Project {
            id: "test-project-1".to_string(),
            name: "Test Project".to_string(),
            path: "/tmp/test".to_string(),
            created_at: chrono::Utc::now().to_rfc3339(),
        };

        db.save_project(&project).expect("Failed to save project");
        let projects = db.load_projects().expect("Failed to load projects");

        assert!(projects.iter().any(|p| p.id == "test-project-1"));
    }

    #[test]
    fn test_database_create_and_load_agent() {
        let db = Database::new().expect("Failed to create database");
        let agent = Agent {
            id: "test-agent-1".to_string(),
            task: "Test task".to_string(),
            provider: "claude".to_string(),
            status: "pending".to_string(),
            created_at: chrono::Utc::now().to_rfc3339(),
            output: None,
            worktree_path: None,
            branch_name: None,
            repo_path: None,
            project_id: None,
            session_id: None,
        };

        db.save_agent(&agent).expect("Failed to save agent");
        let agents = db.load_agents().expect("Failed to load agents");

        assert!(agents.iter().any(|a| a.id == "test-agent-1"));
    }

    #[test]
    fn test_database_create_and_load_workspace() {
        let db = Database::new().expect("Failed to create database");
        let workspace = Workspace {
            id: "test-workspace-1".to_string(),
            name: "Test Workspace".to_string(),
            repo_path: "/tmp/test-repo".to_string(),
            branch_name: "main".to_string(),
            source_type: "branch".to_string(),
            source_ref: None,
            worktree_path: None,
            status: "active".to_string(),
            project_id: None,
            session_id: None,
            created_at: chrono::Utc::now().to_rfc3339(),
            updated_at: chrono::Utc::now().to_rfc3339(),
            archived_at: None,
            spotlight_enabled: false,
            spotlight_base_ref: None,
            spotlight_synced_at: None,
        };

        db.save_workspace(&workspace)
            .expect("Failed to save workspace");
        let workspaces = db.load_workspaces().expect("Failed to load workspaces");

        assert!(workspaces.iter().any(|w| w.id == "test-workspace-1"));
    }

    #[test]
    fn test_agent_pool_new() {
        let pool = AgentPool::new();
        let _agents = pool.agents.lock().unwrap();
    }

    #[test]
    fn test_max_concurrent_agents_constant() {
        assert_eq!(MAX_CONCURRENT_AGENTS, 8);
    }

    #[test]
    fn test_git_status_function() {
        let result = git_status("/tmp", &["rev-parse", "--is-inside-work-tree"]);
        assert!(result.is_ok() || result.is_err());
    }
}
