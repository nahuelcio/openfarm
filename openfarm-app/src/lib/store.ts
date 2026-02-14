export type AgentStatus =
	| "running"
	| "idle"
	| "completed"
	| "error"
	| "reviewing";

export type AgentProvider = "claude-code" | "codex" | "opencode";
export type AgentMode = string;

export interface AgentOption {
	id: string;
	name: string;
	description: string;
}

export interface Attachment {
	id: string;
	name: string;
	type: "image" | "code" | "document" | "other";
	size: string;
}

export interface DiffLine {
	type: "add" | "remove" | "context";
	content: string;
	oldLine?: number;
	newLine?: number;
}

export interface DiffHunk {
	oldStart: number;
	newStart: number;
	lines: DiffLine[];
}

export interface FileDiff {
	filename: string;
	path: string;
	status: "added" | "modified" | "deleted";
	linesAdded: number;
	linesRemoved: number;
	hunks: DiffHunk[];
}

export interface AgentMessage {
	id: string;
	role: "user" | "agent" | "system";
	content: string;
	timestamp: string;
	files?: string[];
	thinking?: boolean;
	attachments?: Attachment[];
}

export interface Agent {
	id: string;
	name: string;
	repo: string;
	branch: string;
	status: AgentStatus;
	provider: AgentProvider;
	model?: string;
	mode?: AgentMode;
	prompt: string;
	filesChanged: number;
	linesAdded: number;
	linesRemoved: number;
	startedAt: string;
	messages: AgentMessage[];
	diffs: FileDiff[];
}

export interface Workspace {
	id: string;
	name: string;
	repo: string;
	agents: Agent[];
}

export interface ModelOption {
	id: string;
	name: string;
	description: string;
}

export interface ProviderConfig {
	id: AgentProvider;
	name: string;
	description: string;
	color: string;
	connected: boolean;
	apiKey: string;
	models: ModelOption[];
	defaultModel: string;
	agents?: AgentOption[];
	defaultAgent?: string;
}

export interface AppSettings {
	providers: ProviderConfig[];
	defaultProvider: AgentProvider;
	defaultModel: string;
	temperature: number;
	maxTokens: number;
	systemPrompt: string;
	autoPR: boolean;
	branchConvention: string;
}

export interface BootstrapState {
	workspaces: Workspace[];
	settings: AppSettings;
}

export const DEFAULT_SETTINGS: AppSettings = {
	providers: [
		{
			id: "claude-code",
			name: "Claude Code",
			description: "Anthropic CLI agent",
			color: "#d97756",
			connected: true,
			apiKey: "",
			models: [
				{
					id: "claude-sonnet-4-20250514",
					name: "Claude Sonnet 4",
					description: "Fast coding model",
				},
				{
					id: "claude-opus-4-20250918",
					name: "Claude Opus 4",
					description: "Deep reasoning",
				},
			],
			defaultModel: "claude-sonnet-4-20250514",
			agents: [],
			defaultAgent: "",
		},
		{
			id: "codex",
			name: "Codex",
			description: "OpenAI Codex CLI agent",
			color: "#10a37f",
			connected: true,
			apiKey: "",
			models: [
				{
					id: "codex-mini-latest",
					name: "Codex Mini",
					description: "Fast coding tasks",
				},
				{
					id: "o4-mini",
					name: "o4-mini",
					description: "Reasoning model",
				},
			],
			defaultModel: "codex-mini-latest",
			agents: [],
			defaultAgent: "",
		},
		{
			id: "opencode",
			name: "OpenCode",
			description: "OpenCode CLI agent",
			color: "#06b6d4",
			connected: true,
			apiKey: "",
			models: [
				{
					id: "gpt-4.1",
					name: "GPT-4.1",
					description: "OpenAI via OpenCode",
				},
				{
					id: "claude-sonnet-4-20250514",
					name: "Claude Sonnet 4",
					description: "Anthropic via OpenCode",
				},
			],
			defaultModel: "gpt-4.1",
			agents: [
				{
					id: "general",
					name: "general",
					description: "Default OpenCode agent",
				},
				{
					id: "plan",
					name: "plan",
					description: "Planning-focused OpenCode agent",
				},
			],
			defaultAgent: "general",
		},
	],
	defaultProvider: "claude-code",
	defaultModel: "claude-sonnet-4-20250514",
	temperature: 0.2,
	maxTokens: 8192,
	systemPrompt: "",
	autoPR: false,
	branchConvention: "feat/<task-slug>",
};
