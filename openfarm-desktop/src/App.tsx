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
		| "killed"
		| "rejected"
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

interface DiffFile {
	path: string;
	patch: string;
}

interface Workspace {
	id: string;
	name: string;
	repoPath: string;
	branchName: string;
	sourceType: string;
	sourceRef?: string;
	worktreePath?: string;
	status: string;
	projectId?: string;
	sessionId?: string;
	createdAt: string;
	updatedAt: string;
	archivedAt?: string;
	spotlightEnabled: boolean;
	spotlightBaseRef?: string;
	spotlightSyncedAt?: string;
}

interface WorkspacePr {
	workspace_id: string;
	pr_url: string;
	pr_number?: number;
	status: string;
	created_at: string;
	merged_at?: string;
	checks_total: number;
	checks_passed: number;
	checks_failed: number;
	checks_pending: number;
	checks_state?: "passed" | "pending" | "failed";
	checks_updated_at?: string;
}

interface WorkspaceScriptConfig {
	workspace_id: string;
	setup_script?: string;
	run_script?: string;
	archive_script?: string;
	run_mode: "concurrent" | "nonconcurrent";
	updated_at: string;
}

interface WorkspaceCheckpoint {
	id: string;
	workspace_id: string;
	name: string;
	snapshot_ref: string;
	created_at: string;
}

interface WorkspaceTodo {
	id: string;
	workspace_id: string;
	title: string;
	completed: boolean;
	created_at: string;
}

interface WorkspaceSlashCommand {
	name: string;
	path: string;
	content: string;
}

interface McpServer {
	id: string;
	name: string;
	command: string;
	args: string[];
	env: Record<string, string>;
	enabled: boolean;
	health_status?: string;
	last_checked_at?: string;
	created_at: string;
	updated_at: string;
}

interface AgentEvent {
	event_type: string;
	agent_id: string;
	data: {
		chunk?: string;
		[key: string]: unknown;
	};
}

type View =
	| "dashboard"
	| "spawn"
	| "review"
	| "projects"
	| "sessions"
	| "workspaces"
	| "runs"
	| "mcp";

