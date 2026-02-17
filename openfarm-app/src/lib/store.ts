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

export interface ResponseStatistics {
	creditsSpent: number;
	toolCalls: number;
	model: string;
	filesChanged: number;
	processesCreated: number;
	requestId: string;
	tokensInput: number;
	tokensOutput: number;
	duration: number;
}

export interface ExecutionStatistics {
	creditsSpent: number;
	toolCalls: number;
	model: string;
	filesChanged: number;
	processesCreated: number;
	requestId: string;
	tokensInput: number;
	tokensOutput: number;
	duration: number;
}

export interface EventExecutionStatistics {
	// Legacy snake_case fields (for backward compatibility)
	credits_spent?: number;
	tool_calls?: number;
	model?: string;
	files_changed?: number;
	processes_created?: number;
	request_id?: string;
	tokens_input?: number;
	tokens_output?: number;
	duration?: number;
	// New camelCase fields (matching protocol)
	creditsSpent?: number;
	toolCalls?: number;
	filesChanged?: number;
	processesCreated?: number;
	requestId?: string;
	tokensInput?: number;
	tokensOutput?: number;
}

export interface AgentMessage {
	id: string;
	role: "user" | "agent" | "system";
	content: string;
	timestamp: string;
	files?: string[];
	thinking?: boolean;
	attachments?: Attachment[];
	statistics?: ResponseStatistics;
}

export interface AgentExecutionEvent {
	eventType: string;
	agentId: string;
	data: Record<string, unknown>;
}

export interface QueuedInstruction {
	id: string;
	message: string;
	createdAt: string;
	attachments?: Attachment[];
	provider?: AgentProvider;
	model?: string;
	agentMode?: AgentMode;
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

// Advanced provider configuration types
export interface McpServerConfig {
	id: string;
	name: string;
	command: string;
	args?: string[];
	env?: Record<string, string>;
	enabled: boolean;
	provider: AgentProvider;
	installedAt: string;
}

export interface AgentConfig {
	id: string;
	name: string;
	description: string;
	prompt?: string;
	mode?: string;
	enabled: boolean;
	customSettings?: Record<string, unknown>;
}

export interface HookConfig {
	id: string;
	name: string;
	type: "before" | "after" | "error";
	script: string;
	enabled: boolean;
	triggerEvents: string[];
	customSettings?: Record<string, unknown>;
}

export interface SubAgentConfig {
	id: string;
	name: string;
	description: string;
	parentAgent: string;
	capability: string;
	enabled: boolean;
	model?: string;
	customSettings?: Record<string, unknown>;
}

export interface EndpointConfig {
	id: string;
	name: string;
	url: string;
	method: "GET" | "POST" | "PUT" | "DELETE";
	headers?: Record<string, string>;
	enabled: boolean;
	rateLimit?: number;
}

export interface WorkspaceFileEntry {
	path: string;
	isDir: boolean;
}

export interface WorkspaceSlashCommand {
	name: string;
	path: string;
	content: string;
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

	// Advanced configuration
	mcpServers?: McpServerConfig[];
	customAgents?: AgentConfig[];
	hooks?: HookConfig[];
	subAgents?: SubAgentConfig[];
	endpoints?: EndpointConfig[];
	customSettings?: Record<string, unknown>;
}

export interface AzureDevOpsConfig {
	orgUrl: string;
	pat: string;
	project: string;
	repoId: string;
	connected: boolean;
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
	azureDevOps?: AzureDevOpsConfig;
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
					id: "gpt-5-codex",
					name: "GPT-5 Codex",
					description: "Codex-optimized flagship model",
				},
				{
					id: "gpt-5-codex-mini",
					name: "GPT-5 Codex Mini",
					description: "Faster and cheaper Codex model",
				},
			],
			defaultModel: "gpt-5-codex-mini",
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
					id: "openrouter/openai/gpt-4.1",
					name: "openrouter/openai/gpt-4.1",
					description: "OpenRouter via OpenCode",
				},
				{
					id: "openrouter/openai/gpt-5",
					name: "openrouter/openai/gpt-5",
					description: "OpenRouter via OpenCode",
				},
				{
					id: "openrouter/anthropic/claude-sonnet-4.5",
					name: "openrouter/anthropic/claude-sonnet-4.5",
					description: "OpenRouter via OpenCode",
				},
				{
					id: "github-copilot/gpt-5.2-codex",
					name: "github-copilot/gpt-5.2-codex",
					description: "GitHub Copilot via OpenCode",
				},
				{
					id: "zai/glm-4.7",
					name: "zai/glm-4.7",
					description: "ZAI via OpenCode",
				},
			],
			defaultModel: "openrouter/openai/gpt-4.1",
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
	azureDevOps: {
		orgUrl: "",
		pat: "",
		project: "",
		repoId: "",
		connected: false,
	},
};
