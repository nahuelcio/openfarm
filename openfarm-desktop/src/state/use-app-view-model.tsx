import { invoke as tauriInvoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useEffect, useMemo, useState } from "react";

export interface Agent {
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

export interface Project {
	id: string;
	name: string;
	path: string;
	createdAt: string;
}

export interface Session {
	id: string;
	name: string;
	projectId: string;
	createdAt: string;
	agents: string[];
}

export interface DiffFile {
	path: string;
	patch: string;
}

export interface Workspace {
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

export interface WorkspacePr {
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

export interface WorkspaceScriptConfig {
	workspace_id: string;
	setup_script?: string;
	run_script?: string;
	archive_script?: string;
	run_mode: "concurrent" | "nonconcurrent";
	updated_at: string;
}

export interface WorkspaceCheckpoint {
	id: string;
	workspace_id: string;
	name: string;
	snapshot_ref: string;
	created_at: string;
}

export interface WorkspaceTodo {
	id: string;
	workspace_id: string;
	title: string;
	completed: boolean;
	created_at: string;
}

export interface WorkspaceSlashCommand {
	name: string;
	path: string;
	content: string;
}

export interface WorkspaceFileEntry {
	path: string;
	is_dir: boolean;
}

export interface McpServer {
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

export type AgentProfileId = "codex" | "claude-code" | "opencode";

export interface AgentConfigLocation {
	profile_id: AgentProfileId;
	primary_path: string;
	extra_paths: string[];
}

export interface DetectedAgentProfile {
	profile_id: AgentProfileId;
	location: AgentConfigLocation;
	exists: boolean;
	parse_error?: string | null;
}

export interface ConfigEnvVar {
	key: string;
	value: string;
	is_secret: boolean;
}

export interface ConfigMcpServer {
	name: string;
	command: string;
	args: string[];
	env: Record<string, string>;
	enabled: boolean;
}

export interface UnifiedAgentConfig {
	providers: string[];
	default_model?: string | null;
	env_vars: ConfigEnvVar[];
	mcp_servers: ConfigMcpServer[];
	skills: string[];
	agents: string[];
	plugins: string[];
}

export interface ImportedAgentConfig {
	location: AgentConfigLocation;
	config: UnifiedAgentConfig;
	warnings: string[];
}

export interface ConfigPatchPreview {
	target_path: string;
	before_hash: string;
	after_hash: string;
	unified_diff: string;
	backup_path: string;
	backup_id: string;
}

export interface ApplyResult {
	target_path: string;
	success: boolean;
	error_message?: string | null;
	backup_id?: string | null;
}

export interface AgentConfigBackup {
	backup_id: string;
	profile_id: AgentProfileId;
	target_path: string;
	backup_path: string;
	created_at: string;
}

interface AgentEvent {
	event_type: string;
	agent_id: string;
	data: {
		chunk?: string;
		[key: string]: unknown;
	};
}

export type View =
	| "dashboard"
	| "spawn"
	| "review"
	| "projects"
	| "sessions"
	| "workspaces"
	| "runs"
	| "mcp"
	| "settings";

interface WebDb {
	agents: Agent[];
	projects: Project[];
	sessions: Session[];
	workspaces: Workspace[];
	workspacePrs: Record<string, WorkspacePr>;
	workspaceScripts: Record<string, WorkspaceScriptConfig>;
	workspaceCheckpoints: Record<string, WorkspaceCheckpoint[]>;
	workspaceTodos: Record<string, WorkspaceTodo[]>;
	mcpServers: McpServer[];
	importedConfigs: Partial<Record<AgentProfileId, ImportedAgentConfig>>;
	backups: AgentConfigBackup[];
}

const WEB_DB_KEY = "openfarm-desktop-web-db-v1";

function isTauriRuntime(): boolean {
	if (typeof window === "undefined") {
		return false;
	}
	const maybeWindow = window as unknown as Record<string, unknown>;
	return Boolean(
		maybeWindow.__TAURI_INTERNALS__ ||
			maybeWindow.__TAURI__ ||
			maybeWindow.__TAURI_IPC__,
	);
}

function createEmptyWebDb(): WebDb {
	return {
		agents: [],
		projects: [],
		sessions: [],
		workspaces: [],
		workspacePrs: {},
		workspaceScripts: {},
		workspaceCheckpoints: {},
		workspaceTodos: {},
		mcpServers: [],
		importedConfigs: {},
		backups: [],
	};
}

function readWebDb(): WebDb {
	if (typeof window === "undefined") {
		return createEmptyWebDb();
	}
	try {
		const raw = window.localStorage.getItem(WEB_DB_KEY);
		if (!raw) {
			return createEmptyWebDb();
		}
		return {
			...createEmptyWebDb(),
			...(JSON.parse(raw) as Partial<WebDb>),
		};
	} catch {
		return createEmptyWebDb();
	}
}

function writeWebDb(db: WebDb): void {
	if (typeof window === "undefined") {
		return;
	}
	window.localStorage.setItem(WEB_DB_KEY, JSON.stringify(db));
}

function nowIso(): string {
	return new Date().toISOString();
}

function uid(prefix: string): string {
	return `${prefix}-${globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`}`;
}

function contentHash(text: string): string {
	let hash = 1469598103934665603n;
	for (let index = 0; index < text.length; index += 1) {
		hash ^= BigInt(text.charCodeAt(index));
		hash *= 1099511628211n;
	}
	return hash.toString(16);
}

function profileLocation(profileId: AgentProfileId): AgentConfigLocation {
	const home =
		typeof window !== "undefined"
			? window.localStorage.getItem("openfarm-web-home") || "~"
			: "~";
	if (profileId === "codex") {
		return {
			profile_id: "codex",
			primary_path: `${home}/.codex/config.json`,
			extra_paths: [`${home}/.codex/skills`, `${home}/.codex/agents`],
		};
	}
	if (profileId === "claude-code") {
		return {
			profile_id: "claude-code",
			primary_path: `${home}/.claude/settings.json`,
			extra_paths: [
				`${home}/.claude/skills`,
				`${home}/.claude/agents`,
				`${home}/.claude/plugins/config.json`,
			],
		};
	}
	return {
		profile_id: "opencode",
		primary_path: `${home}/.config/opencode/config.json`,
		extra_paths: [
			`${home}/.config/opencode/skills`,
			`${home}/.config/opencode/agents`,
		],
	};
}

async function webInvoke<T>(
	command: string,
	payload: Record<string, unknown> = {},
): Promise<T> {
	const db = readWebDb();
	switch (command) {
		case "get_agents":
			return db.agents as T;
		case "get_agents_by_project":
			return db.agents.filter(
				(agent) => agent.projectId === payload.projectId,
			) as T;
		case "get_agents_by_session":
			return db.agents.filter(
				(agent) => agent.sessionId === payload.sessionId,
			) as T;
		case "get_agent_events":
			return [] as T;
		case "spawn_agent": {
			const agent: Agent = {
				id: uid("agent"),
				task: String(payload.task || ""),
				provider: String(payload.provider || "web"),
				status: "completed",
				createdAt: nowIso(),
				output: "Web mode: simulated run.",
				projectId: (payload.projectId as string | null) || undefined,
				sessionId: (payload.sessionId as string | null) || undefined,
			};
			db.agents.unshift(agent);
			writeWebDb(db);
			return undefined as T;
		}
		case "kill_agent": {
			db.agents = db.agents.map((agent) =>
				agent.id === payload.agentId ? { ...agent, status: "killed" } : agent,
			);
			writeWebDb(db);
			return undefined as T;
		}
		case "approve_agent": {
			db.agents = db.agents.map((agent) =>
				agent.id === payload.agentId ? { ...agent, status: "approved" } : agent,
			);
			writeWebDb(db);
			return undefined as T;
		}
		case "reject_agent": {
			db.agents = db.agents.map((agent) =>
				agent.id === payload.agentId ? { ...agent, status: "rejected" } : agent,
			);
			writeWebDb(db);
			return undefined as T;
		}
		case "get_diff":
			return "Web mode: no git diff available." as T;
		case "get_diff_files":
			return [] as T;
		case "get_projects":
			return db.projects as T;
		case "add_project": {
			const project: Project = {
				id: uid("project"),
				name: String(payload.name || ""),
				path: String(payload.path || ""),
				createdAt: nowIso(),
			};
			db.projects.unshift(project);
			writeWebDb(db);
			return project.id as T;
		}
		case "remove_project": {
			const projectId = String(payload.projectId || "");
			db.projects = db.projects.filter((project) => project.id !== projectId);
			db.sessions = db.sessions.filter(
				(session) => session.projectId !== projectId,
			);
			db.workspaces = db.workspaces.filter(
				(workspace) => workspace.projectId !== projectId,
			);
			db.agents = db.agents.filter((agent) => agent.projectId !== projectId);
			writeWebDb(db);
			return undefined as T;
		}
		case "get_sessions":
			return db.sessions as T;
		case "get_sessions_by_project":
			return db.sessions.filter(
				(session) => session.projectId === payload.projectId,
			) as T;
		case "create_session": {
			const session: Session = {
				id: uid("session"),
				name: String(payload.name || ""),
				projectId: String(payload.projectId || ""),
				createdAt: nowIso(),
				agents: [],
			};
			db.sessions.unshift(session);
			writeWebDb(db);
			return session.id as T;
		}
		case "delete_session": {
			const sessionId = String(payload.sessionId || "");
			db.sessions = db.sessions.filter((session) => session.id !== sessionId);
			db.workspaces = db.workspaces.filter(
				(workspace) => workspace.sessionId !== sessionId,
			);
			db.agents = db.agents.filter((agent) => agent.sessionId !== sessionId);
			writeWebDb(db);
			return undefined as T;
		}
		case "get_workspaces":
			return db.workspaces as T;
		case "add_workspace": {
			const workspace: Workspace = {
				id: uid("workspace"),
				name: String(payload.name || ""),
				repoPath: String(payload.repoPath || ""),
				branchName: String(payload.branchName || "main"),
				sourceType: String(payload.sourceType || "branch"),
				sourceRef: (payload.sourceRef as string | null) || undefined,
				worktreePath: undefined,
				status: "active",
				projectId: (payload.projectId as string | null) || undefined,
				sessionId: (payload.sessionId as string | null) || undefined,
				createdAt: nowIso(),
				updatedAt: nowIso(),
				archivedAt: undefined,
				spotlightEnabled: false,
				spotlightBaseRef: undefined,
				spotlightSyncedAt: undefined,
			};
			db.workspaces.unshift(workspace);
			writeWebDb(db);
			return workspace.id as T;
		}
		case "archive_workspace": {
			db.workspaces = db.workspaces.map((workspace) =>
				workspace.id === payload.workspaceId
					? { ...workspace, status: "archived", archivedAt: nowIso() }
					: workspace,
			);
			writeWebDb(db);
			return undefined as T;
		}
		case "restore_workspace": {
			db.workspaces = db.workspaces.map((workspace) =>
				workspace.id === payload.workspaceId
					? { ...workspace, status: "active", archivedAt: undefined }
					: workspace,
			);
			writeWebDb(db);
			return undefined as T;
		}
		case "remove_workspace": {
			const workspaceId = String(payload.workspaceId || "");
			db.workspaces = db.workspaces.filter(
				(workspace) => workspace.id !== workspaceId,
			);
			delete db.workspacePrs[workspaceId];
			delete db.workspaceScripts[workspaceId];
			delete db.workspaceCheckpoints[workspaceId];
			delete db.workspaceTodos[workspaceId];
			writeWebDb(db);
			return undefined as T;
		}
		case "enable_workspace_spotlight": {
			db.workspaces = db.workspaces.map((workspace) =>
				workspace.id === payload.workspaceId
					? {
							...workspace,
							spotlightEnabled: true,
							spotlightSyncedAt: nowIso(),
						}
					: workspace,
			);
			writeWebDb(db);
			return db.workspaces.find(
				(workspace) => workspace.id === payload.workspaceId,
			) as T;
		}
		case "disable_workspace_spotlight": {
			db.workspaces = db.workspaces.map((workspace) =>
				workspace.id === payload.workspaceId
					? { ...workspace, spotlightEnabled: false }
					: workspace,
			);
			writeWebDb(db);
			return db.workspaces.find(
				(workspace) => workspace.id === payload.workspaceId,
			) as T;
		}
		case "get_workspace_pr":
			return (db.workspacePrs[String(payload.workspaceId || "")] || null) as T;
		case "create_workspace_pr": {
			const workspaceId = String(payload.workspaceId || "");
			const pr: WorkspacePr = {
				workspace_id: workspaceId,
				pr_url: `https://example.com/pr/${workspaceId}`,
				pr_number: undefined,
				status: "open",
				created_at: nowIso(),
				merged_at: undefined,
				checks_total: 0,
				checks_passed: 0,
				checks_failed: 0,
				checks_pending: 0,
				checks_state: "pending",
				checks_updated_at: nowIso(),
			};
			db.workspacePrs[workspaceId] = pr;
			writeWebDb(db);
			return pr as T;
		}
		case "refresh_workspace_pr": {
			const workspaceId = String(payload.workspaceId || "");
			const existing = db.workspacePrs[workspaceId];
			if (existing) {
				db.workspacePrs[workspaceId] = {
					...existing,
					checks_state: "passed",
					checks_total: 1,
					checks_passed: 1,
					checks_pending: 0,
					checks_failed: 0,
					checks_updated_at: nowIso(),
				};
				writeWebDb(db);
			}
			return db.workspacePrs[workspaceId] as T;
		}
		case "merge_workspace_pr": {
			const workspaceId = String(payload.workspaceId || "");
			const existing = db.workspacePrs[workspaceId];
			if (existing) {
				db.workspacePrs[workspaceId] = {
					...existing,
					status: "merged",
					merged_at: nowIso(),
				};
				writeWebDb(db);
			}
			return db.workspacePrs[workspaceId] as T;
		}
		case "get_workspace_script_config":
			return (db.workspaceScripts[String(payload.workspaceId || "")] ||
				null) as T;
		case "set_workspace_script_config": {
			const workspaceId = String(payload.workspaceId || "");
			const config: WorkspaceScriptConfig = {
				workspace_id: workspaceId,
				setup_script: (payload.setupScript as string | null) || undefined,
				run_script: (payload.runScript as string | null) || undefined,
				archive_script: (payload.archiveScript as string | null) || undefined,
				run_mode: String(payload.runMode || "concurrent") as
					| "concurrent"
					| "nonconcurrent",
				updated_at: nowIso(),
			};
			db.workspaceScripts[workspaceId] = config;
			writeWebDb(db);
			return undefined as T;
		}
		case "run_workspace_script":
			return "Web mode: script execution is simulated." as T;
		case "stop_workspace_script":
			return undefined as T;
		case "get_workspace_checkpoints":
			return (db.workspaceCheckpoints[String(payload.workspaceId || "")] ||
				[]) as T;
		case "create_workspace_checkpoint": {
			const workspaceId = String(payload.workspaceId || "");
			const checkpoint: WorkspaceCheckpoint = {
				id: uid("checkpoint"),
				workspace_id: workspaceId,
				name: String(payload.name || "checkpoint"),
				snapshot_ref: uid("snapshot"),
				created_at: nowIso(),
			};
			db.workspaceCheckpoints[workspaceId] = [
				checkpoint,
				...(db.workspaceCheckpoints[workspaceId] || []),
			];
			writeWebDb(db);
			return checkpoint as T;
		}
		case "revert_workspace_checkpoint":
			return undefined as T;
		case "get_workspace_todos":
			return (db.workspaceTodos[String(payload.workspaceId || "")] || []) as T;
		case "add_workspace_todo": {
			const workspaceId = String(payload.workspaceId || "");
			const todo: WorkspaceTodo = {
				id: uid("todo"),
				workspace_id: workspaceId,
				title: String(payload.title || ""),
				completed: false,
				created_at: nowIso(),
			};
			db.workspaceTodos[workspaceId] = [
				todo,
				...(db.workspaceTodos[workspaceId] || []),
			];
			writeWebDb(db);
			return todo as T;
		}
		case "toggle_workspace_todo": {
			const todoId = String(payload.todoId || "");
			for (const key of Object.keys(db.workspaceTodos)) {
				db.workspaceTodos[key] = db.workspaceTodos[key].map((todo) =>
					todo.id === todoId
						? { ...todo, completed: Boolean(payload.completed) }
						: todo,
				);
			}
			writeWebDb(db);
			return undefined as T;
		}
		case "delete_workspace_todo": {
			const todoId = String(payload.todoId || "");
			for (const key of Object.keys(db.workspaceTodos)) {
				db.workspaceTodos[key] = db.workspaceTodos[key].filter(
					(todo) => todo.id !== todoId,
				);
			}
			writeWebDb(db);
			return undefined as T;
		}
		case "list_workspace_slash_commands":
			return [] as T;
		case "expand_workspace_slash_command":
			return String(payload.input || "") as T;
		case "list_workspace_files":
			return [] as T;
		case "get_mcp_servers":
			return db.mcpServers as T;
		case "add_mcp_server": {
			const server: McpServer = {
				id: uid("mcp"),
				name: String(payload.name || ""),
				command: String(payload.command || ""),
				args: (payload.args as string[] | undefined) || [],
				env: (payload.env as Record<string, string> | undefined) || {},
				enabled: Boolean(payload.enabled ?? true),
				health_status: "unknown",
				last_checked_at: nowIso(),
				created_at: nowIso(),
				updated_at: nowIso(),
			};
			db.mcpServers.unshift(server);
			writeWebDb(db);
			return server as T;
		}
		case "update_mcp_server": {
			const serverId = String(payload.serverId || "");
			db.mcpServers = db.mcpServers.map((server) =>
				server.id === serverId
					? {
							...server,
							enabled: Boolean(payload.enabled),
							updated_at: nowIso(),
						}
					: server,
			);
			writeWebDb(db);
			return undefined as T;
		}
		case "delete_mcp_server": {
			const serverId = String(payload.serverId || "");
			db.mcpServers = db.mcpServers.filter((server) => server.id !== serverId);
			writeWebDb(db);
			return undefined as T;
		}
		case "check_mcp_server_health": {
			const serverId = String(payload.serverId || "");
			db.mcpServers = db.mcpServers.map((server) =>
				server.id === serverId
					? { ...server, health_status: "ok", last_checked_at: nowIso() }
					: server,
			);
			writeWebDb(db);
			return undefined as T;
		}
		case "detect_agent_configs": {
			const profiles: AgentProfileId[] = ["codex", "claude-code", "opencode"];
			const detected = profiles.map((profileId) => ({
				profile_id: profileId,
				location: profileLocation(profileId),
				exists: Boolean(db.importedConfigs[profileId]),
				parse_error: null,
			}));
			return detected as T;
		}
		case "import_agent_config": {
			const profileId = String(payload.profile) as AgentProfileId;
			const imported: ImportedAgentConfig = db.importedConfigs[profileId] || {
				location: profileLocation(profileId),
				config: {
					providers: [profileId],
					default_model: null,
					env_vars: [],
					mcp_servers: [],
					skills: [],
					agents: [],
					plugins: [],
				},
				warnings: ["Web mode uses in-memory config stubs."],
			};
			db.importedConfigs[profileId] = imported;
			writeWebDb(db);
			return imported as T;
		}
		case "preview_agent_config_patch": {
			const changes = payload.changes as {
				profile_id: AgentProfileId;
				config: UnifiedAgentConfig;
			};
			const beforeConfig = db.importedConfigs[changes.profile_id]?.config || {
				providers: [changes.profile_id],
				default_model: null,
				env_vars: [],
				mcp_servers: [],
				skills: [],
				agents: [],
				plugins: [],
			};
			const beforeText = JSON.stringify(beforeConfig, null, 2);
			const afterText = JSON.stringify(changes.config, null, 2);
			const backupId = uid("backup");
			const preview: ConfigPatchPreview = {
				target_path: profileLocation(changes.profile_id).primary_path,
				before_hash: contentHash(beforeText),
				after_hash: contentHash(afterText),
				unified_diff: `--- before\n+++ after\n@@\n-${beforeText}\n+${afterText}`,
				backup_path: `web://${backupId}.bak`,
				backup_id: backupId,
			};
			return preview as T;
		}
		case "apply_agent_config_patch": {
			const changes = payload.changes as {
				profile_id: AgentProfileId;
				config: UnifiedAgentConfig;
			};
			const profileId = changes.profile_id;
			const current = db.importedConfigs[profileId] || {
				location: profileLocation(profileId),
				config: changes.config,
				warnings: [],
			};
			const backupId = uid("backup");
			db.backups.unshift({
				backup_id: backupId,
				profile_id: profileId,
				target_path: current.location.primary_path,
				backup_path: `web://${backupId}.bak`,
				created_at: nowIso(),
			});
			db.importedConfigs[profileId] = {
				...current,
				config: changes.config,
				warnings: [],
			};
			writeWebDb(db);
			const result: ApplyResult = {
				target_path: current.location.primary_path,
				success: true,
				error_message: null,
				backup_id: backupId,
			};
			return result as T;
		}
		case "rollback_config_patch": {
			const backupId = String(payload.backupId || "");
			const backup = db.backups.find((item) => item.backup_id === backupId);
			const result: ApplyResult = {
				target_path: backup?.target_path || "unknown",
				success: Boolean(backup),
				error_message: backup ? null : "Backup not found in web mode",
				backup_id: backupId || null,
			};
			return result as T;
		}
		case "list_agent_backups": {
			const profile = String(payload.profile) as AgentProfileId;
			return db.backups.filter((item) => item.profile_id === profile) as T;
		}
		case "open_workspace_in_ide":
			return undefined as T;
		default:
			throw new Error(`Web mode command not implemented: ${command}`);
	}
}

