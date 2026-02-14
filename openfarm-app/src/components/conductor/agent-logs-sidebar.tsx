"use client";

import { RefreshCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { AgentExecutionEvent } from "@/lib/store";
import { cn } from "@/lib/utils";

function eventTimestamp(event: AgentExecutionEvent): string {
	const value = event.data.timestamp;
	return typeof value === "string" && value.trim().length > 0 ? value : "-";
}

function stringifyData(value: Record<string, unknown>): string {
	try {
		return JSON.stringify(value, null, 2);
	} catch {
		return "{}";
	}
}

interface AgentLogsSidebarProps {
	open: boolean;
	agentName: string;
	events: AgentExecutionEvent[];
	loading: boolean;
	onClose: () => void;
	onRefresh: () => void;
}

export function AgentLogsSidebar({
	open,
	agentName,
	events,
	loading,
	onClose,
	onRefresh,
}: AgentLogsSidebarProps) {
	return (
		<div
			className={cn(
				"absolute inset-y-0 right-0 z-30 w-full max-w-[560px] border-l border-border bg-card shadow-2xl transition-transform duration-200",
				open ? "translate-x-0" : "translate-x-full",
			)}
		>
			<div className="flex items-center justify-between border-b border-border px-3 py-2">
				<div className="min-w-0">
					<p className="truncate text-sm font-semibold text-foreground">
						Execution Logs
					</p>
					<p className="truncate text-xs text-muted-foreground">
						{agentName} · {events.length} events
					</p>
				</div>
				<div className="flex items-center gap-1">
					<Button
						variant="ghost"
						size="icon"
						className="h-7 w-7"
						onClick={onRefresh}
						type="button"
						disabled={loading}
					>
						<RefreshCcw
							className={cn("h-3.5 w-3.5", loading && "animate-spin")}
						/>
						<span className="sr-only">Refresh logs</span>
					</Button>
					<Button
						variant="ghost"
						size="icon"
						className="h-7 w-7"
						onClick={onClose}
						type="button"
					>
						<X className="h-4 w-4" />
						<span className="sr-only">Close logs</span>
					</Button>
				</div>
			</div>

			<ScrollArea className="h-[calc(100%-53px)]">
				<div className="space-y-2 p-3">
					{events.length === 0 && !loading && (
						<div className="rounded-md border border-border bg-background px-3 py-2 text-xs text-muted-foreground">
							No hay logs para este agente todavía.
						</div>
					)}

					{events.map((event, index) => (
						<div
							key={`${event.eventType}-${event.agentId}-${index}`}
							className="rounded-md border border-border bg-background"
						>
							<div className="border-b border-border/80 px-3 py-2">
								<p className="text-xs font-semibold text-foreground">
									{event.eventType}
								</p>
								<p className="text-[11px] text-muted-foreground">
									{eventTimestamp(event)}
								</p>
							</div>
							<pre className="overflow-x-auto px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
								{stringifyData(event.data)}
							</pre>
						</div>
					))}
				</div>
			</ScrollArea>
		</div>
	);
}
