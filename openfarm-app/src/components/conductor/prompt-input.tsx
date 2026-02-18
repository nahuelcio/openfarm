"use client";

import {
	ArrowUp,
	AtSign,
	ChevronRight,
	FileCode2,
	File as FileIcon,
	FileImage,
	FileText,
	Hash,
	Paperclip,
	Plus,
	Slash,
	X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	expandWorkspaceSlashCommand,
	listWorkspaceFiles,
	listWorkspaceSlashCommands,
} from "@/lib/backend";
import type {
	AgentMode,
	AgentProvider,
	Attachment,
	ProviderConfig,
	WorkspaceFileEntry,
	WorkspaceSlashCommand,
} from "@/lib/store";
import { cn } from "@/lib/utils";

function fileTypeFromName(name: string): Attachment["type"] {
	const ext = name.split(".").pop()?.toLowerCase() ?? "";
	if (["png", "jpg", "jpeg", "gif", "svg", "webp"].includes(ext))
		return "image";
	if (
		[
			"ts",
			"tsx",
			"js",
			"jsx",
			"py",
			"rs",
			"go",
			"css",
			"html",
			"json",
			"sql",
		].includes(ext)
	)
		return "code";
	if (["md", "txt", "pdf", "doc", "docx"].includes(ext)) return "document";
	return "other";
}

