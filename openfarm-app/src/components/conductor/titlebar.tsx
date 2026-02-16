"use client";

import {
	Cloud,
	PanelLeftClose,
	PanelLeftOpen,
	Plus,
	Search,
	Settings,
	Store,
} from "lucide-react";
import { useEffect, useState } from "react";
import { McpHeaderPanel } from "@/components/mcp/mcp-header-panel";
import { Button } from "@/components/ui/button";
import type { McpServer } from "@/lib/mcp-manager";
import { mcpManager } from "@/lib/mcp-manager";
import type { ProviderConfig } from "@/lib/store";

interface TitlebarProps {
	sidebarOpen: boolean;
	onToggleSidebar: () => void;
	onNewAgent: () => void;
	onOpenSettings: () => void;
	onOpenMarketplace: () => void;
	onOpenAzureDevOps?: () => void;
	providers?: ProviderConfig[];
}

export function Titlebar({
	sidebarOpen,
	onToggleSidebar,
	onNewAgent,
	onOpenSettings,
	onOpenMarketplace,
	onOpenAzureDevOps,
	providers = [],
}: TitlebarProps) {
	// MCP state
	const [mcpServers, setMcpServers] = useState<McpServer[]>([]);
	const [enabledServers, setEnabledServers] = useState<Set<string>>(new Set());

	// Load MCP servers
	useEffect(() => {
		const loadMcps = async () => {
			await mcpManager.loadServers();
			const servers = Array.from(mcpManager.servers.values());
			setMcpServers(servers);

			// Load enabled status from localStorage
			const statusData = localStorage.getItem("openfarm-mcp-status");
			const statusMap = statusData ? JSON.parse(statusData) : {};
			const enabled = new Set(
				servers
					.filter((s) => {
						const key = `${s.config.id}-${s.config.provider}`;
						return statusMap[key] !== false;
					})
					.map((s) => s.config.id),
			);
			setEnabledServers(enabled);
		};

		loadMcps();

		// Update periodically
		const interval = setInterval(loadMcps, 5000);
		return () => clearInterval(interval);
	}, [providers]);

	// Toggle MCP server
	const handleToggleMcp = (serverId: string) => {
		const server = mcpServers.find((s) => s.config.id === serverId);
		if (!server) return;

		const key = `${server.config.id}-${server.config.provider}`;
		const statusData = localStorage.getItem("openfarm-mcp-status");
		const statusMap = statusData ? JSON.parse(statusData) : {};

		// Toggle status
		statusMap[key] = !statusMap[key];
		localStorage.setItem("openfarm-mcp-status", JSON.stringify(statusMap));

		// Update local state
		setEnabledServers((prev) => {
			const next = new Set(prev);
			if (statusMap[key]) {
				next.add(serverId);
			} else {
				next.delete(serverId);
			}
			return next;
		});
	};
	return (
		<header
			className="flex h-12 items-center border-b border-border bg-sidebar px-3 select-none"
			style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
		>
			<Button
				variant="ghost"
				size="icon"
				className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-accent"
				onClick={onToggleSidebar}
				style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
			>
				{sidebarOpen ? (
					<PanelLeftClose className="h-4 w-4" />
				) : (
					<PanelLeftOpen className="h-4 w-4" />
				)}
				<span className="sr-only">Toggle sidebar</span>
			</Button>

			<div className="flex-1" />

			<div
				className="flex items-center gap-1"
				style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
			>
				<Button
					variant="ghost"
					size="icon"
					className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-accent"
				>
					<Search className="h-4 w-4" />
					<span className="sr-only">Search</span>
				</Button>
				<Button
					variant="ghost"
					size="icon"
					className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-accent"
					onClick={onNewAgent}
				>
					<Plus className="h-4 w-4" />
					<span className="sr-only">New agent</span>
				</Button>
				<McpHeaderPanel
					providers={providers}
					servers={mcpServers}
					enabledServers={enabledServers}
					onToggleServer={handleToggleMcp}
					onOpenSettings={onOpenSettings}
					onOpenMarketplace={onOpenMarketplace}
				/>
				{onOpenAzureDevOps && (
					<Button
						variant="ghost"
						size="icon"
						className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-accent"
						onClick={onOpenAzureDevOps}
					>
						<Cloud className="h-4 w-4" />
						<span className="sr-only">Azure DevOps</span>
					</Button>
				)}
				<Button
					variant="ghost"
					size="icon"
					className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-accent"
					onClick={onOpenSettings}
				>
					<Settings className="h-4 w-4" />
					<span className="sr-only">Settings</span>
				</Button>
			</div>
		</header>
	);
}
