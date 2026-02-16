"use client";

import { Database, Settings, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { McpServer } from "@/lib/mcp-manager";
import type { AgentProvider, ProviderConfig } from "@/lib/store";
import { McpProviderSection } from "./mcp-provider-section";
import { cn } from "@/lib/utils";

interface McpHeaderPanelProps {
	providers: ProviderConfig[];
	servers: McpServer[];
	enabledServers: Set<string>;
	onToggleServer: (serverId: string) => void;
	onOpenServerSettings?: (serverId: string) => void;
	onOpenSettings?: () => void;
	onOpenMarketplace?: () => void;
}

export function McpHeaderPanel({
	providers,
	servers,
	enabledServers,
	onToggleServer,
	onOpenServerSettings,
	onOpenSettings,
	onOpenMarketplace,
}: McpHeaderPanelProps) {
	// Group servers by provider
	const serversByProvider = providers.reduce(
		(acc, provider) => {
			const providerServers = servers.filter(
				(server) => server.config.provider === provider.id,
			);
			acc[provider.id] = {
				provider,
				servers: providerServers,
			};
			return acc;
		},
		{} as Record<
			AgentProvider,
			{ provider: ProviderConfig; servers: McpServer[] }
		>,
	);

	const totalServers = servers.length;
	const enabledCount = Array.from(enabledServers).filter((id) =>
		servers.some((s) => s.config.id === id),
	).length;
	const connectedCount = servers.filter((s) => s.connected).length;

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					variant="ghost"
					size="icon"
					className={cn(
						"h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-accent",
						enabledCount > 0 && "text-primary",
					)}
				>
					<Database className="h-4 w-4" />
					<span className="sr-only">MCP Servers</span>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent className="w-96" align="end">
				{/* Header */}
				<div className="px-3 py-2 border-b border-border">
					<div className="flex items-center justify-between">
						<div>
							<h3 className="text-sm font-semibold">MCP Servers</h3>
							<p className="text-xs text-muted-foreground">
								{totalServers} total, {enabledCount} active, {connectedCount}{" "}
								connected
							</p>
						</div>
						<div className="flex items-center gap-1">
							{connectedCount > 0 && (
								<div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
							)}
						</div>
					</div>
				</div>

				{/* Provider sections */}
				<ScrollArea className="max-h-96">
					<div className="p-2 space-y-2">
						{providers.map((provider) => {
							const { servers: providerServers } = serversByProvider[
								provider.id
							] || {
								servers: [],
							};

							return (
								<McpProviderSection
									key={provider.id}
									provider={provider.id}
									providerName={provider.name}
									providerColor={provider.color}
									servers={providerServers}
									enabledServers={enabledServers}
									onToggleServer={onToggleServer}
									onOpenServerSettings={onOpenServerSettings}
									defaultOpen={providerServers.length > 0}
								/>
							);
						})}
					</div>
				</ScrollArea>

				{/* Footer actions */}
				<DropdownMenuSeparator />
				<div className="p-1">
					{onOpenMarketplace && (
						<DropdownMenuItem onClick={onOpenMarketplace}>
							<Database className="h-4 w-4 mr-2" />
							Browse MCP Marketplace
						</DropdownMenuItem>
					)}
					{onOpenSettings && (
						<DropdownMenuItem onClick={onOpenSettings}>
							<Settings className="h-4 w-4 mr-2" />
							Advanced Settings
						</DropdownMenuItem>
					)}
					<DropdownMenuItem disabled>
						<HelpCircle className="h-4 w-4 mr-2" />
						Documentation (coming soon)
					</DropdownMenuItem>
				</div>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
