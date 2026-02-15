"use client";

import { ChevronDown, Database, Globe, Settings, ExternalLink, Power, PowerOff } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { AgentProvider, ProviderConfig } from "@/lib/store";
import { REAL_PROVIDER_MCPS, type RealMcpInfo } from "@/lib/real-provider-mcps";
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

	// Get MCP status (active/inactive) from localStorage
	const getMcpStatus = (mcpId: string, provider: AgentProvider) => {
		if (typeof window === "undefined") return true; // Default to active on server
		const existingData = localStorage.getItem('openfarm-mcp-status');
		const statusMap = existingData ? JSON.parse(existingData) : {};
		const key = `${mcpId}-${provider}`;
		return statusMap[key] !== false; // Default to true unless explicitly false
	};

	// Group MCPs by provider
	const mcpsByProvider = providers.reduce((acc, provider) => {
		const providerMcps = installedMcps.filter(
			(mcp) => mcp.provider === provider.id
		);
		acc[provider.id] = providerMcps;
		return acc;
	}, {} as Record<AgentProvider, InstalledMcp[]>);

	return (
		<div className="flex items-center gap-2">
			{providers.map((provider) => {
				const Icon = PROVIDER_ICONS[provider.id];
				const providerMcps = mcpsByProvider[provider.id] || [];
				const realMcps = REAL_PROVIDER_MCPS[provider.id] || [];
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
									style={{ color: provider.connected ? color : "hsl(var(--muted-foreground))" }}
								/>
								<span className="text-xs">{provider.name}</span>
								<span 
									className="text-xs px-1.5 py-0.5 rounded-full bg-secondary"
									style={{ 
										backgroundColor: providerMcps.length > 0 ? `${color}20` : undefined,
										color: providerMcps.length > 0 ? color : undefined
									}}
								>
									{providerMcps.length}
								</span>
								<ChevronDown className="h-3 w-3.5" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent className="w-72" align="end">
							<div className="px-2 py-1.5">
								<div className="flex items-center justify-between">
									<div>
										<div className="text-xs font-medium text-foreground">
											{provider.name} MCPs
										</div>
										<div className="text-xs text-muted-foreground">
											{providerMcps.length} configured
										</div>
									</div>
									{provider.connected && (
										<div className="w-2 h-2 rounded-full bg-green-500" />
									)}
								</div>
							</div>
							<DropdownMenuSeparator />
							
							{/* MCPs Configurados */}
							<div className="max-h-64 overflow-y-auto">
								{providerMcps.length === 0 ? (
									<div className="px-2 py-4 text-xs text-muted-foreground text-center">
										<Database className="h-4 w-4 mx-auto mb-2 text-muted-foreground" />
										No MCPs configured
									</div>
								) : (
									providerMcps.map((mcp) => {
										const isActive = getMcpStatus(mcp.id, mcp.provider);
										return (
											<DropdownMenuItem
												key={`${mcp.id}-${mcp.provider}`}
												className="flex flex-col items-start p-3"
											>
												<div className="flex items-center justify-between w-full">
													<div className="flex items-center gap-2">
														<Database className={`h-3.5 w-3.5 ${isActive ? 'text-green-600' : 'text-gray-400'}`} />
														<span className="text-xs font-medium">{mcp.id}</span>
														<span className={`text-xs px-1.5 py-0.5 rounded-full ${isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
															{isActive ? 'Active' : 'Inactive'}
														</span>
													</div>
													{onToggleMcp && (
														<Button
															variant="ghost"
															size="sm"
															className="h-6 w-6 p-0"
															onClick={() => onToggleMcp(mcp.id, mcp.provider)}
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
													Configured: {new Date(mcp.installedAt).toLocaleDateString()}
												</div>
												{Object.keys(mcp.config).length > 0 && (
													<div className="text-xs text-muted-foreground ml-5 mt-1">
														Settings: {Object.keys(mcp.config).join(", ")}
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
