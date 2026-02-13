use directories;
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::process::Command;
use std::sync::Mutex;
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, Manager, State,
};

pub struct Database {
    conn: Mutex<Connection>,
}

impl Database {
    pub fn new() -> Result<Self, rusqlite::Error> {
        let db_dir = directories::ProjectDirs::from("com", "openfarm", "desktop")
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
    pub project_id: Option<String>,
    pub session_id: Option<String>,
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

pub struct AgentPool {
    agents: Mutex<HashMap<String, Agent>>,
    projects: Mutex<HashMap<String, Project>>,
    sessions: Mutex<HashMap<String, Session>>,
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

        Self {
            agents: Mutex::new(HashMap::new()),
            projects: Mutex::new(projects_map),
            sessions: Mutex::new(sessions_map),
            db,
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
fn spawn_agent(
    task: String,
    provider: String,
    workspace: String,
    project_id: Option<String>,
    session_id: Option<String>,
    pool: State<AgentPool>,
    app: AppHandle,
) -> Result<String, String> {
    // Check max agents limit
    {
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
    let worktree_path = format!("/tmp/openfarm-worktrees/{}", agent_id);

    let git_result = Command::new("sh")
        .args(&[
            "-c",
            &format!(
                "cd {} && git branch {} && git worktree add {} {}",
                workspace, branch_name, worktree_path, branch_name
            ),
        ])
        .output();

    match git_result {
        Ok(output) => {
            if !output.status.success() {
                log::warn!(
                    "Failed to create worktree: {:?}",
                    String::from_utf8_lossy(&output.stderr)
                );
            }
        }
        Err(e) => {
            log::warn!("Failed to run git command: {}", e);
        }
    }

    let agent = Agent {
        id: agent_id.clone(),
        task: task.clone(),
        provider: provider.clone(),
        status: "running".to_string(),
        created_at: chrono::Utc::now().to_rfc3339(),
        output: None,
        worktree_path: Some(worktree_path),
        branch_name: Some(branch_name),
        project_id: project_id.clone(),
        session_id: session_id.clone(),
    };

    {
        let mut agents = pool.agents.lock().unwrap();
        agents.insert(agent_id.clone(), agent);
    }

    // Emit event for agent started
    let _ = app.emit(
        "agent:started",
        serde_json::json!({
            "agent_id": agent_id,
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
    let workspace_clone = workspace;
    let agent_id_clone = agent_id.clone();

    std::thread::spawn(move || {
        let _ = run_agent(
            &agent_id_clone,
            &task_clone,
            &provider_clone,
            &workspace_clone,
        );
    });

    Ok(agent_id)
}

fn run_agent(_agent_id: &str, task: &str, provider: &str, workspace: &str) -> Result<(), String> {
    let cli = match provider {
        "aider" => "aider",
        "claude" => "claude",
        "opencode" => "opencode",
        _ => "opencode",
    };

    let _output = Command::new(cli)
        .args(&[task])
        .current_dir(workspace)
        .output()
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
fn kill_agent(agent_id: String, pool: State<AgentPool>, app: AppHandle) -> Result<(), String> {
    let mut agents = pool.agents.lock().unwrap();
    if let Some(agent) = agents.get_mut(&agent_id) {
        agent.status = "failed".to_string();
    }
    let _ = app.emit(
        "agent:failed",
        serde_json::json!({
            "agent_id": agent_id,
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

    let main_repo = std::path::Path::new(worktree_path)
        .parent()
        .and_then(|p| p.parent())
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_else(|| ".".to_string());

    let _commit_result = Command::new("sh")
        .args(&[
            "-c",
            &format!(
                "cd {} && git add -A && git commit -m 'Agent: {}' || true",
                worktree_path,
                &agent_id[..8]
            ),
        ])
        .output();

    let merge_result = Command::new("sh")
        .args(&[
            "-c",
            &format!(
                "cd {} && git checkout main && git merge {} --no-ff -m 'Merge agent {}'",
                main_repo,
                branch_name,
                &agent_id[..8]
            ),
        ])
        .output();

    match merge_result {
        Ok(output) => {
            if output.status.success() {
                drop(agents);
                let mut agents = pool.agents.lock().unwrap();
                if let Some(a) = agents.get_mut(&agent_id) {
                    a.status = "approved".to_string();
                }
                let _ = app.emit(
                    "agent:approved",
                    serde_json::json!({
                        "agent_id": agent_id,
                        "timestamp": chrono::Utc::now().to_rfc3339()
                    }),
                );
                Ok("Agent approved and merged".to_string())
            } else {
                Ok(format!(
                    "Merge attempted: {}",
                    String::from_utf8_lossy(&output.stderr)
                ))
            }
        }
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
fn get_diff(agent_id: String, pool: State<AgentPool>) -> Result<String, String> {
    let agents = pool.agents.lock().unwrap();
    let agent = agents.get(&agent_id).ok_or("Agent not found")?;

    let worktree_path = agent.worktree_path.as_ref().ok_or("No worktree")?;

    let diff_result = Command::new("sh")
        .args(&[
            "-c",
            &format!(
                "cd {} && git diff main...HEAD --stat || git diff HEAD~1 HEAD",
                worktree_path
            ),
        ])
        .output()
        .map_err(|e| e.to_string())?;

    if diff_result.status.success() {
        Ok(String::from_utf8_lossy(&diff_result.stdout).to_string())
    } else {
        Ok("No changes detected".to_string())
    }
}

#[tauri::command]
fn create_workspace(
    agent_id: String,
    main_repo: String,
    pool: State<AgentPool>,
) -> Result<String, String> {
    let branch_name = format!("openfarm-{}", &agent_id[..8]);
    let worktree_path = format!("/tmp/openfarm-worktrees/{}", agent_id);

    let result = Command::new("sh")
        .args(&[
            "-c",
            &format!(
                "cd {} && git branch {} && git worktree add {} {}",
                main_repo, branch_name, worktree_path, branch_name
            ),
        ])
        .output()
        .map_err(|e| e.to_string())?;

    if result.status.success() {
        let mut agents = pool.agents.lock().unwrap();
        if let Some(agent) = agents.get_mut(&agent_id) {
            agent.worktree_path = Some(worktree_path.clone());
            agent.branch_name = Some(branch_name);
        }
        Ok(worktree_path)
    } else {
        Err(String::from_utf8_lossy(&result.stderr).to_string())
    }
}

#[tauri::command]
fn cleanup_workspace(agent_id: String, pool: State<AgentPool>) -> Result<(), String> {
    let agents = pool.agents.lock().unwrap();
    let agent = agents.get(&agent_id).ok_or("Agent not found")?;

    if let Some(worktree_path) = &agent.worktree_path {
        if let Some(branch_name) = &agent.branch_name {
            let _ = Command::new("sh")
                .args(&["-c", &format!("rm -rf {} && cd /tmp/openfarm-worktrees && git branch -D {} 2>/dev/null || true", worktree_path, branch_name)])
                .output();
        }
    }
    Ok(())
}

#[tauri::command]
fn retry_agent(agent_id: String, pool: State<AgentPool>) -> Result<String, String> {
    let mut agents = pool.agents.lock().unwrap();
    let agent = agents.get(&agent_id).ok_or("Agent not found")?;

    if agent.status != "failed" && agent.status != "killed" {
        return Err("Can only retry failed or killed agents".to_string());
    }

    let task = agent.task.clone();
    let provider = agent.provider.clone();
    let workspace = agent
        .worktree_path
        .clone()
        .unwrap_or_else(|| ".".to_string());
    let project_id = agent.project_id.clone();
    let session_id = agent.session_id.clone();

    // Create new agent with same config
    let new_agent_id = format!("agent-{}", uuid::Uuid::new_v4());
    let branch_name = format!("openfarm-{}", &new_agent_id[..8]);
    let worktree_path = format!("/tmp/openfarm-worktrees/{}", new_agent_id);

    let _ = Command::new("sh")
        .args(&[
            "-c",
            &format!(
                "cd {} && git branch {} && git worktree add {} {}",
                workspace, branch_name, worktree_path, branch_name
            ),
        ])
        .output();

    let new_agent = Agent {
        id: new_agent_id.clone(),
        task,
        provider,
        status: "running".to_string(),
        created_at: chrono::Utc::now().to_rfc3339(),
        output: None,
        worktree_path: Some(worktree_path),
        branch_name: Some(branch_name),
        project_id,
        session_id,
    };

    agents.insert(new_agent_id.clone(), new_agent);

    Ok(new_agent_id)
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

    let mut projects = pool.projects.lock().unwrap();
    projects.remove(&project_id);

    let mut sessions = pool.sessions.lock().unwrap();
    sessions.retain(|_, s| s.project_id != project_id);

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

    let mut sessions = pool.sessions.lock().unwrap();
    sessions.remove(&session_id);

    let mut agents = pool.agents.lock().unwrap();
    agents.retain(|_, a| a.session_id.as_ref() != Some(&session_id));

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
    }
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    env_logger::init();

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
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
            spawn_agent,
            kill_agent,
            approve_agent,
            get_diff,
            create_workspace,
            cleanup_workspace,
            update_agent_status,
            get_projects,
            add_project,
            remove_project,
            get_sessions,
            get_sessions_by_project,
            create_session,
            get_session,
            delete_session,
            retry_agent,
            get_agent_stats,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
