"use client";

import { Circle, ExternalLink, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import type { McpServer } from "@/lib/mcp-manager";
import { cn } from "@/lib/utils";

interface McpServerItemProps {
	server: McpServer;
	isEnabled: boolean;
	onToggle: () => void;
	onOpenSettings?: () => void;
}

export function McpServerItem({
	server,
	isEnabled,
	onToggle,
	onOpenSettings,
}: McpServerItemProps) {
	return (
		<div className="flex items-center justify-between p-2 rounded-lg hover:bg-accent/50 transition-colors group">
			<div className="flex items-center gap-2 flex-1 min-w-0">
				{/* Status dot */}
				<TooltipProvider>
					<Tooltip>
						<TooltipTrigger asChild>
							<span
								className={cn(
									"h-2 w-2 rounded-full shrink-0",
									server.connected ? "bg-green-500" : "bg-gray-400",
									server.connected && "animate-pulse",
								)}
							/>
						</TooltipTrigger>
						<TooltipContent>
							<p>{server.connected ? "Connected" : "Disconnected"}</p>
						</TooltipContent>
					</Tooltip>
				</TooltipProvider>

				{/* Server name */}
				<div className="flex-1 min-w-0">
					<div className="flex items-center gap-2">
						<span className="text-sm font-medium truncate">
							{server.config.name}
						</span>
						{server.lastError && (
							<TooltipProvider>
								<Tooltip>
									<TooltipTrigger>
										<Circle className="h-2 w-2 text-red-500 fill-current" />
									</TooltipTrigger>
									<TooltipContent>
										<p className="text-xs max-w-xs">{server.lastError}</p>
									</TooltipContent>
								</Tooltip>
							</TooltipProvider>
						)}
					</div>
					<div className="text-xs text-muted-foreground">
						{server.tools.length} tools, {server.resources.length} resources
					</div>
				</div>

				{/* Tool count badge */}
				<span className="text-xs font-mono px-2 py-0.5 rounded bg-secondary text-secondary-foreground">
					{server.tools.length}
				</span>
			</div>

			{/* Actions */}
			<div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
				<Switch checked={isEnabled} onCheckedChange={onToggle} />
				{onOpenSettings && (
					<Button
						variant="ghost"
						size="icon"
						className="h-6 w-6"
						onClick={onOpenSettings}
					>
						<Settings className="h-3 w-3" />
					</Button>
				)}
			</div>
		</div>
	);
}