async function invoke<T>(
	command: string,
	payload: Record<string, unknown> = {},
): Promise<T> {
	if (isTauriRuntime()) {
		try {
			return await tauriInvoke<T>(command, payload);
		} catch (error) {
			const message = String(error);
			if (message.includes("IPC") || message.includes("tauri")) {
				return webInvoke<T>(command, payload);
			}
			throw error;
		}
	}
	return webInvoke<T>(command, payload);
}

async function pickDirectoryPath(): Promise<string | null> {
	if (isTauriRuntime()) {
		const plugin = await import("@tauri-apps/plugin-dialog");
		const selected = await plugin.open({
			directory: true,
			multiple: false,
		});
		if (!selected || Array.isArray(selected)) {
			return null;
		}
		return selected;
	}

	if (typeof document === "undefined") {
		return null;
	}

	return await new Promise<string | null>((resolve) => {
		const input = document.createElement("input");
		input.type = "file";
		input.setAttribute("webkitdirectory", "true");
		input.multiple = true;
		input.onchange = () => {
			const first = input.files?.[0];
			if (!first) {
				resolve(null);
				return;
			}
			const firstSegment = first.webkitRelativePath.split("/")[0];
			resolve(firstSegment || first.name || "selected-folder");
		};
		input.click();
	});
}

