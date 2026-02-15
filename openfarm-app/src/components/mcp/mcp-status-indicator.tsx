"use client";

import {
	Activity,
	ChevronDown,
	Database,
	ExternalLink,
	Globe,
	Power,
	PowerOff,
	Settings,
} from "lucide-react";
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { type McpServer, mcpManager } from "@/lib/mcp-manager";
import type { AgentProvider, ProviderConfig } from "@/lib/store";
import { cn } from "@/lib/utils";

interface InstalledMcp {
	id: string;
	provider: AgentProvider;
	config: Record<string, any>;
	installedAt: string;
}

interface McpStatusIndicatorProps {
	providers: ProviderConfig[];
	installedMcps: InstalledMcp[];
	onToggleMcp?: (mcpId: string, provider: AgentProvider) => void;
}

const PROVIDER_ICONS: Record<AgentProvider, React.ComponentType<any>> = {
	"claude-code": Settings,
	codex: Database,
	opencode: Globe,
};

const PROVIDER_COLORS: Record<AgentProvider, string> = {
	"claude-code": "#d97756",
	codex: "#10a37f",
	opencode: "#06b6d4",
};

export function McpStatusIndicator({
	providers,
	installedMcps,
	onToggleMcp,
}: McpStatusIndicatorProps) {
	const [openProvider, setOpenProvider] = useState<AgentProvider | null>(null);
	const [mcpServers, setMcpServers] = useState<Map<string, McpServer>>(
		new Map(),
	);

	// Load real MCP servers from manager
	React.useEffect(() => {
		const loadMcpServers = async () => {
			try {
				// Get real servers from MCP Manager for each provider
				const allServers = new Map<string, McpServer>();

				// Load servers for each provider
				for (const provider of providers) {
					const servers = mcpManager.getServersForProvider(provider.id);
					servers.forEach((server) => {
						allServers.set(server.config.id, server);
					});
				}

				setMcpServers(allServers);
				console.log(`🔧 Loaded ${allServers.size} real MCP servers`);
			} catch (error) {
				console.error("Failed to load MCP servers:", error);
			}
		};

		loadMcpServers();

		// Update servers periodically to get real-time status
		const interval = setInterval(loadMcpServers, 5000); // Update every 5 seconds

		return () => clearInterval(interval);
	}, [providers]);

	// Get MCP status (active/inactive) from localStorage
	const getMcpStatus = (mcpId: string, provider: AgentProvider) => {
		if (typeof window === "undefined") return true; // Default to active on server
		const existingData = localStorage.getItem("openfarm-mcp-status");
		const statusMap = existingData ? JSON.parse(existingData) : {};
		const key = `${mcpId}-${provider}`;
		return statusMap[key] !== false; // Default to true unless explicitly false
	};

	// Group MCPs by provider
	const mcpsByProvider = providers.reduce(
		(acc, provider) => {
			const providerMcps = installedMcps.filter(
				(mcp) => mcp.provider === provider.id,
			);
			acc[provider.id] = providerMcps;
			return acc;
		},
		{} as Record<AgentProvider, InstalledMcp[]>,
	);

	return (
		<div className="flex items-center gap-2">
			{providers.map((provider) => {
				const Icon = PROVIDER_ICONS[provider.id];
				const providerMcps = mcpsByProvider[provider.id] || [];
				const connectedServers = Array.from(mcpServers.values()).filter(
					(server) =>
						server.config.provider === provider.id && server.connected,
				);
				const color = PROVIDER_COLORS[provider.id];

				return (
					<DropdownMenu
						key={provider.id}
						open={openProvider === provider.id}
						onOpenChange={(open) => setOpenProvider(open ? provider.id : null)}
					>
						<DropdownMenuTrigger asChild>
							<Button
								variant="outline"
								size="sm"
								className="flex items-center gap-2 h-8 px-3"
							>
								<Icon
									className="h-3.5 w-3.5"
									style={{
										color: provider.connected
											? color
											: "hsl(var(--muted-foreground))",
									}}
								/>
								<span className="text-xs">{provider.name}</span>
								<span
									className="text-xs px-1.5 py-0.5 rounded-full bg-secondary"
									style={{
										backgroundColor:
											providerMcps.length > 0 ? `${color}20` : undefined,
										color: providerMcps.length > 0 ? color : undefined,
									}}
								>
									{providerMcps.length}
								</span>
								<ChevronDown className="h-3 w-3.5" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent className="w-80" align="end">
							<div className="px-2 py-1.5">
								<div className="flex items-center justify-between">
									<div>
										<div className="text-xs font-medium text-foreground">
											{provider.name} MCPs
										</div>
										<div className="text-xs text-muted-foreground">
											{connectedServers.length} connected
										</div>
									</div>
									{provider.connected && (
										<div className="w-2 h-2 rounded-full bg-green-500" />
									)}
								</div>
							</div>
							<DropdownMenuSeparator />

							{/* MCP Servers Conectados */}
							<div className="max-h-64 overflow-y-auto">
								{connectedServers.length === 0 ? (
									<div className="px-2 py-4 text-xs text-muted-foreground text-center">
										<Database className="h-4 w-4 mx-auto mb-2 text-muted-foreground" />
										No MCP servers connected
									</div>
								) : (
									connectedServers.map((server) => {
										const isActive = getMcpStatus(
											server.config.id,
											server.config.provider,
										);
										return (
											<DropdownMenuItem
												key={server.config.id}
												className="flex flex-col items-start p-3"
											>
												<div className="flex items-center justify-between w-full">
													<div className="flex items-center gap-2">
														<Database
															className={`h-3.5 w-3.5 ${server.connected ? "text-green-600" : "text-gray-400"}`}
														/>
														<span className="text-xs font-medium">
															{server.config.name}
														</span>
														<span
															className={`text-xs px-1.5 py-0.5 rounded-full ${isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}`}
														>
															{isActive ? "Active" : "Inactive"}
														</span>
														{server.connected && (
															<span className="text-xs px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700">
																<Activity className="h-2 w-2 inline mr-1" />
																Connected
															</span>
														)}
													</div>
													{onToggleMcp && (
														<Button
															variant="ghost"
															size="sm"
															className="h-6 w-6 p-0"
															onClick={() =>
																onToggleMcp(
																	server.config.id,
																	server.config.provider,
																)
															}
														>
															{isActive ? (
																<Power className="h-3 w-3 text-green-600" />
															) : (
																<PowerOff className="h-3 w-3 text-gray-400" />
															)}
														</Button>
													)}
												</div>
												<div className="text-xs text-muted-foreground ml-5 mt-1">
													{server.tools.length} tools, {server.resources.length}{" "}
													resources
												</div>
												{server.lastError && (
													<div className="text-xs text-red-600 ml-5 mt-1">
														Error: {server.lastError}
													</div>
												)}
											</DropdownMenuItem>
										);
									})
								)}
							</div>

							<DropdownMenuSeparator />

							{/* Actions */}
							<div className="p-1">
								<DropdownMenuItem
									className="text-xs text-muted-foreground"
									onClick={() => {
										// TODO: Open marketplace filtered by this provider
										console.log(`Open marketplace for ${provider.name}`);
									}}
								>
									<span className="flex items-center gap-2">
										<Database className="h-3 w-3" />
										Add MCPs...
									</span>
								</DropdownMenuItem>
							</div>
						</DropdownMenuContent>
					</DropdownMenu>
				);
			})}
		</div>
	);
}
