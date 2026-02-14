"use client";

import {
	AlertCircle,
	CheckCircle2,
	ChevronDown,
	ChevronRight,
	Circle,
	Eye,
	FolderGit2,
	GitBranch,
	Loader2,
	Plus,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Agent, AgentProvider, AgentStatus, Workspace } from "@/lib/store";
import { cn } from "@/lib/utils";

interface AgentSubthread {
	id: string;
	name: string;
	status: AgentStatus;
	lastUpdate: string;
	preview: string;
}

const SUBAGENT_PATTERNS = [
	/background_output\s+([a-zA-Z][a-zA-Z0-9_-]*)/gi,
	/\bsubagente\s+`?([a-zA-Z][a-zA-Z0-9_-]*)`?/gi,
	/\bsubagent\s+`?([a-zA-Z][a-zA-Z0-9_-]*)`?/gi,
	/\bagente\s+`([a-zA-Z][a-zA-Z0-9_-]*)`/gi,
	/\bagent\s+`([a-zA-Z][a-zA-Z0-9_-]*)`/gi,
	/@([a-zA-Z][a-zA-Z0-9_-]*)/g,
];

function normalizeSubagentName(value: string): string | null {
	const clean = value.trim().toLowerCase();
	if (!clean) {
		return null;
	}
	const blocked = new Set([
		"agent",
		"agente",
		"subagent",
		"subagente",
		"workspace",
		"repo",
	]);
	if (blocked.has(clean)) {
		return null;
	}
	return clean;
}

function extractSubagentNames(content: string): string[] {
	const names = new Set<string>();
	for (const pattern of SUBAGENT_PATTERNS) {
		const regex = new RegExp(pattern.source, pattern.flags);
		for (const match of content.matchAll(regex)) {
			const raw = match[1];
			if (!raw) {
				continue;
			}
			const normalized = normalizeSubagentName(raw);
			if (!normalized) {
				continue;
			}
			names.add(normalized);
		}
	}
	return [...names];
}

function inferSubthreadStatus(content: string): AgentStatus {
	const normalized = content.toLowerCase();
	if (
		normalized.includes("(completed)") ||
		normalized.includes("completed") ||
		normalized.includes("done") ||
		normalized.includes("finalizado") ||
		normalized.includes("completado")
	) {
		return "completed";
	}
	if (
		normalized.includes("failed") ||
		normalized.includes("error") ||
		normalized.includes("fallo")
	) {
		return "error";
	}
	if (
		normalized.includes("working") ||
		normalized.includes("running") ||
		normalized.includes("thinking") ||
		normalized.includes("trabajando")
	) {
		return "running";
	}
	return "idle";
}

function extractSubthreads(agent: Agent): AgentSubthread[] {
	const byName = new Map<string, AgentSubthread>();
	for (const message of agent.messages) {
		const names = extractSubagentNames(message.content || "");
		if (names.length === 0) {
			continue;
		}
		const statusFromMessage = inferSubthreadStatus(message.content || "");
		for (const name of names) {
			const existing = byName.get(name);
			if (!existing) {
				byName.set(name, {
					id: `${agent.id}::${name}`,
					name,
					status: statusFromMessage,
					lastUpdate: message.timestamp,
					preview: message.content,
				});
				continue;
			}
			existing.status = statusFromMessage;
			existing.lastUpdate = message.timestamp;
			existing.preview = message.content;
		}
	}
	if (byName.size === 0) {
		return [];
	}

	return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
}

function StatusIcon({ status }: { status: AgentStatus }) {
	switch (status) {
		case "running":
			return (
				<Loader2 className="h-3.5 w-3.5 text-agent-active animate-spin shrink-0" />
			);
		case "completed":
			return (
				<CheckCircle2 className="h-3.5 w-3.5 text-agent-active shrink-0" />
			);
		case "reviewing":
			return <Eye className="h-3.5 w-3.5 text-primary shrink-0" />;
		case "error":
			return <AlertCircle className="h-3.5 w-3.5 text-agent-error shrink-0" />;
		case "idle":
		default:
			return <Circle className="h-3.5 w-3.5 text-agent-idle shrink-0" />;
	}
}