function formatSize(bytes: number): string {
	if (bytes < 1024) return `${bytes}B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function AttachmentTypeIcon({ type }: { type: Attachment["type"] }) {
	switch (type) {
		case "image":
			return <FileImage className="h-3 w-3 text-primary" />;
		case "code":
			return <FileCode2 className="h-3 w-3 text-agent-active" />;
		case "document":
			return <FileText className="h-3 w-3 text-warning" />;
		default:
			return <FileIcon className="h-3 w-3 text-muted-foreground" />;
	}
}

const PROVIDER_LABELS: Record<AgentProvider, { label: string; color: string }> =
	{
		"claude-code": { label: "claude-code", color: "text-[#d97756]" },
		codex: { label: "codex", color: "text-[#10a37f]" },
		opencode: { label: "opencode", color: "text-[#06b6d4]" },
	};

function getOpenCodeGroup(modelId: string, description: string): string {
	if (modelId.startsWith("openrouter/")) return "OpenRouter";
	if (modelId.startsWith("github-copilot/")) return "GitHub Copilot";
	if (modelId.startsWith("zai-coding-plan/")) return "ZAI Coding Plan";
	if (modelId.startsWith("zai/")) return "ZAI";
	if (modelId.startsWith("opencode/")) return "OpenCode";
	if (description.includes("OpenRouter")) return "OpenRouter";
	if (description.includes("GitHub Copilot")) return "GitHub Copilot";
	if (description.includes("ZAI")) return "ZAI";
	return "OpenCode";
}

type MentionTrigger = "@" | "#" | "/";
type MentionKind = "agent" | "subagent" | "file" | "slash";

interface MentionSuggestion {
	id: string;
	label: string;
	insertText: string;
	section: string;
	kind: MentionKind;
	description?: string;
}

interface MentionToken {
	trigger: MentionTrigger;
	query: string;
	start: number;
	end: number;
}

function detectMentionToken(
	value: string,
	cursor: number,
): MentionToken | null {
	const beforeCursor = value.slice(0, cursor);
	const matched = /(^|\s)([@#/])([^\s]*)$/.exec(beforeCursor);
	if (!matched) {
		return null;
	}
	const trigger = matched[2] as MentionTrigger;
	const query = matched[3] || "";
	const start = beforeCursor.length - (query.length + 1);
	const end = beforeCursor.length;
	return { trigger, query, start, end };
}

interface PromptInputProps {
	onSend: (payload: {
		message: string;
		attachments?: Attachment[];
		provider?: AgentProvider;
		model?: string;
		agentMode?: AgentMode;
	}) => void;
	onDeployAsNew?: (payload: {
		message: string;
		attachments?: Attachment[];
		provider?: AgentProvider;
		model?: string;
		agentMode?: AgentMode;
	}) => void;
	disabled?: boolean;
	placeholder?: string;
	provider?: AgentProvider;
	model?: string;
	mode?: AgentMode;
	providers?: ProviderConfig[];
	agentId?: string;
	workspaceId?: string;
	workspaceAgents?: Array<{ id: string; name: string }>;
}

export function PromptInput({
	onSend,
	onDeployAsNew,
	disabled,
	placeholder = "Ask the agent anything...",
	provider = "claude-code",
	model,
	mode = "general",
	providers = [],
	agentId,
	workspaceId,
	workspaceAgents = [],
}: PromptInputProps) {
	const [value, setValue] = useState("");
	const [attachments, setAttachments] = useState<Attachment[]>([]);
	const connectedProviders = providers.filter(
		(candidate) => candidate.connected,
	);
	const availableProviders =
		connectedProviders.length > 0 ? connectedProviders : providers;
	const fallbackProvider =
		availableProviders.find((candidate) => candidate.id === provider)?.id ||
		availableProviders[0]?.id ||
		provider;
	const [selectedProvider, setSelectedProvider] =
		useState<AgentProvider>(fallbackProvider);
	const [selectedOpenCodeGroup, setSelectedOpenCodeGroup] = useState("all");
	const selectedProviderConfig =
		availableProviders.find((candidate) => candidate.id === selectedProvider) ||
		availableProviders[0];
	const currentModels = selectedProviderConfig?.models || [];
	const availableAgents = selectedProviderConfig?.agents || [];
	const openCodeGroups = useMemo(() => {
		if (selectedProvider !== "opencode") {
			return [];
		}
		const values = currentModels.map((candidate) =>
			getOpenCodeGroup(candidate.id, candidate.description),
		);
		return [...new Set(values)];
	}, [currentModels, selectedProvider]);
	const availableModels = useMemo(() => {
		if (selectedProvider !== "opencode" || selectedOpenCodeGroup === "all") {
			return currentModels;
		}
		return currentModels.filter(
			(candidate) =>
				getOpenCodeGroup(candidate.id, candidate.description) ===
				selectedOpenCodeGroup,
		);
	}, [currentModels, selectedOpenCodeGroup, selectedProvider]);
	const [selectedModel, setSelectedModel] = useState(
		model || selectedProviderConfig?.defaultModel || "",
	);
	const [selectedMode, setSelectedMode] = useState<AgentMode>(
		mode ||
			selectedProviderConfig?.defaultAgent ||
			availableAgents[0]?.id ||
			"",
	);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const textareaRef = useRef<HTMLTextAreaElement>(null);
	const [workspaceFiles, setWorkspaceFiles] = useState<WorkspaceFileEntry[]>(
		[],
	);
	const [slashCommands, setSlashCommands] = useState<WorkspaceSlashCommand[]>(
		[],
	);
	const [activeToken, setActiveToken] = useState<MentionToken | null>(null);
	const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);

	useEffect(() => {
		const canUseProvider = availableProviders.some(
			(candidate) => candidate.id === provider,
		);
		if (canUseProvider) {
			setSelectedProvider(provider);
		}
	}, [provider]);

	useEffect(() => {
		const nextModel =
			model ||
			availableProviders.find((candidate) => candidate.id === provider)
				?.defaultModel ||
			availableProviders[0]?.defaultModel ||
			"";
		setSelectedModel(nextModel);
	}, [model, provider]);

	useEffect(() => {
		const nextAgent =
			mode ||
			availableProviders.find((candidate) => candidate.id === provider)
				?.defaultAgent ||
			availableProviders.find((candidate) => candidate.id === provider)
				?.agents?.[0]?.id ||
			"";
		setSelectedMode(nextAgent);
	}, [mode, provider]);

	useEffect(() => {
		if (!workspaceId) {
			setWorkspaceFiles([]);
			setSlashCommands([]);
			return;
		}
		let active = true;
		void (async () => {
			const [files, commands] = await Promise.all([
				listWorkspaceFiles(workspaceId).catch(() => []),
				listWorkspaceSlashCommands(workspaceId).catch(() => []),
			]);
			if (!active) {
				return;
			}
			setWorkspaceFiles(files);
			setSlashCommands(commands);
		})();
		return () => {
			active = false;
		};
	}, [workspaceId]);

	useEffect(() => {
		if (selectedProvider !== "opencode") {
			setSelectedOpenCodeGroup("all");
			return;
		}
		if (
			selectedOpenCodeGroup !== "all" &&
			!openCodeGroups.includes(selectedOpenCodeGroup)
		) {
			setSelectedOpenCodeGroup("all");
		}
	}, [openCodeGroups, selectedOpenCodeGroup, selectedProvider]);

	useEffect(() => {
		if (availableModels.some((candidate) => candidate.id === selectedModel)) {
			return;
		}
		setSelectedModel(availableModels[0]?.id || "");
	}, [availableModels, selectedModel]);

	useEffect(() => {
		if (!availableAgents || availableAgents.length === 0) {
			setSelectedMode("");
			return;
		}
		if (availableAgents.some((candidate) => candidate.id === selectedMode)) {
			return;
		}
		setSelectedMode(
			selectedProviderConfig?.defaultAgent || availableAgents[0]?.id || "",
		);
	}, [availableAgents, selectedMode, selectedProviderConfig?.defaultAgent]);

	const refreshMentionToken = useCallback(
		(nextValue: string, cursor: number) => {
			const token = detectMentionToken(nextValue, cursor);
			setActiveToken(token);
			setActiveSuggestionIndex(0);
		},
		[],
	);

	const mentionSuggestions = useMemo(() => {
		if (!activeToken) {
			return [] as MentionSuggestion[];
		}
		const query = activeToken.query.toLowerCase();
		if (activeToken.trigger === "@") {
			const agentSuggestions = workspaceAgents
				.filter((candidate) => candidate.id !== agentId)
				.map((candidate) => ({
					id: `agent:${candidate.id}`,
					label: candidate.name,
					insertText: `@${candidate.name} `,
					section: "Agentes",
					kind: "agent" as const,
					description: "Agente del workspace",
				}))
				.filter((candidate) => candidate.label.toLowerCase().includes(query));
			const subagentSuggestions = availableAgents
				.map((candidate) => ({
					id: `subagent:${candidate.id}`,
					label: candidate.name,
					insertText: `@${candidate.name} `,
					section: "Subagentes",
					kind: "subagent" as const,
					description: candidate.description || "Subagente configurado",
				}))
				.filter((candidate) => candidate.label.toLowerCase().includes(query));
			return [...agentSuggestions, ...subagentSuggestions].slice(0, 25);
		}
		if (activeToken.trigger === "#") {
			return workspaceFiles
				.filter((candidate) => candidate.path.toLowerCase().includes(query))
				.slice(0, 40)
				.map((candidate) => ({
					id: `file:${candidate.path}`,
					label: candidate.path,
					insertText: `#${candidate.path} `,
					section: "Archivos",
					kind: "file" as const,
					description: candidate.isDir ? "Directorio" : "Archivo",
				}));
		}
		return slashCommands
			.filter((candidate) => candidate.name.toLowerCase().includes(query))
			.slice(0, 40)
			.map((candidate) => ({
				id: `slash:${candidate.name}`,
				label: `/${candidate.name}`,
				insertText: `/${candidate.name} `,
				section: "Slash Commands",
				kind: "slash" as const,
				description: candidate.path,
			}));
	}, [
		activeToken,
		agentId,
		availableAgents,
		slashCommands,
		workspaceAgents,
		workspaceFiles,
	]);

	const groupedMentionSuggestions = useMemo(() => {
		const grouped = new Map<string, MentionSuggestion[]>();
		for (const suggestion of mentionSuggestions) {
			const existing = grouped.get(suggestion.section) || [];
			existing.push(suggestion);
			grouped.set(suggestion.section, existing);
		}
		return Array.from(grouped.entries()).map(([section, items]) => ({
			section,
			items,
		}));
	}, [mentionSuggestions]);

	const applyMentionSuggestion = useCallback(
		(suggestion: MentionSuggestion) => {
			const token = activeToken;
			if (!token) {
				return;
			}
			const nextValue = `${value.slice(0, token.start)}${suggestion.insertText}${value.slice(token.end)}`;
			setValue(nextValue);
			setActiveToken(null);
			setActiveSuggestionIndex(0);
			requestAnimationFrame(() => {
				const textarea = textareaRef.current;
				if (!textarea) {
					return;
				}
				const nextCursor = token.start + suggestion.insertText.length;
				textarea.focus();
				textarea.setSelectionRange(nextCursor, nextCursor);
			});
		},
		[activeToken, value],
	);

	const buildOutgoingPayload = async () => {
		if (!(value.trim() || attachments.length > 0) || disabled) {
			return null;
		}
		let message = value.trim();
		if (workspaceId && message.startsWith("/")) {
			message = await expandWorkspaceSlashCommand(workspaceId, message).catch(
				() => message,
			);
		}
		return {
			message,
			attachments: attachments.length > 0 ? attachments : undefined,
			provider: selectedProvider,
			model: selectedModel || undefined,
			agentMode: selectedMode || undefined,
		};
	};

	const clearComposer = () => {
		setValue("");
		setAttachments([]);
		setActiveToken(null);
	};

	const handleSubmit = async () => {
		const payload = await buildOutgoingPayload();
		if (!payload) {
			return;
		}
		onSend(payload);
		clearComposer();
	};

	const handleDeployAsNew = async () => {
		if (!onDeployAsNew) {
			return;
		}
		const payload = await buildOutgoingPayload();
		if (!payload) {
			return;
		}
		onDeployAsNew(payload);
		clearComposer();
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (activeToken && mentionSuggestions.length > 0) {
			if (e.key === "ArrowDown") {
				e.preventDefault();
				setActiveSuggestionIndex((current) =>
					Math.min(current + 1, mentionSuggestions.length - 1),
				);
				return;
			}
			if (e.key === "ArrowUp") {
				e.preventDefault();
				setActiveSuggestionIndex((current) => Math.max(current - 1, 0));
				return;
			}
			if (e.key === "Enter" || e.key === "Tab") {
				e.preventDefault();
				const selected = mentionSuggestions[activeSuggestionIndex];
				if (selected) {
					applyMentionSuggestion(selected);
				}
				return;
			}
			if (e.key === "Escape") {
				e.preventDefault();
				setActiveToken(null);
				return;
			}
		}
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			void handleSubmit();
		}
	};

	const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
		const files = e.target.files;
		if (!files) return;
		const newAttachments: Attachment[] = Array.from(files).map((file) => ({
			id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
			name: file.name,
			type: fileTypeFromName(file.name),
			size: formatSize(file.size),
		}));
		setAttachments((prev) => [...prev, ...newAttachments]);
		// Reset file input
		if (fileInputRef.current) fileInputRef.current.value = "";
	};

	const removeAttachment = (id: string) => {
		setAttachments((prev) => prev.filter((a) => a.id !== id));
	};

	const insertTriggerCharacter = (trigger: MentionTrigger) => {
		const textarea = textareaRef.current;
		if (!textarea) {
			setValue((current) => `${current}${trigger}`);
			return;
		}
		const start = textarea.selectionStart ?? value.length;
		const end = textarea.selectionEnd ?? value.length;
		const nextValue = `${value.slice(0, start)}${trigger}${value.slice(end)}`;
		setValue(nextValue);
		requestAnimationFrame(() => {
			const nextCursor = start + 1;
			textarea.focus();
			textarea.setSelectionRange(nextCursor, nextCursor);
			refreshMentionToken(nextValue, nextCursor);
		});
	};

	const providerInfo =
		PROVIDER_LABELS[selectedProvider] || PROVIDER_LABELS["claude-code"];

	return (
		<div className="border-t border-border bg-card px-4 py-3">
			{/* Hidden file input */}
			<input
				ref={fileInputRef}
				type="file"
				multiple
				className="hidden"
				onChange={handleFileSelect}
			/>

			{/* Attachment chips */}
			{attachments.length > 0 && (
				<div className="flex flex-wrap gap-1.5 mb-2 px-1">
					{attachments.map((att) => (
						<div
							key={att.id}
							className="flex items-center gap-1.5 pl-2 pr-1 py-1 rounded-lg bg-secondary border border-border text-xs group"
						>
							<AttachmentTypeIcon type={att.type} />
							<span className="text-foreground font-medium truncate max-w-[120px]">
								{att.name}
							</span>
							<span className="text-muted-foreground">{att.size}</span>
							<button
								className="h-4 w-4 rounded flex items-center justify-center hover:bg-accent transition-colors ml-0.5"
								onClick={() => removeAttachment(att.id)}
								type="button"
							>
								<X className="h-2.5 w-2.5 text-muted-foreground" />
								<span className="sr-only">Remove attachment</span>
							</button>
						</div>
					))}
				</div>
			)}

			<div
				className={cn(
					"relative flex flex-col gap-2 rounded-xl border border-border bg-background px-3 py-2 transition-colors",
					"focus-within:border-primary/40 focus-within:ring-1 focus-within:ring-primary/20",
				)}
			>
				{activeToken && mentionSuggestions.length > 0 && (
					<div className="absolute bottom-full left-2 right-2 z-20 mb-2 max-h-56 overflow-y-auto rounded-lg border border-border bg-popover shadow-lg">
						{groupedMentionSuggestions.map((group) => (
							<div
								key={group.section}
								className="border-b border-border/50 last:border-b-0"
							>
								<div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
									{group.section}
								</div>
								<div className="pb-1">
									{group.items.map((suggestion) => {
										const index = mentionSuggestions.findIndex(
											(candidate) => candidate.id === suggestion.id,
										);
										const active = index === activeSuggestionIndex;
										return (
											<button
												key={suggestion.id}
												type="button"
												onClick={() => applyMentionSuggestion(suggestion)}
												className={cn(
													"flex w-full items-center justify-between gap-2 px-2 py-1.5 text-left text-xs transition-colors",
													active
														? "bg-accent text-foreground"
														: "text-foreground/90 hover:bg-accent/60",
												)}
											>
												<span className="min-w-0 truncate">
													{suggestion.label}
												</span>
												<span className="inline-flex shrink-0 items-center gap-1 text-[10px] text-muted-foreground">
													{suggestion.kind}
													<ChevronRight className="h-3 w-3" />
												</span>
											</button>
										);
									})}
								</div>
							</div>
						))}
					</div>
				)}

				<div className="flex items-end gap-2">
					{/* Action buttons */}
					<div className="flex items-center gap-0.5 pb-0.5">
						<Button
							variant="ghost"
							size="icon"
							className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-accent"
							onClick={() => fileInputRef.current?.click()}
							type="button"
						>
							<Paperclip className="h-4 w-4" />
							<span className="sr-only">Attach file</span>
						</Button>
						<Button
							variant="ghost"
							size="icon"
							className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-accent"
							onClick={() => insertTriggerCharacter("@")}
							type="button"
						>
							<AtSign className="h-4 w-4" />
							<span className="sr-only">Mention</span>
						</Button>
						<Button
							variant="ghost"
							size="icon"
							className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-accent"
							onClick={() => insertTriggerCharacter("#")}
							type="button"
						>
							<Hash className="h-4 w-4" />
							<span className="sr-only">Files</span>
						</Button>
						<Button
							variant="ghost"
							size="icon"
							className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-accent"
							onClick={() => insertTriggerCharacter("/")}
							type="button"
						>
							<Slash className="h-4 w-4" />
							<span className="sr-only">Commands</span>
						</Button>
					</div>

					{/* Text area */}
					<textarea
						ref={textareaRef}
						value={value}
						onChange={(e) => {
							const nextValue = e.target.value;
							setValue(nextValue);
							refreshMentionToken(
								nextValue,
								e.target.selectionStart ?? nextValue.length,
							);
						}}
						onKeyDown={handleKeyDown}
						onClick={(e) => {
							const target = e.target as HTMLTextAreaElement;
							refreshMentionToken(
								target.value,
								target.selectionStart ?? target.value.length,
							);
						}}
						placeholder={placeholder}
						disabled={disabled}
						rows={1}
						className={cn(
							"flex-1 resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground",
							"focus:outline-none min-h-[32px] max-h-[120px] py-1.5 leading-relaxed",
						)}
						style={{
							height: "auto",
							overflow: "hidden",
						}}
						onInput={(e) => {
							const target = e.target as HTMLTextAreaElement;
							target.style.height = "auto";
							target.style.height = Math.min(target.scrollHeight, 120) + "px";
						}}
					/>

					{/* Send button */}
					<div className="mb-0.5 flex items-center gap-1">
						<Button
							size="icon"
							variant="ghost"
							className={cn(
								"h-7 w-7 rounded-lg transition-all",
								onDeployAsNew
									? "text-muted-foreground hover:bg-accent hover:text-foreground"
									: "hidden",
							)}
							disabled={(!value.trim() && attachments.length === 0) || disabled}
							onClick={() => void handleDeployAsNew()}
							type="button"
						>
							<Plus className="h-4 w-4" />
							<span className="sr-only">Deploy as new agent</span>
						</Button>
						<Button
							size="icon"
							className={cn(
								"h-7 w-7 rounded-lg shrink-0 transition-all",
								value.trim() || attachments.length > 0
									? "bg-primary text-primary-foreground hover:bg-primary/90"
									: "bg-secondary text-muted-foreground cursor-not-allowed",
							)}
							disabled={(!value.trim() && attachments.length === 0) || disabled}
							onClick={() => void handleSubmit()}
							type="button"
						>
							<ArrowUp className="h-4 w-4" />
							<span className="sr-only">Send message</span>
						</Button>
					</div>
				</div>

				<div className="flex flex-wrap items-center gap-2 border-t border-border/50 pt-2">
					<select
						value={selectedProvider}
						onChange={(event) => {
							const nextProvider = event.target.value as AgentProvider;
							setSelectedProvider(nextProvider);
							const nextConfig = availableProviders.find(
								(candidate) => candidate.id === nextProvider,
							);
							setSelectedModel(nextConfig?.defaultModel || "");
							setSelectedMode(
								nextConfig?.defaultAgent || nextConfig?.agents?.[0]?.id || "",
							);
						}}
						className="h-8 min-w-[120px] rounded-xl border border-border bg-secondary px-3 text-xs font-medium text-foreground focus:border-primary/40 focus:outline-none"
					>
						{availableProviders.map((candidate) => (
						<option key={candidate.id} value={candidate.id}>
							{candidate.name}
						</option>
					))}
					</select>

					{availableAgents.length > 0 && (
						<select
							value={selectedMode}
							onChange={(event) =>
								setSelectedMode(event.target.value as AgentMode)
							}
							className="h-8 min-w-[110px] rounded-xl border border-border bg-secondary px-3 text-xs font-medium text-foreground focus:border-primary/40 focus:outline-none"
						>
							{availableAgents.map((candidate) => (
								<option key={candidate.id} value={candidate.id}>
									{candidate.name}
								</option>
							))}
						</select>
					)}

					{selectedProvider === "opencode" && openCodeGroups.length > 0 && (
						<select
							value={selectedOpenCodeGroup}
							onChange={(event) => setSelectedOpenCodeGroup(event.target.value)}
							className="h-8 min-w-[130px] rounded-xl border border-border bg-secondary px-3 text-xs font-medium text-foreground focus:border-primary/40 focus:outline-none"
						>
							<option value="all">all providers</option>
							{openCodeGroups.map((group) => (
								<option key={group} value={group}>
									{group}
								</option>
							))}
						</select>
					)}

					<select
						value={selectedModel}
						onChange={(event) => setSelectedModel(event.target.value)}
						className="h-8 min-w-[170px] flex-1 rounded-xl border border-border bg-secondary px-3 text-xs font-medium text-foreground focus:border-primary/40 focus:outline-none"
					>
						{availableModels.map((candidate) => (
							<option key={candidate.id} value={candidate.id}>
								{candidate.name}
							</option>
						))}
					</select>
				</div>
			</div>

			{/* Hint */}
			<div className="flex items-center justify-between mt-2 px-1">
				<div className="flex items-center gap-3 text-[10px] text-muted-foreground">
					<span className="flex items-center gap-1">
						<kbd className="px-1 py-0.5 rounded bg-secondary text-[9px] font-mono border border-border">
							Enter
						</kbd>
						to send
					</span>
					<span className="flex items-center gap-1">
						<kbd className="px-1 py-0.5 rounded bg-secondary text-[9px] font-mono border border-border">
							Shift+Enter
						</kbd>
						for new line
					</span>
				</div>
				<span className={cn("text-[10px] font-mono", providerInfo.color)}>
					{PROVIDER_LABELS[selectedProvider]?.label || providerInfo.label}
					{selectedModel && (
						<span className="text-muted-foreground ml-1">
							/ {selectedModel}
						</span>
					)}
					{selectedMode && (
						<span className="text-muted-foreground ml-1">/ {selectedMode}</span>
					)}
				</span>
			</div>
		</div>
	);
}
