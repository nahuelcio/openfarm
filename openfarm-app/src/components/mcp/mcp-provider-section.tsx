"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { McpServer } from "@/lib/mcp-manager";
import type { AgentProvider } from "@/lib/store";
import { McpServerItem } from "./mcp-server-item";
import { cn } from "@/lib/utils";

interface McpProviderSectionProps {
	provider: AgentProvider;
	providerName: string;
	providerColor: string;
	servers: McpServer[];
	enabledServers: Set<string>;
	onToggleServer: (serverId: string) => void;
	onOpenServerSettings?: (serverId: string) => void;
	defaultOpen?: boolean;
}

const PROVIDER_CONFIG = {
	"claude-code": { label: "Claude Code", color: "#d97756" },
	codex: { label: "Codex", color: "#10a37f" },
	opencode: { label: "OpenCode", color: "#06b6d4" },
} as const;

export function McpProviderSection({
	provider,
	providerName,
	providerColor,
	servers,
	enabledServers,
	onToggleServer,
	onOpenServerSettings,
	defaultOpen = false,
}: McpProviderSectionProps) {
	const [open, setOpen] = useState(defaultOpen);
	const config = PROVIDER_CONFIG[provider];

	const enabledCount = servers.filter((s) =>
		enabledServers.has(s.config.id),
	).length;
	const connectedCount = servers.filter((s) => s.connected).length;

	return (
		<div className="border border-border rounded-lg overflow-hidden">
			<Collapsible open={open} onOpenChange={setOpen}>
				<CollapsibleTrigger asChild>
					<Button
						variant="ghost"
						className="w-full justify-between p-3 h-auto hover:bg-accent/50"
					>
						<div className="flex items-center gap-2">
							{open ? (
								<ChevronDown className="h-4 w-4 text-muted-foreground" />
							) : (
								<ChevronRight className="h-4 w-4 text-muted-foreground" />
							)}
							<div className="flex items-center gap-2">
								<div
									className="h-2 w-2 rounded-full"
									style={{ backgroundColor: config.color }}
								/>
								<span className="text-sm font-medium">{config.label}</span>
								<span className="text-xs text-muted-foreground">
									({servers.length} MCPs)
								</span>
							</div>
						</div>
						<div className="flex items-center gap-2 text-xs text-muted-foreground">
							{connectedCount > 0 && (
								<span className="text-green-600">
									{connectedCount} connected
								</span>
							)}
							{enabledCount > 0 && (
								<span className="text-blue-600">{enabledCount} active</span>
							)}
						</div>
					</Button>
				</CollapsibleTrigger>
				<CollapsibleContent className="p-2 pt-0 space-y-1">
					{servers.length === 0 ? (
						<div className="text-center py-4 text-xs text-muted-foreground">
							No MCP servers configured
						</div>
					) : (
						servers.map((server) => (
							<McpServerItem
								key={server.config.id}
								server={server}
								isEnabled={enabledServers.has(server.config.id)}
								onToggle={() => onToggleServer(server.config.id)}
								onOpenSettings={
									onOpenServerSettings
										? () => onOpenServerSettings(server.config.id)
										: undefined
								}
							/>
						))
					)}
				</CollapsibleContent>
			</Collapsible>
		</div>
	);
}
