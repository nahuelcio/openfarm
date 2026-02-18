"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { FileCode2, Terminal, Wrench, Cpu, Database } from "lucide-react";

interface AgentProgressProps {
	content: string;
	className?: string;
}

type ProgressItem = {
	type: "tool" | "file" | "command" | "thinking" | "error";
	label: string;
	details?: string;
	timestamp: number;
};

function parseProgressItems(content: string): ProgressItem[] {
	const items: ProgressItem[] = [];
	const lines = content.split("\n");
	
	for (const line of lines) {
		const trimmed = line.trim();
		if (!trimmed) continue;
		
		// Detect tool usage patterns
		if (trimmed.match(/\btool\s+\w+:/i) || trimmed.match(/\b(using|calling)\s+\w+\s+tool/i)) {
			const match = trimmed.match(/tool\s+(\w+):\s*(.+)/i);
			items.push({
				type: "tool",
				label: match?.[1] || "Tool",
				details: match?.[2] || trimmed,
				timestamp: Date.now(),
			});
			continue;
		}
		
		// Detect file operations
		if (trimmed.match(/\b(read|write|edit|modify|create|delete|search)\s+(file|files?)/i) || 
		    trimmed.match(/\b(file|path):\s*\S+/i)) {
			const fileMatch = trimmed.match(/(?:file|path):\s*(\S+)/i) || 
			                  trimmed.match(/\b(\S+\.\w+)\b/);
			items.push({
				type: "file",
				label: fileMatch?.[1] || "File",
				details: trimmed.length > 50 ? trimmed.slice(0, 50) + "..." : trimmed,
				timestamp: Date.now(),
			});
			continue;
		}
		
		// Detect commands
		if (trimmed.match(/^(\$|>|bash|cmd|command|exec)/i) || 
		    trimmed.match(/\brunning\s+(command|script)/i)) {
			items.push({
				type: "command",
				label: "Command",
				details: trimmed.replace(/^[$>]\s*/, "").slice(0, 60),
				timestamp: Date.now(),
			});
			continue;
		}
		
		// Detect errors
		if (trimmed.match(/\b(error|failed|exception|panic)\b/i)) {
			items.push({
				type: "error",
				label: "Error",
				details: trimmed.slice(0, 80),
				timestamp: Date.now(),
			});
			continue;
		}
		
		// Detect thinking/reasoning
		if (trimmed.match(/\b(thinking|analyzing|reasoning|processing)\b/i) ||
		    trimmed.match(/^(step|stage|phase)\s*\d/i)) {
			items.push({
				type: "thinking",
				label: trimmed.slice(0, 40),
				timestamp: Date.now(),
			});
		}
	}
	
	// Keep only last 10 items and deduplicate
	const seen = new Set<string>();
	return items
		.slice(-10)
		.filter(item => {
			const key = `${item.type}-${item.label}`;
			if (seen.has(key)) return false;
			seen.add(key);
			return true;
		});
}

function ProgressIcon({ type }: { type: ProgressItem["type"] }) {
	switch (type) {
		case "tool":
			return <Wrench className="h-3 w-3 text-primary" />;
		case "file":
			return <FileCode2 className="h-3 w-3 text-agent-active" />;
		case "command":
			return <Terminal className="h-3 w-3 text-warning" />;
		case "thinking":
			return <Cpu className="h-3 w-3 text-muted-foreground" />;
		case "error":
			return <Database className="h-3 w-3 text-destructive" />;
	}
}

function ProgressBadge({ type }: { type: ProgressItem["type"] }) {
	const colors = {
		tool: "bg-primary/10 text-primary border-primary/20",
		file: "bg-agent-active/10 text-agent-active border-agent-active/20",
		command: "bg-warning/10 text-warning border-warning/20",
		thinking: "bg-muted text-muted-foreground border-border",
		error: "bg-destructive/10 text-destructive border-destructive/20",
	};
	
	const labels = {
		tool: "Tool",
		file: "File",
		command: "Cmd",
		thinking: "Think",
		error: "Error",
	};
	
	return (
		<span className={cn("px-1.5 py-0.5 rounded text-[10px] font-medium border", colors[type])}>
			{labels[type]}
		</span>
	);
}

export function AgentProgress({ content, className }: AgentProgressProps) {
	const items = useMemo(() => parseProgressItems(content), [content]);
	
	if (items.length === 0) {
		return null;
	}
	
	return (
		<div className={cn("space-y-1.5", className)}>
			{items.map((item, index) => (
				<div
					key={`${item.type}-${index}-${item.timestamp}`}
					className="flex items-center gap-2 text-[11px] animate-in fade-in slide-in-from-left-2 duration-200"
					style={{ animationDelay: `${index * 50}ms` }}
				>
					<ProgressIcon type={item.type} />
					<ProgressBadge type={item.type} />
					<span className="text-muted-foreground truncate flex-1">
						{item.label}
					</span>
					{item.details && (
						<span className="text-[10px] text-muted-foreground/60 truncate max-w-[150px]">
							{item.details}
						</span>
					)}
				</div>
			))}
		</div>
	);
}
