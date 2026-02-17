"use client";

import { memo, useEffect, useMemo, useState } from "react";

import {
	AlertCircle,
	Archive,
	BookOpen,
	CheckCircle2,
	ChevronDown,
	ChevronRight,
	Circle,
	Eye,
	FileText,
	FolderGit2,
	GitBranch,
	Loader2,
	MoreHorizontal,
	Plus,
	Settings,
	Trash2,
	User,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";

import { getCurrentUser } from "@/lib/backend";
import type {
	Agent,
	AgentProvider,
	AgentStatus,
	AppSettings,
	Workspace,
} from "@/lib/store";
import { extractSubthreads } from "@/lib/subthreads";
import { cn } from "@/lib/utils";

import { MemoryDialog } from "../memory/memory-dialog";
import { UserSettingsDialog } from "./user-settings-dialog";

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
				"text-[10px] font-medium uppercase tracking-wider shrink-0",
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
				"text-[10px] font-mono px-1.5 py-0.5 rounded shrink-0",
				p.bg,
				p.text,
			)}
		>
			{p.label}
		</span>
	);
}

interface AgentItemProps {
	agent: Agent;
	selectedAgentId: string | null;
	selectedSubthread: { agentId: string; name: string } | null;
	onSelectAgent: (agent: Agent) => void;
	onSelectSubthread: (agent: Agent, subthreadName: string) => void;
	onArchiveAgent?: (agent: Agent) => void;
	isSelectingAgent: boolean;
}

const AgentItem = memo(function AgentItem({
	agent,
	selectedAgentId,
	selectedSubthread,
	onSelectAgent,
	onSelectSubthread,
	onArchiveAgent,
	isSelectingAgent,
}: AgentItemProps) {
	const subthreads = useMemo(() => extractSubthreads(agent), [agent]);
	const isParentSelected = selectedAgentId === agent.id;

	return (
		<div>
			<div
				role="button"
				tabIndex={isSelectingAgent ? -1 : 0}
				aria-disabled={isSelectingAgent}
				className={cn(
					"flex w-full items-start gap-2.5 px-4 pl-9 py-2 text-left transition-colors group",
					isParentSelected
						? "bg-sidebar-accent"
						: "hover:bg-sidebar-accent/50",
					isSelectingAgent &&
						"opacity-50 cursor-not-allowed",
				)}
				onClick={() =>
					!isSelectingAgent && onSelectAgent(agent)
				}
				onKeyDown={(event) => {
					if (event.key === "Enter" || event.key === " ") {
						event.preventDefault();
						if (!isSelectingAgent) {
							onSelectAgent(agent);
						}
					}
				}}
			>
				<StatusIcon status={agent.status} />
				<div className="flex-1 min-w-0">
					<div className="flex items-center gap-2">
						<span
							className={cn(
								"text-[13px] truncate block",
								isParentSelected
									? "text-sidebar-accent-foreground font-medium"
									: "text-sidebar-foreground",
							)}
						>
							{agent.name}
						</span>
					</div>
					<div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
						<span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground shrink-0">
							Principal
						</span>
						<div className="flex items-center gap-1 text-[11px] text-muted-foreground min-w-0">
							<GitBranch className="h-3 w-3 shrink-0" />
							<span className="truncate max-w-[60px] sm:max-w-[80px] md:max-w-[100px]">
								{agent.branch}
							</span>
						</div>
						<ProviderBadge provider={agent.provider} />
					</div>
				</div>
				<StatusLabel status={agent.status} />
				{onArchiveAgent && (
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button
								variant="ghost"
								size="icon"
								className="h-6 w-6 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-opacity"
								onClick={(e) => e.stopPropagation()}
							>
								<MoreHorizontal className="h-3.5 w-3.5" />
								<span className="sr-only">
									Agent options
								</span>
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuItem
								onClick={(e) => {
									e.stopPropagation();
									onArchiveAgent(agent);
								}}
							>
								<Archive className="h-3.5 w-3.5 mr-2" />
								Archive chat
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				)}
			</div>
			{subthreads.length > 0 && (
				<div className="ml-12 mr-2 mb-1 rounded border border-border/60 bg-sidebar-accent/20 px-1.5 py-1">
					<div className="px-1 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
						Subagentes
					</div>
					{subthreads.map((thread) => {
						const isSubthreadSelected =
							selectedSubthread?.agentId === agent.id &&
							selectedSubthread.name === thread.name;
						return (
							<button
								key={thread.id}
								className={cn(
									"flex w-full min-w-0 items-center gap-2 rounded px-1.5 py-1.5 text-left transition-colors",
										isSubthreadSelected
										? "bg-sidebar-accent text-sidebar-accent-foreground"
										: "hover:bg-sidebar-accent/50",
										isSelectingAgent &&
											"opacity-50 cursor-not-allowed",
									)}
									onClick={() =>
										!isSelectingAgent &&
										onSelectSubthread(agent, thread.name)
									}
									disabled={isSelectingAgent}
									title={`${thread.lastUpdate} ${thread.preview ? `\u2022 ${thread.preview}` : ""}`}
									type="button"
								>
									<SubthreadStatusDot
										status={thread.status}
									/>
									<span
										className={cn(
											"min-w-0 flex-1 truncate text-[11px] font-medium",
											isSubthreadSelected
												? "text-sidebar-accent-foreground"
												: "text-sidebar-foreground",
										)}
									>
										@{thread.name}
									</span>
									<SubthreadStatusLabel
										status={thread.status}
									/>
								</button>
							);
						})}
					</div>
				)}
			</div>
		);
	});