function StatusLabel({ status }: { status: AgentStatus }) {
	const labels: Record<AgentStatus, string> = {
		running: "Running",
		idle: "Idle",
		completed: "Done",
		error: "Error",
		reviewing: "Review",
	};
	const colors: Record<AgentStatus, string> = {
		running: "text-agent-active",
		idle: "text-agent-idle",
		completed: "text-agent-active",
		error: "text-agent-error",
		reviewing: "text-primary",
	};
	return (
		<span
			className={cn(
				"text-[10px] font-medium uppercase tracking-wider",
				colors[status],
			)}
		>
			{labels[status]}
		</span>
	);
}

function SubthreadStatusDot({ status }: { status: AgentStatus }) {
	if (status === "running") {
		return (
			<span className="h-1.5 w-1.5 rounded-full bg-agent-active animate-pulse" />
		);
	}
	if (status === "completed") {
		return <span className="h-1.5 w-1.5 rounded-full bg-agent-active" />;
	}
	if (status === "error") {
		return <span className="h-1.5 w-1.5 rounded-full bg-agent-error" />;
	}
	return <span className="h-1.5 w-1.5 rounded-full bg-agent-idle" />;
}

function SubthreadStatusLabel({ status }: { status: AgentStatus }) {
	const labels: Record<AgentStatus, string> = {
		running: "RUN",
		idle: "IDLE",
		completed: "DONE",
		error: "ERR",
		reviewing: "REVIEW",
	};
	const colors: Record<AgentStatus, string> = {
		running: "text-agent-active",
		idle: "text-agent-idle",
		completed: "text-agent-active",
		error: "text-agent-error",
		reviewing: "text-primary",
	};
	return (
		<span
			className={cn(
				"shrink-0 text-[10px] font-medium uppercase tracking-wider",
				colors[status],
			)}
		>
			{labels[status]}
		</span>
	);
}

const PROVIDER_BADGE: Record<
	AgentProvider,
	{ bg: string; text: string; label: string }
> = {
	"claude-code": {
		bg: "bg-[#d97756]/15",
		text: "text-[#d97756]",
		label: "Claude",
	},
	codex: { bg: "bg-[#10a37f]/15", text: "text-[#10a37f]", label: "Codex" },
	opencode: {
		bg: "bg-[#06b6d4]/15",
		text: "text-[#06b6d4]",
		label: "OpenCode",
	},
};

function ProviderBadge({ provider }: { provider: AgentProvider }) {
	const p = PROVIDER_BADGE[provider];
	return (
		<span
			className={cn(
				"text-[10px] font-mono px-1.5 py-0.5 rounded",
				p.bg,
				p.text,
			)}
		>
			{p.label}
		</span>
	);
}

interface AppSidebarProps {
	workspaces: Workspace[];
	selectedAgentId: string | null;
	onSelectAgent: (agent: Agent) => void;
	onAddWorkspace: () => void;
	onSpawnAgentInWorkspace: (workspace: Workspace) => void;
}

