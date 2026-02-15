"use client";

import { Copy, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import type { ResponseStatistics } from "@/lib/store";

interface StatisticsDialogProps {
	statistics: ResponseStatistics;
	children: React.ReactNode;
}

function StatRow({
	label,
	value,
	icon,
}: {
	label: string;
	value: string | number;
	icon?: React.ReactNode;
}) {
	return (
		<div className="flex items-center justify-between py-2 border-b border-border/50">
			<div className="flex items-center gap-2 text-sm text-muted-foreground">
				{icon}
				{label}
			</div>
			<span className="text-sm font-mono text-foreground">{value}</span>
		</div>
	);
}

export function StatisticsDialog({ statistics, children }: StatisticsDialogProps) {
	const copyToClipboard = () => {
		const statsText = `RESPONSE STATISTICS
Credits spent: ${statistics.creditsSpent} credits
Tool calls: ${statistics.toolCalls} calls
Model: ${statistics.model}
Files changed: ${statistics.filesChanged} files
Terminals created: ${statistics.terminalsCreated} processes
Request ID: ${statistics.requestId}
Tokens input: ${statistics.tokensInput}
Tokens output: ${statistics.tokensOutput}
Duration: ${statistics.duration}ms`;

		navigator.clipboard.writeText(statsText);
	};

	return (
		<Dialog>
			<DialogTrigger asChild>{children}</DialogTrigger>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<BarChart3 className="h-4 w-4" />
						Response Statistics
					</DialogTitle>
				</DialogHeader>
				
				<div className="space-y-4">
					<div className="space-y-1">
						<StatRow
							label="Credits spent"
							value={`${statistics.creditsSpent} credits`}
						/>
						<StatRow
							label="Tool calls"
							value={`${statistics.toolCalls} calls`}
						/>
						<StatRow
							label="Model"
							value={statistics.model}
						/>
					</div>

					<div className="space-y-1">
						<h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide py-2">
							Tool Call Summary
						</h4>
						<StatRow
							label="Files changed"
							value={`${statistics.filesChanged} files`}
						/>
						<StatRow
							label="Terminals created"
							value={`${statistics.terminalsCreated} processes`}
						/>
					</div>

					<div className="space-y-1">
						<h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide py-2">
							Token Usage
						</h4>
						<StatRow
							label="Tokens input"
							value={statistics.tokensInput.toLocaleString()}
						/>
						<StatRow
							label="Tokens output"
							value={statistics.tokensOutput.toLocaleString()}
						/>
						<StatRow
							label="Duration"
							value={`${(statistics.duration / 1000).toFixed(2)}s`}
						/>
					</div>

					<div className="space-y-1">
						<h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide py-2">
							Request Details
						</h4>
						<StatRow
							label="Request ID"
							value={statistics.requestId}
						/>
					</div>

					<Button
						variant="outline"
						size="sm"
						onClick={copyToClipboard}
						className="w-full mt-4 gap-2"
					>
						<Copy className="h-3.5 w-3.5" />
						Copy Statistics
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
