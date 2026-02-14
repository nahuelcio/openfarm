"use client";

import { BotMessageSquare, Cpu, GitBranch, Plus, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
	onNewAgent: () => void;
}

export function EmptyState({ onNewAgent }: EmptyStateProps) {
	return (
		<div className="flex h-full flex-col items-center justify-center bg-background px-6">
			<div className="flex flex-col items-center max-w-md text-center">
				{/* Logo */}
				<div className="relative mb-8">
					<div className="h-16 w-16 rounded-2xl bg-secondary flex items-center justify-center border border-border">
						<BotMessageSquare className="h-8 w-8 text-foreground" />
					</div>
					<div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-agent-active flex items-center justify-center">
						<Zap className="h-3 w-3 text-background" />
					</div>
				</div>

				<h2 className="text-lg font-semibold text-foreground mb-2">
					Run a team of coding agents
				</h2>
				<p className="text-sm text-muted-foreground leading-relaxed mb-8">
					Deploy parallel agents in isolated workspaces. See at a glance what
					they are working on, then review and merge their changes.
				</p>

				<Button
					onClick={onNewAgent}
					className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
				>
					<Plus className="h-4 w-4" />
					New Agent
				</Button>

				{/* Feature grid */}
				<div className="grid grid-cols-3 gap-4 mt-12 w-full">
					<div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-card border border-border">
						<Cpu className="h-5 w-5 text-muted-foreground" />
						<span className="text-[11px] text-muted-foreground text-center">
							Parallel Execution
						</span>
					</div>
					<div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-card border border-border">
						<GitBranch className="h-5 w-5 text-muted-foreground" />
						<span className="text-[11px] text-muted-foreground text-center">
							Isolated Worktrees
						</span>
					</div>
					<div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-card border border-border">
						<BotMessageSquare className="h-5 w-5 text-muted-foreground" />
						<span className="text-[11px] text-muted-foreground text-center">
							Multi-Agent Chat
						</span>
					</div>
				</div>
			</div>
		</div>
	);
}
