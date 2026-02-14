"use client";

import { openUrl } from "@tauri-apps/plugin-opener";
import { Command } from "@tauri-apps/plugin-shell";
import {
	AlertCircle,
	Archive,
	CheckCircle2,
	Circle,
	ExternalLink,
	Eye,
	FileCode2,
	FileDiff,
	FolderOpen,
	GitBranch,
	GitPullRequest,
	ListTree,
	Loader2,
	MoreHorizontal,
	Square,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Agent, AgentProvider, AgentStatus } from "@/lib/store";
import { cn } from "@/lib/utils";

async function openInEditor(repoPath: string) {
	try {
		const result = await Command.create("code", [repoPath]).execute();
		if (result.code === 0) return;
	} catch {}

	try {
		await Command.create("open", [repoPath]).execute();
	} catch (error) {
		console.error("Failed to open folder:", error);
	}
}

async function getGitHubUrl(repoPath: string): Promise<string | null> {
	try {
		const output = await Command.create("git", [
			"remote",
			"get-url",
			"origin",
		]).execute();
		if (output.code !== 0) {
			return null;
		}
		let remoteUrl = output.stdout.trim();
		remoteUrl = remoteUrl.replace("git@github.com:", "https://github.com/");
		remoteUrl = remoteUrl.replace(/\.git$/, "");
		return remoteUrl;
	} catch (error) {
		console.error("Failed to get GitHub URL:", error);
		return null;
	}
}

async function viewOnGitHub(repoPath: string) {
	const githubUrl = await getGitHubUrl(repoPath);
	if (githubUrl) {
		await openUrl(githubUrl);
	}
}

async function createPullRequest(repoPath: string, branch: string) {
	const baseBranch = "main";
	const githubUrl = await getGitHubUrl(repoPath);
	if (githubUrl) {
		const prUrl = `${githubUrl}/compare/${baseBranch}...${branch}?expand=1`;
		await openUrl(prUrl);
	}
}

function StatusDot({ status }: { status: AgentStatus }) {
	const colors: Record<AgentStatus, string> = {
		running: "bg-agent-active",
		idle: "bg-agent-idle",
		completed: "bg-agent-active",
		error: "bg-agent-error",
		reviewing: "bg-primary",
	};
	return (
		<span
			className={cn(
				"h-2 w-2 rounded-full shrink-0",
				colors[status],
				status === "running" && "animate-pulse",
			)}
		/>
	);
}

function StatusBadge({ status }: { status: AgentStatus }) {
	const labels: Record<AgentStatus, string> = {
		running: "Running",
		idle: "Idle",
		completed: "Completed",
		error: "Error",
		reviewing: "Needs Review",
	};
	const compactLabels: Record<AgentStatus, string> = {
		running: "Run",
		idle: "Idle",
		completed: "Done",
		error: "Err",
		reviewing: "Review",
	};
	const icons: Record<AgentStatus, React.ReactNode> = {
		running: <Loader2 className="h-3 w-3 animate-spin" />,
		idle: <Circle className="h-3 w-3" />,
		completed: <CheckCircle2 className="h-3 w-3" />,
		error: <AlertCircle className="h-3 w-3" />,
		reviewing: <Eye className="h-3 w-3" />,
	};
	const colors: Record<AgentStatus, string> = {
		running: "bg-agent-active/10 text-agent-active border-agent-active/20",
		idle: "bg-agent-idle/10 text-agent-idle border-agent-idle/20",
		completed: "bg-agent-active/10 text-agent-active border-agent-active/20",
		error: "bg-agent-error/10 text-agent-error border-agent-error/20",
		reviewing: "bg-primary/10 text-primary border-primary/20",
	};

	return (
		<span
			className={cn(
				"inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-md border",
				colors[status],
			)}
		>
			{icons[status]}
			<span className="sm:hidden">{compactLabels[status]}</span>
			<span className="hidden sm:inline">{labels[status]}</span>
		</span>
	);
}

const PROVIDER_COLORS: Record<
	AgentProvider,
	{ bg: string; text: string; label: string }
> = {
	"claude-code": {
		bg: "bg-[#d97756]/10",
		text: "text-[#d97756]",
		label: "Claude Code",
	},
	codex: { bg: "bg-[#10a37f]/10", text: "text-[#10a37f]", label: "Codex" },
	opencode: {
		bg: "bg-[#06b6d4]/10",
		text: "text-[#06b6d4]",
		label: "OpenCode",
	},
};

function ProviderTag({
	provider,
	model,
}: {
	provider: AgentProvider;
	model?: string;
}) {
	const p = PROVIDER_COLORS[provider];
	return (
		<span
			className={cn(
				"inline-flex items-center gap-1.5 text-[11px] font-mono px-2 py-0.5 rounded",
				p.bg,
				p.text,
			)}
		>
			<span
				className={cn(
					"h-1.5 w-1.5 rounded-full",
					p.text.replace("text-", "bg-"),
				)}
			/>
			{p.label}
			{model && (
				<span className="hidden md:inline opacity-60 max-w-[140px] truncate">
					/ {model.split("-").slice(0, 2).join("-")}
				</span>
			)}
		</span>
	);
}

interface AgentHeaderProps {
	agent: Agent;
	onViewChanges?: () => void;
	onStopAgent?: () => void;
	onArchiveConversation?: () => void;
	stopping?: boolean;
	onToggleLogs?: () => void;
	logsOpen?: boolean;
}