function inferProjectName(path: string): string {
	const value = path.trim().replace(/[\\/]+$/, "");
	if (!value) {
		return "";
	}
	const segments = value.split(/[\\/]/).filter(Boolean);
	return segments[segments.length - 1] || "";
}

export function useAppViewModel() {
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
	const [projectFormError, setProjectFormError] = useState("");
	const [isPickingProjectPath, setIsPickingProjectPath] = useState(false);
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
	const [workspaceFiles, setWorkspaceFiles] = useState<
		Record<string, WorkspaceFileEntry[]>
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
	const [isSidebarOpen, setIsSidebarOpen] = useState(true);
	const [settingsProfile, setSettingsProfile] =
		useState<AgentProfileId>("codex");
	const [detectedProfiles, setDetectedProfiles] = useState<
		DetectedAgentProfile[]
	>([]);
	const [agentConfigState, setAgentConfigState] = useState<
		Partial<Record<AgentProfileId, UnifiedAgentConfig>>
	>({});
	const [pendingPatches, setPendingPatches] = useState<
		Partial<Record<AgentProfileId, ConfigPatchPreview>>
	>({});
	const [agentConfigBackups, setAgentConfigBackups] = useState<
		Partial<Record<AgentProfileId, AgentConfigBackup[]>>
	>({});
	const [applyStatus, setApplyStatus] = useState("");
	const [settingsError, setSettingsError] = useState("");
	const [settingsLoading, setSettingsLoading] = useState(false);

	useEffect(() => {
		const handleResize = () => {
			if (window.innerWidth < 1080) {
				setIsSidebarOpen(false);
			}
		};
		handleResize();
		window.addEventListener("resize", handleResize);
		return () => window.removeEventListener("resize", handleResize);
	}, []);

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
		if (!selectedWorkspaceId) {
			return;
		}
		loadWorkspaceFiles(selectedWorkspaceId);
	}, [selectedWorkspaceId, workspaces.length]);

	useEffect(() => {
		if (view !== "settings") {
			return;
		}
		detectAgentConfigs();
		importAgentConfigs(settingsProfile);
	}, [view, settingsProfile]);

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
					(workspace) => workspace.status !== "archived",
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
		} catch (error) {
			console.error("Failed to load agents:", error);
		}
	}

	async function loadProjects() {
		try {
			const result = await invoke<Project[]>("get_projects");
			setProjects(result);
		} catch (error) {
			console.error("Failed to load projects:", error);
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
		} catch (error) {
			console.error("Failed to load sessions:", error);
		}
	}

	async function loadWorkspaces() {
		try {
			const result = await invoke<Workspace[]>("get_workspaces");
			const normalized = result.map((workspace) => ({
				...workspace,
				name: workspace.name || "Untitled workspace",
				repoPath: workspace.repoPath || "",
				branchName: workspace.branchName || "main",
				sourceType: workspace.sourceType || "branch",
				status: workspace.status || "active",
			}));
			setWorkspaces(normalized);
			const entries = await Promise.all(
				normalized.map(async (workspace) => {
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
		} catch (error) {
			console.error("Failed to load workspaces:", error);
		}
	}

	async function loadMcpServers() {
		try {
			const result = await invoke<McpServer[]>("get_mcp_servers");
			setMcpServers(result);
		} catch (error) {
			console.error("Failed to load MCP servers:", error);
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
		} catch (error) {
			console.error("Failed to spawn agent:", error);
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
		} catch (error) {
			console.error("Failed to load workspace slash commands:", error);
		}
	}

	async function loadWorkspaceFiles(workspaceId: string) {
		if (!workspaceId) {
			return;
		}
		try {
			const files = await invoke<WorkspaceFileEntry[]>("list_workspace_files", {
				workspaceId,
			});
			setWorkspaceFiles((prev) => ({ ...prev, [workspaceId]: files }));
		} catch (error) {
			console.error("Failed to load workspace files:", error);
			setWorkspaceFiles((prev) => ({ ...prev, [workspaceId]: [] }));
		}
	}

	async function killAgent(id: string) {
		try {
			await invoke("kill_agent", { agentId: id });
			loadAgents();
		} catch (error) {
			console.error("Failed to kill agent:", error);
		}
	}

	async function approveAgent(agentId: string) {
		try {
			setReviewError("");
			await invoke("approve_agent", { agentId });
			loadAgents();
		} catch (error) {
			console.error("Failed to approve agent:", error);
			setReviewError(String(error));
		}
	}

	async function rejectAgent(agentId: string, reason: string) {
		try {
			setReviewError("");
			await invoke("reject_agent", { agentId, reason });
			loadAgents();
			setView("dashboard");
		} catch (error) {
			console.error("Failed to reject agent:", error);
			setReviewError(String(error));
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
		} catch (error) {
			console.error("Failed to get diff:", error);
			setDiff("No changes or unable to fetch diff");
			setDiffFiles([]);
			setSelectedDiffFile("");
		}
	}

	async function browseProjectFolder() {
		setProjectFormError("");
		setIsPickingProjectPath(true);
		try {
			const selected = await pickDirectoryPath();
			if (!selected) {
				return;
			}
			setNewProjectPath(selected);
			if (!newProjectName.trim()) {
				setNewProjectName(inferProjectName(selected));
			}
		} catch (error) {
			setProjectFormError(`Folder picker failed: ${String(error)}`);
		} finally {
			setIsPickingProjectPath(false);
		}
	}

	async function addProject() {
		if (!newProjectName.trim() || !newProjectPath.trim()) {
			setProjectFormError("Project name and path are required.");
			return;
		}
		try {
			setProjectFormError("");
			await invoke("add_project", {
				name: newProjectName,
				path: newProjectPath,
			});
			setNewProjectName("");
			setNewProjectPath("");
			loadProjects();
			setView("dashboard");
		} catch (error) {
			setProjectFormError(`Failed to add project: ${String(error)}`);
		}
	}

	async function removeProject(projectId: string) {
		try {
			await invoke("remove_project", { projectId });
			if (selectedProject?.id === projectId) {
				setSelectedProject(null);
			}
			loadProjects();
		} catch (error) {
			console.error("Failed to remove project:", error);
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
		} catch (error) {
			console.error("Failed to create session:", error);
		}
	}

	async function deleteSession(sessionId: string) {
		try {
			await invoke("delete_session", { sessionId });
			if (selectedSession?.id === sessionId) {
				setSelectedSession(null);
			}
			loadSessions();
		} catch (error) {
			console.error("Failed to delete session:", error);
		}
	}

	async function addWorkspace() {
		if (!newWorkspaceName.trim() || !newWorkspaceRepoPath.trim()) {
			return;
		}
		const branchName = newWorkspaceBranchName.trim() || "main";
		try {
			const workspaceId = await invoke<string>("add_workspace", {
				name: newWorkspaceName,
				repoPath: newWorkspaceRepoPath,
				branchName,
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
		} catch (error) {
			console.error("Failed to add workspace:", error);
		}
	}

	async function archiveWorkspace(workspaceId: string) {
		try {
			await invoke("archive_workspace", { workspaceId });
			loadWorkspaces();
		} catch (error) {
			console.error("Failed to archive workspace:", error);
		}
	}

	async function restoreWorkspace(workspaceId: string) {
		try {
			await invoke("restore_workspace", { workspaceId });
			loadWorkspaces();
		} catch (error) {
			console.error("Failed to restore workspace:", error);
		}
	}

	async function removeWorkspace(workspaceId: string) {
		try {
			await invoke("remove_workspace", { workspaceId });
			loadWorkspaces();
		} catch (error) {
			console.error("Failed to remove workspace:", error);
		}
	}

	async function enableWorkspaceSpotlight(workspaceId: string) {
		try {
			await invoke<Workspace>("enable_workspace_spotlight", { workspaceId });
			await loadWorkspaces();
		} catch (error) {
			console.error("Failed to enable workspace spotlight:", error);
		}
	}

	async function disableWorkspaceSpotlight(workspaceId: string) {
		try {
			await invoke<Workspace>("disable_workspace_spotlight", { workspaceId });
			await loadWorkspaces();
		} catch (error) {
			console.error("Failed to disable workspace spotlight:", error);
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
		} catch (error) {
			console.error("Failed to create workspace PR:", error);
		}
	}

	async function refreshWorkspacePr(workspaceId: string) {
		try {
			const pr = await invoke<WorkspacePr>("refresh_workspace_pr", {
				workspaceId,
			});
			setWorkspacePrs((prev) => ({ ...prev, [workspaceId]: pr }));
		} catch (error) {
			console.error("Failed to refresh workspace PR:", error);
		}
	}

	async function mergeWorkspacePr(workspaceId: string) {
		try {
			const pr = await invoke<WorkspacePr>("merge_workspace_pr", {
				workspaceId,
			});
			setWorkspacePrs((prev) => ({ ...prev, [workspaceId]: pr }));
		} catch (error) {
			console.error("Failed to merge workspace PR:", error);
		}
	}

	async function openWorkspaceInIde(workspaceId: string) {
		try {
			await invoke("open_workspace_in_ide", { workspaceId });
		} catch (error) {
			console.error("Failed to open workspace in IDE:", error);
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
		} catch (error) {
			console.error("Failed to set workspace script config:", error);
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
		} catch (error) {
			setWorkspaceScriptOutput((prev) => ({
				...prev,
				[workspaceId]: `[${scriptType}] ERROR\n${String(error)}`,
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
		} catch (error) {
			setWorkspaceScriptOutput((prev) => ({
				...prev,
				[workspaceId]: `[stop] ERROR\n${String(error)}`,
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
		} catch (error) {
			console.error("Failed to create workspace checkpoint:", error);
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
		} catch (error) {
			console.error("Failed to revert workspace checkpoint:", error);
			setWorkspaceScriptOutput((prev) => ({
				...prev,
				[workspaceId]: `[checkpoint] revert error ${String(error)}\n${prev[workspaceId] || ""}`,
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
		} catch (error) {
			console.error("Failed to add workspace todo:", error);
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
		} catch (error) {
			console.error("Failed to toggle workspace todo:", error);
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
		} catch (error) {
			console.error("Failed to delete workspace todo:", error);
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
		} catch (error) {
			console.error("Failed to add MCP server:", error);
		}
	}

	async function toggleMcpServer(server: McpServer) {
		try {
			await invoke("update_mcp_server", {
				serverId: server.id,
				enabled: !server.enabled,
			});
			loadMcpServers();
		} catch (error) {
			console.error("Failed to toggle MCP server:", error);
		}
	}

	async function deleteMcpServer(serverId: string) {
		try {
			await invoke("delete_mcp_server", { serverId });
			loadMcpServers();
		} catch (error) {
			console.error("Failed to delete MCP server:", error);
		}
	}

	async function checkMcpServerHealth(serverId: string) {
		try {
			await invoke("check_mcp_server_health", { serverId });
			loadMcpServers();
		} catch (error) {
			console.error("Failed to check MCP server health:", error);
		}
	}

	async function detectAgentConfigs() {
		setSettingsLoading(true);
		setSettingsError("");
		try {
			const result = await invoke<DetectedAgentProfile[]>(
				"detect_agent_configs",
			);
			setDetectedProfiles(result);
		} catch (error) {
			setSettingsError(`Failed to detect configs: ${String(error)}`);
		} finally {
			setSettingsLoading(false);
		}
	}

	async function importAgentConfigs(profile: AgentProfileId) {
		setSettingsLoading(true);
		setSettingsError("");
		try {
			const result = await invoke<ImportedAgentConfig>("import_agent_config", {
				profile,
			});
			setAgentConfigState((prev) => ({
				...prev,
				[profile]: result.config,
			}));
			setPendingPatches((prev) => ({ ...prev, [profile]: undefined }));
			setApplyStatus("");
			const backups = await invoke<AgentConfigBackup[]>("list_agent_backups", {
				profile,
			});
			setAgentConfigBackups((prev) => ({ ...prev, [profile]: backups }));
		} catch (error) {
			setSettingsError(`Failed to import config: ${String(error)}`);
		} finally {
			setSettingsLoading(false);
		}
	}

	function setAgentConfig(profile: AgentProfileId, config: UnifiedAgentConfig) {
		setAgentConfigState((prev) => ({ ...prev, [profile]: config }));
	}

	async function buildConfigPatchPreview(profile: AgentProfileId) {
		const config = agentConfigState[profile];
		if (!config) {
			return;
		}
		setSettingsLoading(true);
		setSettingsError("");
		try {
			const patch = await invoke<ConfigPatchPreview>(
				"preview_agent_config_patch",
				{
					changes: {
						profile_id: profile,
						config,
						expected_before_hash: null,
					},
				},
			);
			setPendingPatches((prev) => ({ ...prev, [profile]: patch }));
		} catch (error) {
			setSettingsError(`Failed to generate patch preview: ${String(error)}`);
		} finally {
			setSettingsLoading(false);
		}
	}

	async function applyConfigPatch(profile: AgentProfileId) {
		const config = agentConfigState[profile];
		const patch = pendingPatches[profile];
		if (!config) {
			return;
		}
		setSettingsLoading(true);
		setSettingsError("");
		try {
			const result = await invoke<ApplyResult>("apply_agent_config_patch", {
				changes: {
					profile_id: profile,
					config,
					expected_before_hash: patch?.before_hash || null,
				},
			});
			if (result.success) {
				setApplyStatus(
					`Applied ${profile} config at ${new Date().toLocaleTimeString()}.`,
				);
				const backups = await invoke<AgentConfigBackup[]>(
					"list_agent_backups",
					{
						profile,
					},
				);
				setAgentConfigBackups((prev) => ({ ...prev, [profile]: backups }));
				const refreshed = await invoke<ImportedAgentConfig>(
					"import_agent_config",
					{
						profile,
					},
				);
				setAgentConfigState((prev) => ({
					...prev,
					[profile]: refreshed.config,
				}));
				setPendingPatches((prev) => ({ ...prev, [profile]: undefined }));
			} else {
				setSettingsError(result.error_message || "Failed to apply config.");
			}
		} catch (error) {
			setSettingsError(`Failed to apply patch: ${String(error)}`);
		} finally {
			setSettingsLoading(false);
		}
	}

	async function rollbackConfigPatch(backupId: string) {
		setSettingsLoading(true);
		setSettingsError("");
		try {
			const result = await invoke<ApplyResult>("rollback_config_patch", {
				backupId,
			});
			if (!result.success) {
				setSettingsError(result.error_message || "Rollback failed.");
				return;
			}
			const profile = settingsProfile;
			const refreshed = await invoke<ImportedAgentConfig>(
				"import_agent_config",
				{
					profile,
				},
			);
			setAgentConfigState((prev) => ({ ...prev, [profile]: refreshed.config }));
			const backups = await invoke<AgentConfigBackup[]>("list_agent_backups", {
				profile,
			});
			setAgentConfigBackups((prev) => ({ ...prev, [profile]: backups }));
			setPendingPatches((prev) => ({ ...prev, [profile]: undefined }));
			setApplyStatus(`Rollback applied from backup ${backupId}.`);
		} catch (error) {
			setSettingsError(`Failed to rollback: ${String(error)}`);
		} finally {
			setSettingsLoading(false);
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

	const stats = useMemo(
		() => ({
			total: agents.length,
			running: agents.filter((agent) => agent.status === "running").length,
			completed: agents.filter((agent) => agent.status === "completed").length,
			failed: agents.filter((agent) => agent.status === "failed").length,
		}),
		[agents],
	);

	return {
		agents,
		agentOutput,
		projects,
		sessions,
		workspaces,
		selectedAgent,
		selectedProject,
		selectedSession,
		taskInput,
		workspaceInput,
		selectedWorkspaceId,
		provider,
		view,
		loading,
		diff,
		diffFiles,
		selectedDiffFile,
		diffViewMode,
		diffFilter,
		reviewError,
		newProjectName,
		newProjectPath,
		projectFormError,
		isPickingProjectPath,
		newSessionName,
		newWorkspaceName,
		newWorkspaceRepoPath,
		newWorkspaceBranchName,
		newWorkspaceSourceType,
		newWorkspaceSourceRef,
		workspaceRepoFilter,
		workspaceStatusFilter,
		reviewRejectReason,
		workspacePrs,
		workspaceScripts,
		workspaceScriptOutput,
		workspaceScriptRunning,
		workspaceCheckpoints,
		workspaceTodos,
		workspaceSlashCommands,
		workspaceFiles,
		mcpServers,
		newMcpName,
		newMcpCommand,
		newMcpArgs,
		newWorkspaceTodo,
		newCheckpointName,
		isSidebarOpen,
		settingsProfile,
		detectedProfiles,
		agentConfigState,
		pendingPatches,
		agentConfigBackups,
		applyStatus,
		settingsError,
		settingsLoading,
		stats,
		setAgentOutput,
		setSelectedAgent,
		setSelectedProject,
		setSelectedSession,
		setTaskInput,
		setWorkspaceInput,
		setSelectedWorkspaceId,
		setProvider,
		setView,
		setDiff,
		setDiffFiles,
		setSelectedDiffFile,
		setDiffViewMode,
		setDiffFilter,
		setReviewError,
		setNewProjectName,
		setNewProjectPath,
		setProjectFormError,
		setNewSessionName,
		setNewWorkspaceName,
		setNewWorkspaceRepoPath,
		setNewWorkspaceBranchName,
		setNewWorkspaceSourceType,
		setNewWorkspaceSourceRef,
		setWorkspaceRepoFilter,
		setWorkspaceStatusFilter,
		setReviewRejectReason,
		setWorkspaceScripts,
		setWorkspaceScriptOutput,
		setWorkspaceScriptRunning,
		setWorkspaceCheckpoints,
		setWorkspaceTodos,
		setWorkspaceSlashCommands,
		setWorkspaceFiles,
		setMcpServers,
		setNewMcpName,
		setNewMcpCommand,
		setNewMcpArgs,
		setNewWorkspaceTodo,
		setNewCheckpointName,
		setIsSidebarOpen,
		setSettingsProfile,
		setAgentConfigState,
		setPendingPatches,
		setApplyStatus,
		loadAgents,
		loadProjects,
		loadSessions,
		loadWorkspaces,
		loadMcpServers,
		spawnAgent,
		loadWorkspaceSlashCommands,
		loadWorkspaceFiles,
		killAgent,
		approveAgent,
		rejectAgent,
		getAgentDiff,
		browseProjectFolder,
		addProject,
		removeProject,
		createSession,
		deleteSession,
		addWorkspace,
		archiveWorkspace,
		restoreWorkspace,
		removeWorkspace,
		enableWorkspaceSpotlight,
		disableWorkspaceSpotlight,
		createWorkspacePr,
		refreshWorkspacePr,
		mergeWorkspacePr,
		openWorkspaceInIde,
		setWorkspaceScriptConfig,
		runWorkspaceScript,
		stopWorkspaceScript,
		restartWorkspaceScript,
		createWorkspaceCheckpoint,
		revertWorkspaceCheckpoint,
		addWorkspaceTodo,
		toggleWorkspaceTodo,
		deleteWorkspaceTodo,
		addMcpServer,
		toggleMcpServer,
		deleteMcpServer,
		checkMcpServerHealth,
		detectAgentConfigs,
		importAgentConfigs,
		setAgentConfig,
		buildConfigPatchPreview,
		applyConfigPatch,
		rollbackConfigPatch,
		renderSplitPatch,
	};
}

export type AppViewModel = ReturnType<typeof useAppViewModel>;
