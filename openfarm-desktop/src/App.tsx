import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useEffect, useState } from "react";
import "./App.css";

interface Agent {
  id: string;
  task: string;
  provider: string;
  status:
    | "pending"
    | "running"
    | "completed"
    | "failed"
    | "approved"
    | "merged";
  createdAt: string;
  output?: string;
  worktreePath?: string;
  branchName?: string;
  projectId?: string;
  sessionId?: string;
}

interface Project {
  id: string;
  name: string;
  path: string;
  createdAt: string;
}

interface Session {
  id: string;
  name: string;
  projectId: string;
  createdAt: string;
  agents: string[];
}

type View = "dashboard" | "spawn" | "review" | "projects" | "sessions";

function App() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [taskInput, setTaskInput] = useState("");
  const [workspaceInput, setWorkspaceInput] = useState(".");
  const [provider, setProvider] = useState("external-agent");
  const [view, setView] = useState<View>("dashboard");
  const [loading, setLoading] = useState(false);
  const [diff, setDiff] = useState("");

  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectPath, setNewProjectPath] = useState("");
  const [newSessionName, setNewSessionName] = useState("");

  useEffect(() => {
    loadProjects();
    loadSessions();
    loadAgents();

    const interval = setInterval(() => {
      loadAgents();
    }, 2000);

    const unlistenStarted = listen("agent:started", () => {
      loadAgents();
    });

    const unlistenFailed = listen("agent:failed", () => {
      loadAgents();
    });

    const unlistenApproved = listen("agent:approved", () => {
      loadAgents();
    });

    return () => {
      clearInterval(interval);
      unlistenStarted.then((fn: () => void) => fn());
      unlistenFailed.then((fn: () => void) => fn());
      unlistenApproved.then((fn: () => void) => fn());
    };
  }, [selectedProject, selectedSession]);

  async function loadAgents() {
    try {
      let result: Agent[];
      if (selectedSession) {
        result = await invoke<Agent[]>("get_agents_by_session", {
          sessionId: selectedSession.id,
        });
      } else if (selectedProject) {
        result = await invoke<Agent[]>("get_agents_by_project", {
          projectId: selectedProject.id,
        });
      } else {
        result = await invoke<Agent[]>("get_agents");
      }
      setAgents(result);
    } catch (e) {
      console.error("Failed to load agents:", e);
    }
  }

  async function loadProjects() {
    try {
      const result = await invoke<Project[]>("get_projects");
      setProjects(result);
    } catch (e) {
      console.error("Failed to load projects:", e);
    }
  }

  async function loadSessions() {
    try {
      let result: Session[];
      if (selectedProject) {
        result = await invoke<Session[]>("get_sessions_by_project", {
          projectId: selectedProject.id,
        });
      } else {
        result = await invoke<Session[]>("get_sessions");
      }
      setSessions(result);
    } catch (e) {
      console.error("Failed to load sessions:", e);
    }
  }

  async function spawnAgent() {
    if (!taskInput.trim()) {
      return;
    }
    setLoading(true);
    try {
      await invoke("spawn_agent", {
        task: taskInput,
        provider,
        workspace: workspaceInput || ".",
        projectId: selectedProject?.id || null,
        sessionId: selectedSession?.id || null,
      });
      setTaskInput("");
      setView("dashboard");
      loadAgents();
    } catch (e) {
      console.error("Failed to spawn agent:", e);
    } finally {
      setLoading(false);
    }
  }

  async function killAgent(id: string) {
    try {
      await invoke("kill_agent", { agentId: id });
      loadAgents();
    } catch (e) {
      console.error("Failed to kill agent:", e);
    }
  }

  async function approveAgent(agentId: string) {
    try {
      await invoke("approve_agent", { agentId });
      loadAgents();
    } catch (e) {
      console.error("Failed to approve agent:", e);
    }
  }

  async function getAgentDiff(agentId: string) {
    try {
      const result = await invoke<string>("get_diff", { agentId });
      setDiff(result);
    } catch (e) {
      console.error("Failed to get diff:", e);
      setDiff("No changes or unable to fetch diff");
    }
  }

  async function addProject() {
    if (!(newProjectName.trim() && newProjectPath.trim())) {
      return;
    }
    try {
      await invoke("add_project", {
        name: newProjectName,
        path: newProjectPath,
      });
      setNewProjectName("");
      setNewProjectPath("");
      loadProjects();
      setView("dashboard");
    } catch (e) {
      console.error("Failed to add project:", e);
    }
  }

  async function removeProject(projectId: string) {
    try {
      await invoke("remove_project", { projectId });
      if (selectedProject?.id === projectId) {
        setSelectedProject(null);
      }
      loadProjects();
    } catch (e) {
      console.error("Failed to remove project:", e);
    }
  }

  async function createSession() {
    if (!(newSessionName.trim() && selectedProject)) {
      return;
    }
    try {
      await invoke("create_session", {
        name: newSessionName,
        projectId: selectedProject.id,
      });
      setNewSessionName("");
      loadSessions();
      setView("dashboard");
    } catch (e) {
      console.error("Failed to create session:", e);
    }
  }

  async function deleteSession(sessionId: string) {
    try {
      await invoke("delete_session", { sessionId });
      if (selectedSession?.id === sessionId) {
        setSelectedSession(null);
      }
      loadSessions();
    } catch (e) {
      console.error("Failed to delete session:", e);
    }
  }

  const stats = {
    total: agents.length,
    running: agents.filter((a) => a.status === "running").length,
    completed: agents.filter((a) => a.status === "completed").length,
    failed: agents.filter((a) => a.status === "failed").length,
  };

  if (view === "review" && selectedAgent) {
    return (
      <div className="app">
        <header className="header">
          <h1>Review Agent</h1>
          <button className="back-btn" onClick={() => setView("dashboard")}>
            Back
          </button>
        </header>
        <main className="main">
          <div className="review-panel">
            <div className="review-header">
              <h2>Agent: {selectedAgent.id.slice(0, 8)}</h2>
              <span className={`status-badge ${selectedAgent.status}`}>
                {selectedAgent.status}
              </span>
            </div>
            <div className="review-task">
              <h3>Task</h3>
              <p>{selectedAgent.task}</p>
            </div>
            <div className="review-info">
              <div>
                <strong>Provider:</strong> {selectedAgent.provider}
              </div>
              <div>
                <strong>Created:</strong>{" "}
                {new Date(selectedAgent.createdAt).toLocaleString()}
              </div>
              {selectedAgent.branchName && (
                <div>
                  <strong>Branch:</strong> {selectedAgent.branchName}
                </div>
              )}
              {selectedAgent.worktreePath && (
                <div>
                  <strong>Workspace:</strong> {selectedAgent.worktreePath}
                </div>
              )}
            </div>
            <div className="review-actions">
              <button
                className="btn-primary"
                disabled={selectedAgent.status !== "completed"}
                onClick={() => approveAgent(selectedAgent.id)}
              >
                Approve and Merge
              </button>
              <button
                className="btn-secondary"
                onClick={() => getAgentDiff(selectedAgent.id)}
              >
                View Diff
              </button>
            </div>
            {diff && (
              <div className="diff-viewer">
                <h3>Changes</h3>
                <pre>{diff}</pre>
              </div>
            )}
          </div>
        </main>
      </div>
    );
  }

  if (view === "projects") {
    return (
      <div className="app">
        <header className="header">
          <h1>Projects</h1>
          <button className="back-btn" onClick={() => setView("dashboard")}>
            Back
          </button>
        </header>
        <main className="main">
          <div className="form-card">
            <h3>Add New Project</h3>
            <input
              onChange={(e) => setNewProjectName(e.target.value)}
              placeholder="Project Name"
              type="text"
              value={newProjectName}
            />
            <input
              onChange={(e) => setNewProjectPath(e.target.value)}
              placeholder="Repository Path (e.g., /path/to/repo)"
              type="text"
              value={newProjectPath}
            />
            <button onClick={addProject}>Add Project</button>
          </div>
          <div className="list-card">
            <h3>Saved Projects</h3>
            {projects.length === 0 ? (
              <p className="empty">No projects yet</p>
            ) : (
              projects.map((project) => (
                <div className="list-item" key={project.id}>
                  <div
                    className="list-item-content"
                    onClick={() => {
                      setSelectedProject(project);
                      setView("sessions");
                    }}
                  >
                    <span className="list-item-title">{project.name}</span>
                    <span className="list-item-subtitle">{project.path}</span>
                  </div>
                  <button
                    className="delete-btn"
                    onClick={() => removeProject(project.id)}
                  >
                    Delete
                  </button>
                </div>
              ))
            )}
          </div>
        </main>
      </div>
    );
  }

  if (view === "sessions") {
    return (
      <div className="app">
        <header className="header">
          <h1>Sessions - {selectedProject?.name}</h1>
          <button className="back-btn" onClick={() => setView("dashboard")}>
            Back
          </button>
        </header>
        <main className="main">
          <div className="form-card">
            <h3>Create New Session</h3>
            <input
              onChange={(e) => setNewSessionName(e.target.value)}
              placeholder="Session Name"
              type="text"
              value={newSessionName}
            />
            <button onClick={createSession}>Create Session</button>
          </div>
          <div className="list-card">
            <h3>Saved Sessions</h3>
            {sessions.length === 0 ? (
              <p className="empty">No sessions yet</p>
            ) : (
              sessions.map((session) => (
                <div className="list-item" key={session.id}>
                  <div
                    className="list-item-content"
                    onClick={() => {
                      setSelectedSession(session);
                      setView("dashboard");
                    }}
                  >
                    <span className="list-item-title">{session.name}</span>
                    <span className="list-item-subtitle">
                      {new Date(session.createdAt).toLocaleString()} -{" "}
                      {session.agents.length} agents
                    </span>
                  </div>
                  <button
                    className="delete-btn"
                    onClick={() => deleteSession(session.id)}
                  >
                    Delete
                  </button>
                </div>
              ))
            )}
          </div>
        </main>
      </div>
    );
  }

  if (view === "spawn") {
    return (
      <div className="app">
        <header className="header">
          <h1>Spawn Agent</h1>
        </header>
        <main className="main">
          <div className="spawn-form">
            <label>Task Description</label>
            <textarea
              disabled={loading}
              onChange={(e) => setTaskInput(e.target.value)}
              placeholder="What do you want the agent to do?"
              rows={4}
              value={taskInput}
            />

            <label>Workspace (Git Repository)</label>
            <input
              disabled={loading}
              onChange={(e) => setWorkspaceInput(e.target.value)}
              placeholder="Path to git repository"
              type="text"
              value={workspaceInput}
            />

            <label>Provider</label>
            <select
              disabled={loading}
              onChange={(e) => setProvider(e.target.value)}
              value={provider}
            >
              <option value="external-agent">External Agent (CLI)</option>
              <option value="aider">Aider</option>
              <option value="claude">Claude Code</option>
              <option value="opencode">OpenCode</option>
            </select>

            <div className="buttons">
              <button
                disabled={loading || !taskInput.trim()}
                onClick={spawnAgent}
              >
                {loading ? "Spawning..." : "Spawn Agent"}
              </button>
              <button
                className="secondary"
                disabled={loading}
                onClick={() => setView("dashboard")}
              >
                Cancel
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="header">
        <div>
          <h1>OpenFarm</h1>
          <span className="subtitle">Multi-Agent Coding Platform</span>
        </div>
        <div className="header-actions">
          <select
            className="project-select"
            onChange={(e) => {
              const p = projects.find((p) => p.id === e.target.value);
              setSelectedProject(p || null);
              setSelectedSession(null);
            }}
            value={selectedProject?.id || ""}
          >
            <option value="">All Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <button className="icon-btn" onClick={() => setView("projects")}>
            Projects
          </button>
          {selectedProject && (
            <button className="icon-btn" onClick={() => setView("sessions")}>
              Sessions
            </button>
          )}
        </div>
      </header>

      <div className="stats">
        <div className="stat">
          <span className="stat-value">{stats.total}</span>
          <span className="stat-label">Total</span>
        </div>
        <div className="stat">
          <span className="stat-value cyan">{stats.running}</span>
          <span className="stat-label">Running</span>
        </div>
        <div className="stat">
          <span className="stat-value green">{stats.completed}</span>
          <span className="stat-label">Completed</span>
        </div>
        <div className="stat">
          <span className="stat-value red">{stats.failed}</span>
          <span className="stat-label">Failed</span>
        </div>
      </div>

      {selectedSession && (
        <div className="session-bar">
          <span>
            Session: <strong>{selectedSession.name}</strong>
          </span>
          <button onClick={() => setSelectedSession(null)}>Clear</button>
        </div>
      )}

      <main className="main">
        <div className="toolbar">
          <button onClick={() => setView("spawn")}>+ New Agent</button>
          {selectedSession && (
            <button className="secondary" onClick={() => setView("sessions")}>
              Change Session
            </button>
          )}
        </div>

        {agents.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🤖</div>
            <p>No agents running</p>
            <p className="empty-hint">
              {selectedProject
                ? `in ${selectedProject.name}`
                : "Spawn an agent to start coding"}
            </p>
            <button onClick={() => setView("spawn")}>
              Spawn your first agent
            </button>
          </div>
        ) : (
          <div className="agent-grid">
            {agents.map((agent) => (
              <div
                className={`agent-card ${selectedAgent?.id === agent.id ? "selected" : ""} ${agent.status}`}
                key={agent.id}
                onClick={() => setSelectedAgent(agent)}
              >
                <div className="agent-header">
                  <span className={`status-badge ${agent.status}`}>
                    {agent.status === "running"
                      ? "Running"
                      : agent.status === "completed"
                        ? "Done"
                        : agent.status === "failed"
                          ? "Failed"
                          : agent.status === "approved"
                            ? "Approved"
                            : agent.status === "merged"
                              ? "Merged"
                              : "Pending"}
                  </span>
                  <span className="provider">{agent.provider}</span>
                </div>
                <p className="task">{agent.task}</p>
                <div className="agent-meta">
                  <span className="agent-id">{agent.id.slice(0, 12)}...</span>
                  <span className="agent-time">
                    {new Date(agent.createdAt).toLocaleTimeString()}
                  </span>
                </div>
                <div className="agent-actions">
                  {agent.status === "running" && (
                    <button
                      className="kill"
                      onClick={(e) => {
                        e.stopPropagation();
                        killAgent(agent.id);
                      }}
                    >
                      Kill
                    </button>
                  )}
                  {agent.status === "completed" && (
                    <button
                      className="review"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedAgent(agent);
                        setView("review");
                      }}
                    >
                      Review
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <footer className="footer">
        <span>Projects: {projects.length}</span>
        <span>Sessions: {sessions.length}</span>
        <span>Agents: {stats.total}</span>
      </footer>
    </div>
  );
}

export default App;