function App() {
	const [agents, setAgents] = useState<Agent[]>([]);
	const [agentOutput, setAgentOutput] = useState<Record<string, string>>({});
	const [projects, setProjects] = useState<Project[]>([]);
	const [sessions, setSessions] = useState<Session[]>([]);
	const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
	const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
	const [selectedProject, setSelectedProject] = useState<Project | null>(null);
	const [selectedSession, setSelectedSession] = useState<Session | null>(null);
	const [taskInput, setTaskInput] = useState("");
	const [workspaceInput, setWorkspaceInput] = useState(".");
	const [selectedWorkspaceId, setSelectedWorkspaceId] = useState("");
	const [provider, setProvider] = useState("external-agent");
	const [view, setView] = useState<View>("dashboard");
	const [loading, setLoading] = useState(false);
	const [diff, setDiff] = useState("");
	const [diffFiles, setDiffFiles] = useState<DiffFile[]>([]);
	const [selectedDiffFile, setSelectedDiffFile] = useState<string>("");
	const [diffViewMode, setDiffViewMode] = useState<"unified" | "split">(
		"unified",
	);
	const [diffFilter, setDiffFilter] = useState("");
	const [reviewError, setReviewError] = useState("");

	const [newProjectName, setNewProjectName] = useState("");
	const [newProjectPath, setNewProjectPath] = useState("");
	const [newSessionName, setNewSessionName] = useState("");
	const [newWorkspaceName, setNewWorkspaceName] = useState("");
	const [newWorkspaceRepoPath, setNewWorkspaceRepoPath] = useState("");
	const [newWorkspaceBranchName, setNewWorkspaceBranchName] = useState("main");
	const [newWorkspaceSourceType, setNewWorkspaceSourceType] =
		useState("branch");
	const [newWorkspaceSourceRef, setNewWorkspaceSourceRef] = useState("");
	const [workspaceRepoFilter, setWorkspaceRepoFilter] = useState("");
	const [workspaceStatusFilter, setWorkspaceStatusFilter] = useState<
		"all" | "active" | "archived"
	>("all");
	const [reviewRejectReason, setReviewRejectReason] = useState(
		"Rejected from review",
	);
	const [workspacePrs, setWorkspacePrs] = useState<Record<string, WorkspacePr>>(
		{},
	);
	const [workspaceScripts, setWorkspaceScripts] = useState<
		Record<string, WorkspaceScriptConfig>
	>({});
	const [workspaceScriptOutput, setWorkspaceScriptOutput] = useState<
		Record<string, string>
	>({});
	const [workspaceScriptRunning, setWorkspaceScriptRunning] = useState<
		Record<string, boolean>
	>({});
	const [workspaceCheckpoints, setWorkspaceCheckpoints] = useState<
		Record<string, WorkspaceCheckpoint[]>
	>({});
	const [workspaceTodos, setWorkspaceTodos] = useState<
		Record<string, WorkspaceTodo[]>
	>({});
	const [workspaceSlashCommands, setWorkspaceSlashCommands] = useState<
		Record<string, WorkspaceSlashCommand[]>
	>({});
	const [mcpServers, setMcpServers] = useState<McpServer[]>([]);
	const [newMcpName, setNewMcpName] = useState("");
	const [newMcpCommand, setNewMcpCommand] = useState("");
	const [newMcpArgs, setNewMcpArgs] = useState("");
	const [newWorkspaceTodo, setNewWorkspaceTodo] = useState<
		Record<string, string>
	>({});
	const [newCheckpointName, setNewCheckpointName] = useState<
		Record<string, string>
	>({});

	useEffect(() => {
		loadProjects();
		loadSessions();
		loadWorkspaces();
		loadMcpServers();
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
			setReviewError("");
		});
		const unlistenCompleted = listen("agent:completed", () => {
			loadAgents();
		});
		const unlistenRejected = listen("agent:rejected", () => {
			loadAgents();
		});
		const unlistenOutput = listen<{ agent_id: string; chunk: string }>(
			"agent:output",
			(event) => {
				const { agent_id, chunk } = event.payload;
				setAgentOutput((prev) => ({
					...prev,
					[agent_id]: `${prev[agent_id] || ""}${chunk}`,
				}));
			},
		);
		const unlistenMergeConflict = listen<{ agent_id: string; error: string }>(
			"agent:merge-conflict",
			(event) => {
				if (selectedAgent?.id === event.payload.agent_id) {
					setReviewError(event.payload.error || "Merge conflict detected.");
				}
				loadAgents();
			},
		);
		const unlistenWorkspaceOutput = listen<{
			workspace_id: string;
			chunk: string;
			script_type: string;
		}>("workspace-script:output", (event) => {
			const { workspace_id, chunk } = event.payload;
			setWorkspaceScriptOutput((prev) => ({
				...prev,
				[workspace_id]: `${prev[workspace_id] || ""}${chunk}`,
			}));
		});
		const unlistenWorkspaceStatus = listen<{
			workspace_id: string;
			status: "running" | "completed" | "failed" | "stopped";
		}>("workspace-script:status", (event) => {
			const { workspace_id, status } = event.payload;
			setWorkspaceScriptRunning((prev) => ({
				...prev,
				[workspace_id]: status === "running",
			}));
		});

		return () => {
			clearInterval(interval);
			unlistenStarted.then((fn: () => void) => fn());
			unlistenFailed.then((fn: () => void) => fn());
			unlistenApproved.then((fn: () => void) => fn());
			unlistenCompleted.then((fn: () => void) => fn());
			unlistenRejected.then((fn: () => void) => fn());
			unlistenOutput.then((fn: () => void) => fn());
			unlistenMergeConflict.then((fn: () => void) => fn());
			unlistenWorkspaceOutput.then((fn: () => void) => fn());
			unlistenWorkspaceStatus.then((fn: () => void) => fn());
		};
	}, [selectedProject, selectedSession, selectedAgent?.id]);

	useEffect(() => {
		if (view === "spawn" && selectedWorkspaceId) {
			loadWorkspaceSlashCommands(selectedWorkspaceId);
		}
	}, [view, selectedWorkspaceId]);

	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			if (!event.metaKey) {
				return;
			}
			const key = event.key.toLowerCase();
			if (key === "n" && !event.shiftKey) {
				event.preventDefault();
				setView("spawn");
				return;
			}
			if (key === "n" && event.shiftKey) {
				event.preventDefault();
				setView("workspaces");
				return;
			}
			if (key === "d" && !event.shiftKey) {
				event.preventDefault();
				setView("dashboard");
				return;
			}
			if (key === "p" && event.shiftKey) {
				event.preventDefault();
				setView("projects");
				return;
			}
			if (key === "o" && !event.shiftKey) {
				event.preventDefault();
				const fallbackWorkspace = workspaces.find(
					(w) => w.status !== "archived",
				);
				const workspaceId = selectedWorkspaceId || fallbackWorkspace?.id;
				if (workspaceId) {
					openWorkspaceInIde(workspaceId);
				}
			}
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [selectedWorkspaceId, workspaces]);

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
			setAgentOutput((prev) => {
				const next = { ...prev };
				for (const agent of result) {
					if (agent.output) {
						next[agent.id] = agent.output;
					} else if (!next[agent.id]) {
						invoke<AgentEvent[]>("get_agent_events", { agentId: agent.id })
							.then((events) => {
								const reconstructed = events
									.filter((event) => event.event_type === "agent:output")
									.map((event) => event.data?.chunk || "")
									.join("");
								if (reconstructed) {
									setAgentOutput((curr) => ({
										...curr,
										[agent.id]: reconstructed,
									}));
								}
							})
							.catch(() => {});
					}
				}
				return next;
			});
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

	async function loadWorkspaces() {
		try {
			const result = await invoke<Workspace[]>("get_workspaces");
			setWorkspaces(result);
			const entries = await Promise.all(
				result.map(async (workspace) => {
					const [pr, scriptConfig, checkpoints, todos] = await Promise.all([
						invoke<WorkspacePr | null>("get_workspace_pr", {
							workspaceId: workspace.id,
						}),
						invoke<WorkspaceScriptConfig | null>(
							"get_workspace_script_config",
							{
								workspaceId: workspace.id,
							},
						),
						invoke<WorkspaceCheckpoint[]>("get_workspace_checkpoints", {
							workspaceId: workspace.id,
						}),
						invoke<WorkspaceTodo[]>("get_workspace_todos", {
							workspaceId: workspace.id,
						}),
					]);
					return [workspace.id, pr, scriptConfig, checkpoints, todos] as const;
				}),
			);
			const next: Record<string, WorkspacePr> = {};
			const scriptNext: Record<string, WorkspaceScriptConfig> = {};
			const checkpointsNext: Record<string, WorkspaceCheckpoint[]> = {};
			const todosNext: Record<string, WorkspaceTodo[]> = {};
			for (const [id, pr, scriptConfig, checkpoints, todos] of entries) {
				if (pr) {
					next[id] = pr;
				}
				if (scriptConfig) {
					scriptNext[id] = scriptConfig;
				}
				checkpointsNext[id] = checkpoints || [];
				todosNext[id] = todos || [];
			}
			setWorkspacePrs(next);
			setWorkspaceScripts(scriptNext);
			setWorkspaceCheckpoints(checkpointsNext);
			setWorkspaceTodos(todosNext);
		} catch (e) {
			console.error("Failed to load workspaces:", e);
		}
	}

	async function loadMcpServers() {
		try {
			const result = await invoke<McpServer[]>("get_mcp_servers");
			setMcpServers(result);
		} catch (e) {
			console.error("Failed to load MCP servers:", e);
		}
	}

	async function spawnAgent() {
		if (!taskInput.trim()) {
			return;
		}
		setLoading(true);
		try {
			let resolvedTask = taskInput;
			if (selectedWorkspaceId && taskInput.trim().startsWith("/")) {
				resolvedTask = await invoke<string>("expand_workspace_slash_command", {
					workspaceId: selectedWorkspaceId,
					input: taskInput,
				});
			}
			await invoke("spawn_agent", {
				task: resolvedTask,
				provider,
				workspace: workspaceInput || ".",
				workspaceId: selectedWorkspaceId || null,
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

	async function loadWorkspaceSlashCommands(workspaceId: string) {
		if (!workspaceId) {
			return;
		}
		try {
			const commands = await invoke<WorkspaceSlashCommand[]>(
				"list_workspace_slash_commands",
				{ workspaceId },
			);
			setWorkspaceSlashCommands((prev) => ({
				...prev,
				[workspaceId]: commands,
			}));
		} catch (e) {
			console.error("Failed to load workspace slash commands:", e);
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
			setReviewError("");
			await invoke("approve_agent", { agentId });
			loadAgents();
		} catch (e) {
			console.error("Failed to approve agent:", e);
			setReviewError(String(e));
		}
	}

	async function rejectAgent(agentId: string, reason: string) {
		try {
			setReviewError("");
			await invoke("reject_agent", { agentId, reason });
			loadAgents();
			setView("dashboard");
		} catch (e) {
			console.error("Failed to reject agent:", e);
			setReviewError(String(e));
		}
	}

	async function getAgentDiff(agentId: string) {
		try {
			setReviewError("");
			const result = await invoke<string>("get_diff", { agentId });
			setDiff(result);
			const files = await invoke<DiffFile[]>("get_diff_files", { agentId });
			setDiffFiles(files);
			setSelectedDiffFile(files[0]?.path || "");
		} catch (e) {
			console.error("Failed to get diff:", e);
			setDiff("No changes or unable to fetch diff");
			setDiffFiles([]);
			setSelectedDiffFile("");
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

	async function addWorkspace() {
		if (
			!newWorkspaceName.trim() ||
			!newWorkspaceRepoPath.trim() ||
			!newWorkspaceBranchName.trim()
		) {
			return;
		}
		try {
			const workspaceId = await invoke<string>("add_workspace", {
				name: newWorkspaceName,
				repoPath: newWorkspaceRepoPath,
				branchName: newWorkspaceBranchName,
				sourceType: newWorkspaceSourceType,
				sourceRef: newWorkspaceSourceRef || null,
				projectId: selectedProject?.id || null,
				sessionId: selectedSession?.id || null,
			});
			const existingConfig = await invoke<WorkspaceScriptConfig | null>(
				"get_workspace_script_config",
				{
					workspaceId,
				},
			);
			if (!existingConfig) {
				await invoke("set_workspace_script_config", {
					workspaceId,
					setupScript: null,
					runScript: "bun run dev",
					archiveScript: null,
					runMode: "concurrent",
				});
			}
			setNewWorkspaceName("");
			setNewWorkspaceRepoPath("");
			setNewWorkspaceBranchName("main");
			setNewWorkspaceSourceType("branch");
			setNewWorkspaceSourceRef("");
			loadWorkspaces();
		} catch (e) {
			console.error("Failed to add workspace:", e);
		}
	}

	async function archiveWorkspace(workspaceId: string) {
		try {
			await invoke("archive_workspace", { workspaceId });
			loadWorkspaces();
		} catch (e) {
			console.error("Failed to archive workspace:", e);
		}
	}

	async function restoreWorkspace(workspaceId: string) {
		try {
			await invoke("restore_workspace", { workspaceId });
			loadWorkspaces();
		} catch (e) {
			console.error("Failed to restore workspace:", e);
		}
	}

	async function removeWorkspace(workspaceId: string) {
		try {
			await invoke("remove_workspace", { workspaceId });
			loadWorkspaces();
		} catch (e) {
			console.error("Failed to remove workspace:", e);
		}
	}

	async function enableWorkspaceSpotlight(workspaceId: string) {
		try {
			await invoke<Workspace>("enable_workspace_spotlight", { workspaceId });
			await loadWorkspaces();
		} catch (e) {
			console.error("Failed to enable workspace spotlight:", e);
		}
	}

	async function disableWorkspaceSpotlight(workspaceId: string) {
		try {
			await invoke<Workspace>("disable_workspace_spotlight", { workspaceId });
			await loadWorkspaces();
		} catch (e) {
			console.error("Failed to disable workspace spotlight:", e);
		}
	}

	async function createWorkspacePr(workspaceId: string) {
		try {
			const workspace = workspaces.find((item) => item.id === workspaceId);
			const pr = await invoke<WorkspacePr>("create_workspace_pr", {
				workspaceId,
				title: workspace
					? `[OpenFarm] ${workspace.name}`
					: "[OpenFarm] Workspace PR",
				body: "Created by OpenFarm Desktop",
			});
			setWorkspacePrs((prev) => ({ ...prev, [workspaceId]: pr }));
		} catch (e) {
			console.error("Failed to create workspace PR:", e);
		}
	}

	async function refreshWorkspacePr(workspaceId: string) {
		try {
			const pr = await invoke<WorkspacePr>("refresh_workspace_pr", {
				workspaceId,
			});
			setWorkspacePrs((prev) => ({ ...prev, [workspaceId]: pr }));
		} catch (e) {
			console.error("Failed to refresh workspace PR:", e);
		}
	}

	async function mergeWorkspacePr(workspaceId: string) {
		try {
			const pr = await invoke<WorkspacePr>("merge_workspace_pr", {
				workspaceId,
			});
			setWorkspacePrs((prev) => ({ ...prev, [workspaceId]: pr }));
		} catch (e) {
			console.error("Failed to merge workspace PR:", e);
		}
	}

	async function openWorkspaceInIde(workspaceId: string) {
		try {
			await invoke("open_workspace_in_ide", { workspaceId });
		} catch (e) {
			console.error("Failed to open workspace in IDE:", e);
		}
	}

	async function setWorkspaceScriptConfig(
		workspaceId: string,
		patch: Partial<WorkspaceScriptConfig>,
	) {
		const current = workspaceScripts[workspaceId];
		const runMode = patch.run_mode || current?.run_mode || "concurrent";
		const setupScript =
			patch.setup_script !== undefined
				? patch.setup_script
				: current?.setup_script || null;
		const runScript =
			patch.run_script !== undefined
				? patch.run_script
				: current?.run_script || null;
		const archiveScript =
			patch.archive_script !== undefined
				? patch.archive_script
				: current?.archive_script || null;

		try {
			await invoke("set_workspace_script_config", {
				workspaceId,
				setupScript,
				runScript,
				archiveScript,
				runMode,
			});
			const updated = await invoke<WorkspaceScriptConfig | null>(
				"get_workspace_script_config",
				{
					workspaceId,
				},
			);
			if (updated) {
				setWorkspaceScripts((prev) => ({ ...prev, [workspaceId]: updated }));
			}
		} catch (e) {
			console.error("Failed to set workspace script config:", e);
		}
	}

	async function runWorkspaceScript(workspaceId: string, scriptType: string) {
		setWorkspaceScriptRunning((prev) => ({ ...prev, [workspaceId]: true }));
		try {
			const output = await invoke<string>("run_workspace_script", {
				workspaceId,
				scriptType,
			});
			setWorkspaceScriptOutput((prev) => ({
				...prev,
				[workspaceId]: `[${scriptType}] OK\n${output || "(sin salida)"}`,
			}));
		} catch (e) {
			setWorkspaceScriptOutput((prev) => ({
				...prev,
				[workspaceId]: `[${scriptType}] ERROR\n${String(e)}`,
			}));
		} finally {
			setWorkspaceScriptRunning((prev) => ({ ...prev, [workspaceId]: false }));
		}
	}

	async function stopWorkspaceScript(workspaceId: string) {
		try {
			await invoke("stop_workspace_script", { workspaceId });
			setWorkspaceScriptOutput((prev) => ({
				...prev,
				[workspaceId]: "[stop] OK\nScript detenido",
			}));
		} catch (e) {
			setWorkspaceScriptOutput((prev) => ({
				...prev,
				[workspaceId]: `[stop] ERROR\n${String(e)}`,
			}));
		} finally {
			setWorkspaceScriptRunning((prev) => ({ ...prev, [workspaceId]: false }));
		}
	}

	async function restartWorkspaceScript(workspaceId: string) {
		await stopWorkspaceScript(workspaceId);
		await runWorkspaceScript(workspaceId, "run");
	}

	async function createWorkspaceCheckpoint(workspaceId: string) {
		try {
			const checkpoint = await invoke<WorkspaceCheckpoint>(
				"create_workspace_checkpoint",
				{
					workspaceId,
					name: newCheckpointName[workspaceId] || null,
				},
			);
			setWorkspaceCheckpoints((prev) => ({
				...prev,
				[workspaceId]: [checkpoint, ...(prev[workspaceId] || [])],
			}));
			setNewCheckpointName((prev) => ({ ...prev, [workspaceId]: "" }));
		} catch (e) {
			console.error("Failed to create workspace checkpoint:", e);
		}
	}

	async function revertWorkspaceCheckpoint(
		workspaceId: string,
		checkpointId: string,
	) {
		try {
			await invoke("revert_workspace_checkpoint", {
				workspaceId,
				checkpointId,
			});
			setWorkspaceScriptOutput((prev) => ({
				...prev,
				[workspaceId]: `[checkpoint] reverted to ${checkpointId}\n${prev[workspaceId] || ""}`,
			}));
		} catch (e) {
			console.error("Failed to revert workspace checkpoint:", e);
			setWorkspaceScriptOutput((prev) => ({
				...prev,
				[workspaceId]: `[checkpoint] revert error ${String(e)}\n${prev[workspaceId] || ""}`,
			}));
		}
	}

	async function addWorkspaceTodo(workspaceId: string) {
		const title = (newWorkspaceTodo[workspaceId] || "").trim();
		if (!title) {
			return;
		}
		try {
			const todo = await invoke<WorkspaceTodo>("add_workspace_todo", {
				workspaceId,
				title,
			});
			setWorkspaceTodos((prev) => ({
				...prev,
				[workspaceId]: [todo, ...(prev[workspaceId] || [])],
			}));
			setNewWorkspaceTodo((prev) => ({ ...prev, [workspaceId]: "" }));
		} catch (e) {
			console.error("Failed to add workspace todo:", e);
		}
	}

	async function toggleWorkspaceTodo(
		workspaceId: string,
		todoId: string,
		completed: boolean,
	) {
		try {
			await invoke("toggle_workspace_todo", { todoId, completed });
			setWorkspaceTodos((prev) => ({
				...prev,
				[workspaceId]: (prev[workspaceId] || []).map((todo) =>
					todo.id === todoId ? { ...todo, completed } : todo,
				),
			}));
		} catch (e) {
			console.error("Failed to toggle workspace todo:", e);
		}
	}

	async function deleteWorkspaceTodo(workspaceId: string, todoId: string) {
		try {
			await invoke("delete_workspace_todo", { todoId });
			setWorkspaceTodos((prev) => ({
				...prev,
				[workspaceId]: (prev[workspaceId] || []).filter(
					(todo) => todo.id !== todoId,
				),
			}));
		} catch (e) {
			console.error("Failed to delete workspace todo:", e);
		}
	}

	async function addMcpServer() {
		if (!newMcpName.trim() || !newMcpCommand.trim()) {
			return;
		}
		try {
			const args = newMcpArgs
				.split(" ")
				.map((value) => value.trim())
				.filter(Boolean);
			await invoke("add_mcp_server", {
				name: newMcpName,
				command: newMcpCommand,
				args,
				env: {},
				enabled: true,
			});
			setNewMcpName("");
			setNewMcpCommand("");
			setNewMcpArgs("");
			loadMcpServers();
		} catch (e) {
			console.error("Failed to add MCP server:", e);
		}
	}

	async function toggleMcpServer(server: McpServer) {
		try {
			await invoke("update_mcp_server", {
				serverId: server.id,
				enabled: !server.enabled,
			});
			loadMcpServers();
		} catch (e) {
			console.error("Failed to toggle MCP server:", e);
		}
	}

	async function deleteMcpServer(serverId: string) {
		try {
			await invoke("delete_mcp_server", { serverId });
			loadMcpServers();
		} catch (e) {
			console.error("Failed to delete MCP server:", e);
		}
	}

	async function checkMcpServerHealth(serverId: string) {
		try {
			await invoke("check_mcp_server_health", { serverId });
			loadMcpServers();
		} catch (e) {
			console.error("Failed to check MCP server health:", e);
		}
	}

	function renderSplitPatch(patch: string) {
		const lines = patch.split("\n");
		return lines.map((line, index) => {
			if (line.startsWith("@@")) {
				return (
					<div className="diff-line diff-hunk" key={`${index}-${line}`}>
						<span className="diff-col">{line}</span>
						<span className="diff-col">{line}</span>
					</div>
				);
			}
			if (line.startsWith("+")) {
				return (
					<div className="diff-line" key={`${index}-${line}`}>
						<span className="diff-col" />
						<span className="diff-col diff-add">{line}</span>
					</div>
				);
			}
			if (line.startsWith("-")) {
				return (
					<div className="diff-line" key={`${index}-${line}`}>
						<span className="diff-col diff-del">{line}</span>
						<span className="diff-col" />
					</div>
				);
			}
			return (
				<div className="diff-line" key={`${index}-${line}`}>
					<span className="diff-col">{line}</span>
					<span className="diff-col">{line}</span>
				</div>
			);
		});
	}

	const stats = {
		total: agents.length,
		running: agents.filter((a) => a.status === "running").length,
		completed: agents.filter((a) => a.status === "completed").length,
		failed: agents.filter((a) => a.status === "failed").length,
	};

	if (view === "review" && selectedAgent) {
		const filteredDiffFiles = diffFiles.filter((file) =>
			file.path.toLowerCase().includes(diffFilter.toLowerCase()),
		);
		const selectedPatch =
			diffFiles.find((file) => file.path === selectedDiffFile)?.patch ||
			"No patch available";

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
								disabled={selectedAgent.status !== "completed"}
								onClick={() =>
									rejectAgent(
										selectedAgent.id,
										reviewRejectReason.trim() || "Rejected from review",
									)
								}
							>
								Reject
							</button>
							<button
								className="btn-secondary"
								onClick={() => getAgentDiff(selectedAgent.id)}
							>
								View Diff
							</button>
						</div>
						<div className="review-task">
							<h3>Reject Reason</h3>
							<input
								onChange={(e) => setReviewRejectReason(e.target.value)}
								placeholder="Why are you rejecting this agent output?"
								type="text"
								value={reviewRejectReason}
							/>
						</div>
						{reviewError && (
							<div className="diff-viewer">
								<h3>Merge Error</h3>
								<pre>{reviewError}</pre>
							</div>
						)}
						{diff && (
							<div className="diff-viewer">
								<h3>Changes</h3>
								<pre>{diff}</pre>
							</div>
						)}
						{diffFiles.length > 0 && (
							<div className="diff-viewer">
								<h3>Files</h3>
								<input
									onChange={(e) => setDiffFilter(e.target.value)}
									placeholder="Filter files..."
									type="text"
									value={diffFilter}
								/>
								<div className="review-actions">
									<button
										className="btn-secondary"
										onClick={() => setDiffViewMode("unified")}
									>
										Unified
									</button>
									<button
										className="btn-secondary"
										onClick={() => setDiffViewMode("split")}
									>
										Split
									</button>
								</div>
								<div className="diff-file-list">
									{filteredDiffFiles.map((file) => (
										<button
											className="icon-btn"
											key={file.path}
											onClick={() => setSelectedDiffFile(file.path)}
										>
											{file.path}
										</button>
									))}
								</div>
								{diffViewMode === "unified" ? (
									<pre>{selectedPatch}</pre>
								) : (
									<div className="split-diff">
										{renderSplitPatch(selectedPatch)}
									</div>
								)}
							</div>
						)}
						<div className="diff-viewer">
							<h3>Output</h3>
							<pre>
								{agentOutput[selectedAgent.id] ||
									selectedAgent.output ||
									"No output yet"}
							</pre>
						</div>
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
										className="list-item-content clickable"
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
										className="list-item-content clickable"
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

	if (view === "workspaces") {
		const filteredWorkspaces = workspaces.filter((workspace) => {
			const repoMatches = workspace.repoPath
				.toLowerCase()
				.includes(workspaceRepoFilter.toLowerCase());
			const statusMatches =
				workspaceStatusFilter === "all" ||
				workspace.status === workspaceStatusFilter;
			return repoMatches && statusMatches;
		});

		return (
			<div className="app">
				<header className="header">
					<h1>Workspaces</h1>
					<button className="back-btn" onClick={() => setView("dashboard")}>
						Back
					</button>
				</header>
				<main className="main">
					<div className="form-card">
						<h3>Create Workspace</h3>
						<input
							onChange={(e) => setNewWorkspaceName(e.target.value)}
							placeholder="Workspace Name"
							type="text"
							value={newWorkspaceName}
						/>
						<input
							onChange={(e) => setNewWorkspaceRepoPath(e.target.value)}
							placeholder="Repository Path"
							type="text"
							value={newWorkspaceRepoPath}
						/>
						<input
							onChange={(e) => setNewWorkspaceBranchName(e.target.value)}
							placeholder="Branch Name"
							type="text"
							value={newWorkspaceBranchName}
						/>
						<select
							onChange={(e) => setNewWorkspaceSourceType(e.target.value)}
							value={newWorkspaceSourceType}
						>
							<option value="branch">From Branch</option>
							<option value="pr">From PR</option>
							<option value="issue">From Issue</option>
						</select>
						<input
							onChange={(e) => setNewWorkspaceSourceRef(e.target.value)}
							placeholder="Source ref (PR/Issue id, optional)"
							type="text"
							value={newWorkspaceSourceRef}
						/>
						<button onClick={addWorkspace}>Create Workspace</button>
					</div>
					<div className="list-card">
						<h3>Saved Workspaces</h3>
						<input
							onChange={(e) => setWorkspaceRepoFilter(e.target.value)}
							placeholder="Filter by repository path"
							type="text"
							value={workspaceRepoFilter}
						/>
						<select
							onChange={(e) =>
								setWorkspaceStatusFilter(
									e.target.value as "all" | "active" | "archived",
								)
							}
							value={workspaceStatusFilter}
						>
							<option value="all">All statuses</option>
							<option value="active">Active</option>
							<option value="archived">Archived</option>
						</select>
						{workspaces.length === 0 ? (
							<p className="empty">No workspaces yet</p>
						) : filteredWorkspaces.length === 0 ? (
							<p className="empty">No workspaces match the current filters.</p>
						) : (
							filteredWorkspaces.map((workspace) => (
								<div className="list-item" key={workspace.id}>
									<div className="list-item-content">
										<span className="list-item-title">
											{workspace.name} ({workspace.status})
										</span>
										<span className="list-item-subtitle">
											{workspace.repoPath} · {workspace.branchName} ·{" "}
											{workspace.sourceType}
											{workspace.sourceRef ? `:${workspace.sourceRef}` : ""}
										</span>
										<span className="list-item-subtitle">
											Script mode:{" "}
											{workspaceScripts[workspace.id]?.run_mode || "concurrent"}
										</span>
										<span className="list-item-subtitle">
											Pending todos:{" "}
											{
												(workspaceTodos[workspace.id] || []).filter(
													(todo) => !todo.completed,
												).length
											}
										</span>
										<span className="list-item-subtitle">
											Spotlight:{" "}
											{workspace.spotlightEnabled ? "enabled" : "disabled"}
											{workspace.spotlightSyncedAt
												? ` · last sync ${new Date(workspace.spotlightSyncedAt).toLocaleString()}`
												: ""}
										</span>
										<input
											onChange={(e) =>
												setNewWorkspaceTodo((prev) => ({
													...prev,
													[workspace.id]: e.target.value,
												}))
											}
											placeholder="New todo"
											type="text"
											value={newWorkspaceTodo[workspace.id] || ""}
										/>
										<button
											className="icon-btn"
											onClick={() => addWorkspaceTodo(workspace.id)}
										>
											Add Todo
										</button>
										{(workspaceTodos[workspace.id] || []).map((todo) => (
											<div key={todo.id}>
												<input
													checked={todo.completed}
													onChange={(e) =>
														toggleWorkspaceTodo(
															workspace.id,
															todo.id,
															e.target.checked,
														)
													}
													type="checkbox"
												/>
												<span>{todo.title}</span>
												<button
													className="icon-btn"
													onClick={() =>
														deleteWorkspaceTodo(workspace.id, todo.id)
													}
												>
													Delete Todo
												</button>
											</div>
										))}
										<input
											onBlur={(e) =>
												setWorkspaceScriptConfig(workspace.id, {
													setup_script: e.target.value || undefined,
												})
											}
											placeholder="setup script (optional)"
											type="text"
											value={workspaceScripts[workspace.id]?.setup_script || ""}
											onChange={(e) =>
												setWorkspaceScripts((prev) => ({
													...prev,
													[workspace.id]: {
														...prev[workspace.id],
														workspace_id: workspace.id,
														run_mode:
															prev[workspace.id]?.run_mode || "concurrent",
														updated_at: prev[workspace.id]?.updated_at || "",
														setup_script: e.target.value,
													},
												}))
											}
										/>
										<input
											onBlur={(e) =>
												setWorkspaceScriptConfig(workspace.id, {
													run_script: e.target.value || undefined,
												})
											}
											placeholder="run script (optional)"
											type="text"
											value={workspaceScripts[workspace.id]?.run_script || ""}
											onChange={(e) =>
												setWorkspaceScripts((prev) => ({
													...prev,
													[workspace.id]: {
														...prev[workspace.id],
														workspace_id: workspace.id,
														run_mode:
															prev[workspace.id]?.run_mode || "concurrent",
														updated_at: prev[workspace.id]?.updated_at || "",
														run_script: e.target.value,
													},
												}))
											}
										/>
										<input
											onBlur={(e) =>
												setWorkspaceScriptConfig(workspace.id, {
													archive_script: e.target.value || undefined,
												})
											}
											placeholder="archive script (optional)"
											type="text"
											value={
												workspaceScripts[workspace.id]?.archive_script || ""
											}
											onChange={(e) =>
												setWorkspaceScripts((prev) => ({
													...prev,
													[workspace.id]: {
														...prev[workspace.id],
														workspace_id: workspace.id,
														run_mode:
															prev[workspace.id]?.run_mode || "concurrent",
														updated_at: prev[workspace.id]?.updated_at || "",
														archive_script: e.target.value,
													},
												}))
											}
										/>
										<select
											onChange={(e) => {
												const nextRunMode =
													e.target.value === "nonconcurrent"
														? "nonconcurrent"
														: "concurrent";
												setWorkspaceScripts((prev) => ({
													...prev,
													[workspace.id]: {
														workspace_id: workspace.id,
														setup_script: prev[workspace.id]?.setup_script,
														run_script: prev[workspace.id]?.run_script,
														archive_script: prev[workspace.id]?.archive_script,
														run_mode: nextRunMode,
														updated_at: prev[workspace.id]?.updated_at || "",
													},
												}));
												setWorkspaceScriptConfig(workspace.id, {
													run_mode: nextRunMode,
												});
											}}
											value={
												workspaceScripts[workspace.id]?.run_mode || "concurrent"
											}
										>
											<option value="concurrent">Concurrent</option>
											<option value="nonconcurrent">Non-concurrent</option>
										</select>
										{workspaceScriptOutput[workspace.id] && (
											<pre>{workspaceScriptOutput[workspace.id]}</pre>
										)}
									</div>
									<button
										className="icon-btn"
										disabled={workspace.status === "archived"}
										onClick={() => {
											setWorkspaceInput(workspace.repoPath);
											setSelectedWorkspaceId(workspace.id);
											setView("spawn");
										}}
									>
										Use in Spawn
									</button>
									<button
										className="icon-btn"
										onClick={() => openWorkspaceInIde(workspace.id)}
									>
										Open IDE
									</button>
									{workspace.spotlightEnabled ? (
										<button
											className="icon-btn"
											onClick={() => disableWorkspaceSpotlight(workspace.id)}
										>
											Disable Spotlight
										</button>
									) : (
										<button
											className="icon-btn"
											disabled={workspace.status === "archived"}
											onClick={() => enableWorkspaceSpotlight(workspace.id)}
										>
											Enable Spotlight
										</button>
									)}
									<button
										className="icon-btn"
										disabled={workspace.status === "archived"}
										onClick={() => runWorkspaceScript(workspace.id, "setup")}
									>
										Run Setup
									</button>
									<button
										className="icon-btn"
										disabled={workspace.status === "archived"}
										onClick={() => runWorkspaceScript(workspace.id, "run")}
									>
										Run
									</button>
									<button
										className="icon-btn"
										disabled={!workspaceScriptRunning[workspace.id]}
										onClick={() => stopWorkspaceScript(workspace.id)}
									>
										Stop
									</button>
									<button
										className="icon-btn"
										onClick={() => runWorkspaceScript(workspace.id, "archive")}
									>
										Run Archive
									</button>
									{workspace.status === "archived" ? (
										<button
											className="icon-btn"
											onClick={() => restoreWorkspace(workspace.id)}
										>
											Restore
										</button>
									) : (
										<button
											className="icon-btn"
											onClick={() => archiveWorkspace(workspace.id)}
										>
											Archive
										</button>
									)}
									<button
										className="icon-btn"
										disabled={workspace.status === "archived"}
										onClick={() => createWorkspacePr(workspace.id)}
									>
										Create PR
									</button>
									{workspacePrs[workspace.id] && (
										<button
											className="icon-btn"
											onClick={() => refreshWorkspacePr(workspace.id)}
										>
											Refresh PR
										</button>
									)}
									{workspacePrs[workspace.id] &&
										workspacePrs[workspace.id].status === "open" && (
											<button
												className="icon-btn"
												disabled={(workspaceTodos[workspace.id] || []).some(
													(todo) => !todo.completed,
												)}
												onClick={() => mergeWorkspacePr(workspace.id)}
											>
												Merge PR
											</button>
										)}
									<button
										className="delete-btn"
										onClick={() => removeWorkspace(workspace.id)}
									>
										Delete
									</button>
									{workspacePrs[workspace.id] && (
										<span className="list-item-subtitle">
											PR: {workspacePrs[workspace.id].pr_url} (
											{workspacePrs[workspace.id].status})
										</span>
									)}
									{workspacePrs[workspace.id] &&
										workspacePrs[workspace.id].checks_total > 0 && (
											<span className="list-item-subtitle">
												Checks: {workspacePrs[workspace.id].checks_state} · ✅{" "}
												{workspacePrs[workspace.id].checks_passed} · ❌{" "}
												{workspacePrs[workspace.id].checks_failed} · ⏳{" "}
												{workspacePrs[workspace.id].checks_pending}
											</span>
										)}
								</div>
							))
						)}
					</div>
				</main>
			</div>
		);
	}

	if (view === "runs") {
		return (
			<div className="app">
				<header className="header">
					<h1>Run Panel</h1>
					<button className="back-btn" onClick={() => setView("dashboard")}>
						Back
					</button>
				</header>
				<main className="main">
					<div className="list-card">
						<h3>Workspace Runs</h3>
						{workspaces.length === 0 ? (
							<p className="empty">No workspaces yet</p>
						) : (
							workspaces.map((workspace) => (
								<div className="list-item" key={workspace.id}>
									<div className="list-item-content">
										<span className="list-item-title">
											{workspace.name} (
											{workspaceScriptRunning[workspace.id]
												? "running"
												: "idle"}
											)
										</span>
										<span className="list-item-subtitle">
											{workspaceScripts[workspace.id]?.run_script ||
												"No run script configured"}
										</span>
										<input
											onChange={(e) =>
												setNewCheckpointName((prev) => ({
													...prev,
													[workspace.id]: e.target.value,
												}))
											}
											placeholder="Checkpoint name"
											type="text"
											value={newCheckpointName[workspace.id] || ""}
										/>
										<select
											onChange={(e) => {
												const checkpointId = e.target.value;
												if (checkpointId) {
													revertWorkspaceCheckpoint(workspace.id, checkpointId);
												}
											}}
											value=""
										>
											<option value="">Revert to checkpoint...</option>
											{(workspaceCheckpoints[workspace.id] || []).map(
												(checkpoint) => (
													<option key={checkpoint.id} value={checkpoint.id}>
														{checkpoint.name} ·{" "}
														{new Date(checkpoint.created_at).toLocaleString()}
													</option>
												),
											)}
										</select>
										<pre>
											{workspaceScriptOutput[workspace.id] ||
												"No run output yet"}
										</pre>
									</div>
									<button
										className="icon-btn"
										disabled={workspace.status === "archived"}
										onClick={() => createWorkspaceCheckpoint(workspace.id)}
									>
										Checkpoint
									</button>
									<button
										className="icon-btn"
										disabled={workspace.status === "archived"}
										onClick={() => runWorkspaceScript(workspace.id, "run")}
									>
										Run
									</button>
									<button
										className="icon-btn"
										disabled={!workspaceScriptRunning[workspace.id]}
										onClick={() => stopWorkspaceScript(workspace.id)}
									>
										Stop
									</button>
									<button
										className="icon-btn"
										disabled={workspace.status === "archived"}
										onClick={() => restartWorkspaceScript(workspace.id)}
									>
										Restart
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
						{selectedWorkspaceId && (
							<>
								<label>Slash Commands</label>
								<select
									disabled={loading}
									onChange={(e) => {
										const commandName = e.target.value;
										if (!commandName) {
											return;
										}
										setTaskInput(`/${commandName} `);
									}}
									value=""
								>
									<option value="">Insert slash command...</option>
									{(workspaceSlashCommands[selectedWorkspaceId] || []).map(
										(command) => (
											<option key={command.name} value={command.name}>
												/{command.name}
											</option>
										),
									)}
								</select>
							</>
						)}

						<label>Workspace (Git Repository)</label>
						<select
							disabled={loading}
							onChange={(e) => {
								const nextId = e.target.value;
								setSelectedWorkspaceId(nextId);
								const selected = workspaces.find((w) => w.id === nextId);
								if (selected) {
									setWorkspaceInput(selected.repoPath);
									loadWorkspaceSlashCommands(selected.id);
								}
							}}
							value={selectedWorkspaceId}
						>
							<option value="">Custom path</option>
							{workspaces
								.filter((w) => w.status !== "archived")
								.map((workspace) => (
									<option key={workspace.id} value={workspace.id}>
										{workspace.name} · {workspace.branchName}
									</option>
								))}
						</select>
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
							<option value="codex">Codex</option>
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

	if (view === "mcp") {
		return (
			<div className="app">
				<header className="header">
					<h1>MCP Servers</h1>
					<button className="back-btn" onClick={() => setView("dashboard")}>
						Back
					</button>
				</header>
				<main className="main">
					<div className="form-card">
						<h3>Add MCP Server</h3>
						<input
							onChange={(e) => setNewMcpName(e.target.value)}
							placeholder="Server Name"
							type="text"
							value={newMcpName}
						/>
						<input
							onChange={(e) => setNewMcpCommand(e.target.value)}
							placeholder="Command (e.g. npx)"
							type="text"
							value={newMcpCommand}
						/>
						<input
							onChange={(e) => setNewMcpArgs(e.target.value)}
							placeholder="Args (space-separated)"
							type="text"
							value={newMcpArgs}
						/>
						<button onClick={addMcpServer}>Add MCP</button>
					</div>
					<div className="list-card">
						<h3>Configured MCP Servers</h3>
						{mcpServers.length === 0 ? (
							<p className="empty">No MCP servers configured</p>
						) : (
							mcpServers.map((server) => (
								<div className="list-item" key={server.id}>
									<div className="list-item-content">
										<span className="list-item-title">
											{server.name} ({server.enabled ? "enabled" : "disabled"})
										</span>
										<span className="list-item-subtitle">
											{server.command} {server.args.join(" ")}
										</span>
										<span className="list-item-subtitle">
											Health: {server.health_status || "unknown"}
										</span>
									</div>
									<button
										className="icon-btn"
										onClick={() => checkMcpServerHealth(server.id)}
									>
										Check
									</button>
									<button
										className="icon-btn"
										onClick={() => toggleMcpServer(server)}
									>
										{server.enabled ? "Disable" : "Enable"}
									</button>
									<button
										className="delete-btn"
										onClick={() => deleteMcpServer(server.id)}
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

	return (
		<div className="app">
			<div className="dashboard-shell">
				<aside className="dashboard-sidebar">
					<div>
						<h1>OpenFarm</h1>
						<span className="subtitle">Multi-Agent Coding Platform</span>
					</div>
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
					<button className="icon-btn" onClick={() => setView("workspaces")}>
						Workspaces
					</button>
					<button className="icon-btn" onClick={() => setView("runs")}>
						Runs
					</button>
					<button className="icon-btn" onClick={() => setView("mcp")}>
						MCP
					</button>
					{selectedProject && (
						<button className="icon-btn" onClick={() => setView("sessions")}>
							Sessions
						</button>
					)}
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
				</aside>

				<main className="main dashboard-content">
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
														: agent.status === "rejected"
															? "Rejected"
															: agent.status === "killed"
																? "Killed"
																: agent.status === "approved"
																	? "Approved"
																	: agent.status === "merged"
																		? "Merged"
																		: "Pending"}
										</span>
										<span className="provider">{agent.provider}</span>
									</div>
									<p className="task">{agent.task}</p>
									{(agentOutput[agent.id] || agent.output) && (
										<p className="task">
											{(agentOutput[agent.id] || agent.output || "")
												.slice(-120)
												.trim() || "Output available"}
										</p>
									)}
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
			</div>

			<footer className="footer">
				<span>Projects: {projects.length}</span>
				<span>Sessions: {sessions.length}</span>
				<span>Workspaces: {workspaces.length}</span>
				<span>Agents: {stats.total}</span>
			</footer>
		</div>
	);
}

export default App;
