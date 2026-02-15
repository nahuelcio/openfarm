import { invoke as tauriInvoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type {
	Agent,
	AgentExecutionEvent,
	AgentMode,
	AgentProvider,
	AppSettings,
	Attachment,
	BootstrapState,
	FileDiff,
	ProviderConfig,
	Workspace,
	WorkspaceFileEntry,
	WorkspaceSlashCommand,
} from "./store";
import { DEFAULT_SETTINGS } from "./store";

type AgentEventType =
	| "agent:started"
	| "agent:output"
	| "agent:completed"
	| "agent:failed"
	| "agent:diff-updated";

interface WebDb {
	workspaces: Workspace[];
	settings: AppSettings;
	installedMcps: Array<{
		id: string;
		provider: AgentProvider;
		config: Record<string, any>;
		installedAt: string;
	}>;
}

const WEB_DB_KEY = "openfarm-app-web-db-v1";

function isTauriRuntime(): boolean {
	if (typeof window === "undefined") {
		return false;
	}
	const candidate = window as unknown as Record<string, unknown>;
	return Boolean(
		candidate.__TAURI_INTERNALS__ ||
			candidate.__TAURI__ ||
			candidate.__TAURI_IPC__,
	);
}

function createEmptyDb(): WebDb {
	return {
		workspaces: [],
		settings: DEFAULT_SETTINGS,
		installedMcps: [],
	};
}

function readWebDb(): WebDb {
	if (typeof window === "undefined") {
		return createEmptyDb();
	}
	try {
		const raw = window.localStorage.getItem(WEB_DB_KEY);
		if (!raw) {
			return createEmptyDb();
		}
		return { ...createEmptyDb(), ...(JSON.parse(raw) as Partial<WebDb>) };
	} catch {
		return createEmptyDb();
	}
}

function writeWebDb(db: WebDb): void {
	if (typeof window === "undefined") {
		return;
	}
	window.localStorage.setItem(WEB_DB_KEY, JSON.stringify(db));
}

function nowTimeLabel(): string {
	return new Date().toLocaleTimeString([], {
		hour: "2-digit",
		minute: "2-digit",
	});
}

async function webInvoke<T>(
	command: string,
	payload: Record<string, unknown>,
): Promise<T> {
	const db = readWebDb();
	switch (command) {
		case "bootstrap_app_state":
			return { workspaces: db.workspaces, settings: db.settings } as T;
		case "get_settings":
			return db.settings as T;
		case "save_settings":
			db.settings = payload.settings as AppSettings;
			writeWebDb(db);
			return db.settings as T;
		case "get_provider_catalog":
			return DEFAULT_SETTINGS.providers as T;
		case "load_agent_diffs": {
			const agentId = String(payload.agentId || "");
			for (const workspace of db.workspaces) {
				const agent = workspace.agents.find((item) => item.id === agentId);
				if (agent) {
					return agent.diffs as T;
				}
			}
			return [] as T;
		}
		case "create_agent": {
			const prompt = String(payload.prompt || "");
			const repo = String(payload.repo || "");
			const provider = String(payload.provider || "claude-code");
			const model = String(payload.model || "");
			const baseBranch = String(payload.baseBranch || "").trim();
			const segments = repo.split("/");
			const workspaceName =
				segments[segments.length - 1] || repo || "workspace";
			const workspaceId = `ws-${Math.random().toString(36).slice(2, 8)}`;
			const agentId = `agent-${Math.random().toString(36).slice(2, 8)}`;
			const agent: Agent = {
				id: agentId,
				name: prompt.slice(0, 40) || "New agent",
				repo,
				branch:
					baseBranch ||
					`feat/${prompt
						.slice(0, 20)
						.toLowerCase()
						.replace(/[^a-z0-9]+/g, "-")}`,
				status: "running",
				provider: provider as Agent["provider"],
				model,
				prompt,
				filesChanged: 0,
				linesAdded: 0,
				linesRemoved: 0,
				startedAt: "just now",
				diffs: [],
				messages: [
					{
						id: `m-${Date.now()}-u`,
						role: "user",
						content: prompt,
						timestamp: nowTimeLabel(),
					},
					{
						id: `m-${Date.now()}-a`,
						role: "agent",
						content: "Starting task in web fallback mode.",
						timestamp: nowTimeLabel(),
						thinking: true,
					},
				],
			};

			const existing = db.workspaces.find(
				(workspace) => workspace.repo === repo,
			);
			if (existing) {
				existing.agents.push(agent);
			} else {
				db.workspaces.push({
					id: workspaceId,
					name: workspaceName,
					repo,
					agents: [agent],
				});
			}
			writeWebDb(db);
			return { workspaces: db.workspaces, settings: db.settings } as T;
		}
		case "create_agent_in_workspace": {
			const prompt = String(payload.prompt || "");
			const workspaceId = String(payload.workspaceId || "");
			const provider = String(payload.provider || "claude-code");
			const model = String(payload.model || "");
			const baseBranch = String(payload.baseBranch || "").trim();
			const workspace = db.workspaces.find((item) => item.id === workspaceId);
			if (!workspace) {
				throw new Error("Workspace not found");
			}
			const agentId = `agent-${Math.random().toString(36).slice(2, 8)}`;
			const agent: Agent = {
				id: agentId,
				name: prompt.slice(0, 40) || "New agent",
				repo: workspace.repo,
				branch:
					baseBranch ||
					`feat/${prompt
						.slice(0, 20)
						.toLowerCase()
						.replace(/[^a-z0-9]+/g, "-")}`,
				status: "running",
				provider: provider as Agent["provider"],
				model,
				prompt,
				filesChanged: 0,
				linesAdded: 0,
				linesRemoved: 0,
				startedAt: "just now",
				diffs: [],
				messages: [
					{
						id: `m-${Date.now()}-u`,
						role: "user",
						content: prompt,
						timestamp: nowTimeLabel(),
					},
					{
						id: `m-${Date.now()}-a`,
						role: "agent",
						content: "Starting task in web fallback mode.",
						timestamp: nowTimeLabel(),
						thinking: true,
					},
				],
			};
			workspace.agents.push(agent);
			writeWebDb(db);
			return { workspaces: db.workspaces, settings: db.settings } as T;
		}
		case "archive_agent_conversation": {
			const agentId = String(payload.agentId || "");
			db.workspaces = db.workspaces.map((workspace) => ({
				...workspace,
				agents: workspace.agents.filter((agent) => agent.id !== agentId),
			}));
			writeWebDb(db);
			return { workspaces: db.workspaces, settings: db.settings } as T;
		}
		case "list_repository_branches":
			return ["main", "master"] as T;
		case "add_local_workspace": {
			const repoPath = String(payload.repoPath || "").trim();
			if (!repoPath) {
				throw new Error("Repository path is required");
			}
			const existing = db.workspaces.find(
				(workspace) => workspace.repo === repoPath,
			);
			if (!existing) {
				const segments = repoPath.split("/");
				const workspaceName =
					segments[segments.length - 1] || repoPath || "workspace";
				db.workspaces.push({
					id: `ws-${Math.random().toString(36).slice(2, 8)}`,
					name: workspaceName,
					repo: repoPath,
					agents: [],
				});
				writeWebDb(db);
			}
			return { workspaces: db.workspaces, settings: db.settings } as T;
		}
		case "send_agent_message": {
			const agentId = String(payload.agentId || "");
			const message = String(payload.message || "");
			const attachments =
				(payload.attachments as Attachment[] | undefined) || [];
			const provider = String(payload.provider || "").trim();
			const model = String(payload.model || "").trim();
			const agentMode = String(payload.agentMode || "").trim();
			for (const workspace of db.workspaces) {
				const agent = workspace.agents.find((item) => item.id === agentId);
				if (!agent) {
					continue;
				}
				if (provider) {
					agent.provider = provider as AgentProvider;
				}
				if (model) {
					agent.model = model;
				}
				if (agentMode) {
					agent.mode = agentMode as AgentMode;
				}
				agent.messages.push({
					id: `m-${Date.now()}-u`,
					role: "user",
					content: message,
					timestamp: nowTimeLabel(),
					attachments,
				});
				agent.messages.push({
					id: `m-${Date.now()}-a`,
					role: "agent",
					content: "Web fallback response: message received.",
					timestamp: nowTimeLabel(),
				});
				agent.status = "completed";
				break;
			}
			writeWebDb(db);
			return { workspaces: db.workspaces, settings: db.settings } as T;
		}
		case "kill_agent": {
			const agentId = String(payload.agentId || "");
			for (const workspace of db.workspaces) {
				const agent = workspace.agents.find((item) => item.id === agentId);
				if (!agent) {
					continue;
				}
				agent.status = "error";
				break;
			}
			writeWebDb(db);
			return undefined as T;
		}
		case "get_agent_events":
			return [] as T;
		case "list_workspace_files":
			return [] as T;
		case "list_workspace_slash_commands":
			return [] as T;
		case "expand_workspace_slash_command":
			return String(payload.input || "") as T;
		case "install_mcp": {
			const mcpId = String(payload.mcpId || "");
			const provider = String(payload.provider || "");
			const config = payload.config || {};
			const existingIndex = db.installedMcps.findIndex(
				(mcp) => mcp.id === mcpId && mcp.provider === provider,
			);
			if (existingIndex >= 0) {
				db.installedMcps[existingIndex] = {
					id: mcpId,
					provider: provider as AgentProvider,
					config,
					installedAt: new Date().toISOString(),
				};
			} else {
				db.installedMcps.push({
					id: mcpId,
					provider: provider as AgentProvider,
					config,
					installedAt: new Date().toISOString(),
				});
			}
			writeWebDb(db);
			return db.installedMcps as T;
		}
		case "uninstall_mcp": {
			const mcpId = String(payload.mcpId || "");
			const provider = String(payload.provider || "");
			db.installedMcps = db.installedMcps.filter(
				(mcp) => !(mcp.id === mcpId && mcp.provider === provider),
			);
			writeWebDb(db);
			return db.installedMcps as T;
		}
		case "get_installed_mcps":
			return db.installedMcps as T;
		default:
			throw new Error(`Unsupported web command: ${command}`);
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

export async function bootstrapAppState(): Promise<BootstrapState> {
	return invoke<BootstrapState>("bootstrap_app_state");
}

export async function createAgent(input: {
	prompt: string;
	repo: string;
	provider: string;
	model: string;
	baseBranch?: string;
	workspaceId?: string;
}): Promise<BootstrapState> {
	if (input.workspaceId?.trim()) {
		return invoke<BootstrapState>("create_agent_in_workspace", {
			prompt: input.prompt,
			workspaceId: input.workspaceId,
			provider: input.provider,
			model: input.model,
			baseBranch: input.baseBranch,
		});
	}
	return invoke<BootstrapState>("create_agent", input);
}

export async function listRepositoryBranches(
	repoPath: string,
): Promise<string[]> {
	return invoke<string[]>("list_repository_branches", { repoPath });
}

export async function addLocalWorkspace(
	repoPath: string,
): Promise<BootstrapState> {
	return invoke<BootstrapState>("add_local_workspace", { repoPath });
}

export async function sendAgentMessage(input: {
	agentId: string;
	message: string;
	attachments?: Attachment[];
	provider?: AgentProvider;
	model?: string;
	agentMode?: AgentMode;
}): Promise<BootstrapState> {
	return invoke<BootstrapState>("send_agent_message", input);
}

export async function killAgent(agentId: string): Promise<void> {
	return invoke<void>("kill_agent", { agentId });
}

export async function archiveAgentConversation(
	agentId: string,
): Promise<BootstrapState> {
	return invoke<BootstrapState>("archive_agent_conversation", { agentId });
}

export async function loadAgentDiffs(agentId: string): Promise<FileDiff[]> {
	return invoke<FileDiff[]>("load_agent_diffs", { agentId });
}

export async function getSettings(): Promise<AppSettings> {
	return invoke<AppSettings>("get_settings");
}

export async function saveSettings(
	settings: AppSettings,
): Promise<AppSettings> {
	return invoke<AppSettings>("save_settings", { settings });
}

export async function getProviderCatalog(): Promise<ProviderConfig[]> {
	return invoke<ProviderConfig[]>("get_provider_catalog");
}

interface RawAgentEvent {
	event_type: string;
	agent_id: string;
	data: Record<string, unknown>;
}

export async function getAgentEvents(
	agentId: string,
): Promise<AgentExecutionEvent[]> {
	const events = await invoke<RawAgentEvent[]>("get_agent_events", { agentId });
	return events.map((event) => ({
		eventType: event.event_type,
		agentId: event.agent_id,
		data: event.data || {},
	}));
}

export async function listWorkspaceFiles(
	workspaceId: string,
): Promise<WorkspaceFileEntry[]> {
	return invoke<WorkspaceFileEntry[]>("list_workspace_files", { workspaceId });
}

export async function listWorkspaceSlashCommands(
	workspaceId: string,
): Promise<WorkspaceSlashCommand[]> {
	return invoke<WorkspaceSlashCommand[]>("list_workspace_slash_commands", {
		workspaceId,
	});
}

export async function expandWorkspaceSlashCommand(
	workspaceId: string,
	input: string,
): Promise<string> {
	return invoke<string>("expand_workspace_slash_command", {
		workspaceId,
		input,
	});
}

export async function pickRepositoryDirectory(): Promise<string | null> {
	if (isTauriRuntime()) {
		const { open } = await import("@tauri-apps/plugin-dialog");
		const result = await open({
			directory: true,
			multiple: false,
			title: "Select local repository",
		});
		if (!result) {
			return null;
		}
		return Array.isArray(result) ? result[0] || null : result;
	}
	if (typeof window === "undefined") {
		return null;
	}
	const value = window.prompt("Repository path");
	return value?.trim() ? value.trim() : null;
}

export async function subscribeAgentEvents(
	event: AgentEventType,
	handler: (payload: unknown) => void,
): Promise<() => void> {
	if (!isTauriRuntime()) {
		return () => {};
	}
	const unlisten = await listen(event, (value) => {
		handler(value.payload);
	});
	return () => {
		unlisten();
	};
}

export async function installMcp(config: {
	mcpId: string;
	provider: AgentProvider;
	config: Record<string, any>;
}): Promise<Array<{
	id: string;
	provider: AgentProvider;
	config: Record<string, any>;
	installedAt: string;
}>> {
	return invoke("install_mcp", config);
}

export async function uninstallMcp(config: {
	mcpId: string;
	provider: AgentProvider;
}): Promise<Array<{
	id: string;
	provider: AgentProvider;
	config: Record<string, any>;
	installedAt: string;
}>> {
	return invoke("uninstall_mcp", config);
}

export async function getInstalledMcps(): Promise<Array<{
	id: string;
	provider: AgentProvider;
	config: Record<string, any>;
	installedAt: string;
}>> {
	return invoke("get_installed_mcps");
}