export function AgentHeader({
	agent,
	onViewChanges,
	onStopAgent,
	onArchiveConversation,
	stopping = false,
	onToggleLogs,
	logsOpen = false,
}: AgentHeaderProps) {
	return (
		<div className="flex flex-col gap-3 border-b border-border bg-card px-3 py-3 sm:px-4 lg:flex-row lg:items-center lg:justify-between">
			<div className="flex min-w-0 flex-1 items-start gap-2.5 sm:items-center">
				<StatusDot status={agent.status} />
				<div className="min-w-0">
					<div className="flex min-w-0 flex-wrap items-center gap-2">
						<h1 className="max-w-[260px] truncate text-sm font-semibold text-foreground sm:max-w-[380px]">
							{agent.name}
						</h1>
						<ProviderTag provider={agent.provider} model={agent.model} />
					</div>
					<div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1">
						<div className="flex items-center gap-1 text-xs text-muted-foreground">
							<GitBranch className="h-3 w-3" />
							<span className="max-w-[220px] truncate font-mono sm:max-w-[300px]">
								{agent.branch}
							</span>
						</div>
						<span className="hidden text-[10px] text-muted-foreground lg:inline">
							{agent.startedAt}
						</span>
					</div>
				</div>
			</div>

			<div className="flex flex-wrap items-center gap-2 lg:justify-end">
				<StatusBadge status={agent.status} />

				{/* Stats */}
				<div className="hidden xl:flex items-center gap-3 rounded-md bg-secondary px-3 py-1 text-xs text-muted-foreground">
					<span className="flex items-center gap-1">
						<FileCode2 className="h-3 w-3" />
						{agent.filesChanged} files
					</span>
					<span className="text-agent-active">+{agent.linesAdded}</span>
					<span className="text-agent-error">-{agent.linesRemoved}</span>
				</div>

				{/* Actions */}
				<div className="flex items-center gap-1">
					{agent.diffs.length > 0 && (
						<Button
							variant="ghost"
							size="sm"
							className="h-7 gap-1.5 px-2 text-xs text-foreground hover:bg-accent hover:text-foreground sm:px-2.5"
							onClick={onViewChanges}
						>
							<FileDiff className="h-3.5 w-3.5" />
							<span className="hidden md:inline">View Changes</span>
						</Button>
					)}

					<Button
						variant="ghost"
						size="sm"
						className={cn(
							"h-7 gap-1.5 px-2 text-xs sm:px-2.5",
							logsOpen
								? "bg-accent text-foreground"
								: "text-foreground hover:bg-accent",
						)}
						onClick={onToggleLogs}
					>
						<ListTree className="h-3.5 w-3.5" />
						<span className="hidden md:inline">Logs</span>
					</Button>

					{agent.status === "running" && (
						<Button
							variant="ghost"
							size="sm"
							className="h-7 gap-1.5 px-2 text-xs text-agent-error hover:bg-agent-error/10 hover:text-agent-error sm:px-2.5"
							onClick={onStopAgent}
							disabled={stopping}
						>
							{stopping ? (
								<Loader2 className="h-3.5 w-3.5 animate-spin" />
							) : (
								<Square className="h-3.5 w-3.5" />
							)}
							<span className="hidden md:inline">
								{stopping ? "Stopping..." : "Stop"}
							</span>
						</Button>
					)}

					{(agent.status === "completed" || agent.status === "reviewing") && (
						<Button
							variant="ghost"
							size="sm"
							className="h-7 gap-1.5 px-2 text-xs text-primary hover:bg-primary/10 hover:text-primary sm:px-2.5"
							onClick={() => createPullRequest(agent.repo, agent.branch)}
						>
							<GitPullRequest className="h-3.5 w-3.5" />
							<span className="hidden md:inline">Create PR</span>
						</Button>
					)}

					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button
								variant="ghost"
								size="icon"
								className="h-7 w-7 text-muted-foreground hover:text-foreground"
							>
								<MoreHorizontal className="h-4 w-4" />
								<span className="sr-only">More options</span>
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end" className="w-48">
							<DropdownMenuItem onClick={() => openInEditor(agent.repo)}>
								<FolderOpen className="h-4 w-4 mr-2" />
								Open in Editor
							</DropdownMenuItem>
							<DropdownMenuItem onClick={() => viewOnGitHub(agent.repo)}>
								<ExternalLink className="h-4 w-4 mr-2" />
								View on GitHub
							</DropdownMenuItem>
							<DropdownMenuItem
								onClick={() => createPullRequest(agent.repo, agent.branch)}
							>
								<GitPullRequest className="h-4 w-4 mr-2" />
								Create Pull Request
							</DropdownMenuItem>
							<DropdownMenuSeparator />
							<DropdownMenuItem
								disabled={
									!onArchiveConversation ||
									agent.status === "running" ||
									stopping
								}
								onClick={onArchiveConversation}
							>
								<Archive className="h-4 w-4 mr-2" />
								Archive Conversation
							</DropdownMenuItem>
							<DropdownMenuItem
								className="text-agent-error"
								disabled={agent.status !== "running" || stopping}
								onClick={onStopAgent}
							>
								Stop Agent
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			</div>
		</div>
	);
}