export function AppSidebar({
	workspaces,
	selectedAgentId,
	onSelectAgent,
	onAddWorkspace,
	onSpawnAgentInWorkspace,
}: AppSidebarProps) {
	const [expandedWorkspaces, setExpandedWorkspaces] = useState<Set<string>>(
		new Set(workspaces.map((w) => w.id)),
	);

	const toggleWorkspace = (id: string) => {
		setExpandedWorkspaces((prev) => {
			const next = new Set(prev);
			if (next.has(id)) {
				next.delete(id);
			} else {
				next.add(id);
			}
			return next;
		});
	};

	const totalRunning = workspaces.reduce(
		(acc, w) => acc + w.agents.filter((a) => a.status === "running").length,
		0,
	);

	return (
		<div className="flex h-full flex-col bg-sidebar">
			{/* Header */}
			<div className="flex items-center justify-between px-4 py-3 border-b border-sidebar-border">
				<div className="flex items-center gap-2">
					<h2 className="text-sm font-semibold text-sidebar-accent-foreground">
						Workspaces
					</h2>
					{totalRunning > 0 && (
						<span className="flex items-center gap-1 text-[10px] text-agent-active font-medium">
							<span className="h-1.5 w-1.5 rounded-full bg-agent-active animate-pulse" />
							{totalRunning} active
						</span>
					)}
				</div>
				<Button
					variant="ghost"
					size="icon"
					className="h-6 w-6 text-muted-foreground hover:text-foreground hover:bg-sidebar-accent"
					onClick={onAddWorkspace}
				>
					<Plus className="h-3.5 w-3.5" />
					<span className="sr-only">Add workspace</span>
				</Button>
			</div>

			{/* Workspace list */}
			<ScrollArea className="flex-1">
				<div className="py-1">
					{workspaces.map((workspace) => {
						const isExpanded = expandedWorkspaces.has(workspace.id);
						const running = workspace.agents.filter(
							(a) => a.status === "running",
						).length;
						return (
							<div key={workspace.id}>
								{/* Workspace header */}
								<button
									className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-sidebar-accent transition-colors"
									onClick={() => toggleWorkspace(workspace.id)}
								>
									{isExpanded ? (
										<ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
									) : (
										<ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
									)}
									<FolderGit2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
									<span className="text-[13px] font-medium text-sidebar-foreground truncate">
										{workspace.name}
									</span>
									<span
										className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
										onClick={(event) => {
											event.stopPropagation();
											onSpawnAgentInWorkspace(workspace);
										}}
										onKeyDown={(event) => {
											if (event.key === "Enter" || event.key === " ") {
												event.preventDefault();
												event.stopPropagation();
												onSpawnAgentInWorkspace(workspace);
											}
										}}
										role="button"
										tabIndex={0}
									>
										<Plus className="h-3 w-3" />
										<span className="sr-only">Spawn agent in workspace</span>
									</span>
									<span className="ml-auto text-[10px] text-muted-foreground">
										{workspace.agents.length}
									</span>
									{running > 0 && (
										<span className="h-1.5 w-1.5 rounded-full bg-agent-active animate-pulse shrink-0" />
									)}
								</button>

								{/* Agent list */}
								{isExpanded && (
									<div className="pb-1">
										{workspace.agents.map((agent) => {
											const subthreads = extractSubthreads(agent);
											return (
												<div key={agent.id}>
													<button
														className={cn(
															"flex w-full items-start gap-2.5 px-4 pl-9 py-2 text-left transition-colors group",
															selectedAgentId === agent.id
																? "bg-sidebar-accent"
																: "hover:bg-sidebar-accent/50",
														)}
														onClick={() => onSelectAgent(agent)}
													>
														<StatusIcon status={agent.status} />
														<div className="flex-1 min-w-0">
															<div className="flex items-center gap-2">
																<span
																	className={cn(
																		"text-[13px] truncate block",
																		selectedAgentId === agent.id
																			? "text-sidebar-accent-foreground font-medium"
																			: "text-sidebar-foreground",
																	)}
																>
																	{agent.name}
																</span>
															</div>
															<div className="flex items-center gap-2 mt-0.5">
																<span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
																	Principal
																</span>
																<div className="flex items-center gap-1 text-[11px] text-muted-foreground">
																	<GitBranch className="h-3 w-3" />
																	<span className="truncate max-w-[120px]">
																		{agent.branch}
																	</span>
																</div>
																<ProviderBadge provider={agent.provider} />
															</div>
														</div>
														<StatusLabel status={agent.status} />
													</button>
													{subthreads.length > 0 && (
														<div className="ml-12 mr-2 mb-1 rounded border border-border/60 bg-sidebar-accent/20 px-1.5 py-1">
															<div className="px-1 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
																Subagentes
															</div>
															{subthreads.map((thread) => (
																<button
																	key={thread.id}
																	className="flex w-full min-w-0 items-center gap-2 rounded px-1.5 py-1.5 text-left hover:bg-sidebar-accent/50 transition-colors"
																	onClick={() => onSelectAgent(agent)}
																	title={`${thread.lastUpdate} ${thread.preview ? `• ${thread.preview}` : ""}`}
																	type="button"
																>
																	<SubthreadStatusDot status={thread.status} />
																	<span className="min-w-0 flex-1 truncate text-[11px] font-medium text-sidebar-foreground">
																		@{thread.name}
																	</span>
																	<SubthreadStatusLabel
																		status={thread.status}
																	/>
																</button>
															))}
														</div>
													)}
												</div>
											);
										})}
									</div>
								)}
							</div>
						);
					})}
				</div>
			</ScrollArea>

			{/* Footer */}
			<div className="border-t border-sidebar-border px-4 py-3">
				<div className="flex items-center gap-2">
					<div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center">
						<span className="text-[10px] font-semibold text-primary">JD</span>
					</div>
					<div className="flex-1 min-w-0">
						<p className="text-[12px] font-medium text-sidebar-accent-foreground truncate">
							John Doe
						</p>
						<p className="text-[10px] text-muted-foreground truncate">
							Pro Plan
						</p>
					</div>
				</div>
			</div>
		</div>
	);
}