interface AppSidebarProps {
	workspaces: Workspace[];
	selectedAgentId: string | null;
	selectedSubthread: { agentId: string; name: string } | null;
	onSelectAgent: (agent: Agent) => void;
	onSelectSubthread: (agent: Agent, subthreadName: string) => void;
	onAddWorkspace: () => void;
	onSpawnAgentInWorkspace: (workspace: Workspace) => void;
	onOpenPlanReview?: () => void;
	onArchiveAgent?: (agent: Agent) => void;
	onDeleteWorkspace?: (workspace: Workspace) => void;
	isSelectingAgent?: boolean;
	settings: AppSettings;
	onSettingsChange: (settings: AppSettings) => void;
}

export function AppSidebar({
	workspaces,
	selectedAgentId,
	selectedSubthread,
	onSelectAgent,
	onSelectSubthread,
	onAddWorkspace,
	onSpawnAgentInWorkspace,
	onOpenPlanReview,
	onArchiveAgent,
	onDeleteWorkspace,
	isSelectingAgent = false,
	settings,
	onSettingsChange,
}: AppSidebarProps) {
	const [expandedWorkspaces, setExpandedWorkspaces] = useState<Set<string>>(
		new Set(workspaces.map((w) => w.id)),
	);
	const [currentUser, setCurrentUser] = useState<string>("Unknown User");
	const [userSettingsOpen, setUserSettingsOpen] = useState(false);

	const formatUsername = (username: string) => {
		return username
			.toLowerCase()
			.split(" ")
			.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
			.join(" ");
	};

	const getInitials = (username: string) => {
		return username
			.toLowerCase()
			.split(" ")
			.map((word) => word.charAt(0).toUpperCase())
			.slice(0, 2)
			.join("");
	};

	useEffect(() => {
		void getCurrentUser().then(setCurrentUser);
	}, []);

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
				<div className="flex items-center gap-1">
					{onOpenPlanReview && (
						<Button
							variant="ghost"
							size="icon"
							className="h-6 w-6 text-muted-foreground hover:text-foreground hover:bg-sidebar-accent"
							onClick={onOpenPlanReview}
							title="Plan Review"
						>
							<FileText className="h-3.5 w-3.5" />
							<span className="sr-only">Plan Review</span>
						</Button>
					)}
					<MemoryDialog>
						<Button
							variant="ghost"
							size="icon"
							className="h-6 w-6 text-muted-foreground hover:text-foreground hover:bg-sidebar-accent"
							title="Memory System"
						>
							<BookOpen className="h-3.5 w-3.5" />
							<span className="sr-only">Memory System</span>
						</Button>
					</MemoryDialog>
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
								<div className="flex items-center gap-2 px-3 py-2 hover:bg-sidebar-accent transition-colors">
									<button
										className="flex items-center gap-2 text-left hover:bg-sidebar-accent transition-colors flex-1"
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
									</button>
									<button
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
										title="Spawn agent in workspace"
									>
										<Plus className="h-3 w-3" />
									</button>
									<span className="ml-auto text-[10px] text-muted-foreground">
										{workspace.agents.length}
									</span>
									{running > 0 && (
										<span className="h-1.5 w-1.5 rounded-full bg-agent-active animate-pulse shrink-0" />
									)}
									{onDeleteWorkspace && (
										<button
											className={cn(
												"inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-sidebar-accent transition-colors ml-1",
												workspace.agents.length === 0
													? "hover:text-destructive cursor-pointer"
													: "cursor-not-allowed opacity-50",
											)}
											onClick={(event) => {
												event.stopPropagation();
												if (workspace.agents.length === 0) {
													onDeleteWorkspace(workspace);
												} else {
													console.log("Cannot delete workspace - has agents");
												}
											}}
											onKeyDown={(event) => {
												if (event.key === "Enter" || event.key === " ") {
													event.preventDefault();
													event.stopPropagation();
													if (workspace.agents.length === 0) {
														onDeleteWorkspace(workspace);
													}
												}
											}}
											disabled={workspace.agents.length > 0}
											title={
												workspace.agents.length === 0
													? "Delete workspace"
													: "Delete workspace"
											}
										>
											<Trash2 className="h-3 w-3" />
											<span className="sr-only">Delete workspace</span>
										</button>
									)}
								</div>
							{/* Agent list */}
							{isExpanded && (
								<div className="pb-1">
									{workspace.agents.map((agent) => (
									<AgentItem
										key={agent.id}
										agent={agent}
										selectedAgentId={selectedAgentId}
										selectedSubthread={selectedSubthread}
										onSelectAgent={onSelectAgent}
										onSelectSubthread={onSelectSubthread}
										onArchiveAgent={onArchiveAgent}
										isSelectingAgent={isSelectingAgent}
									/>
								))}
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
						<span className="text-[10px] font-semibold text-primary">
							{getInitials(currentUser)}
						</span>
					</div>
					<div className="flex-1 min-w-0">
						<p className="text-[12px] font-medium text-sidebar-accent-foreground truncate">
							{formatUsername(currentUser)}
						</p>
					</div>
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button
								variant="ghost"
								size="icon"
								className="h-6 w-6 text-muted-foreground hover:text-foreground hover:bg-sidebar-accent"
							>
								<Settings className="h-3.5 w-3.5" />
								<span className="sr-only">Configuración</span>
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuItem onClick={() => setUserSettingsOpen(true)}>
								<User className="h-3.5 w-3.5 mr-2" />
								Configuración de Usuario
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			</div>

			<UserSettingsDialog
				open={userSettingsOpen}
				onOpenChange={setUserSettingsOpen}
				settings={settings}
				onSettingsChange={onSettingsChange}
			/>
		</div>
	);
}
