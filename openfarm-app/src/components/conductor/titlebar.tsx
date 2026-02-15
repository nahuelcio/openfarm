"use client";

import {
	PanelLeftClose,
	PanelLeftOpen,
	Plus,
	Search,
	Settings,
	Store,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface TitlebarProps {
	sidebarOpen: boolean;
	onToggleSidebar: () => void;
	onNewAgent: () => void;
	onOpenSettings: () => void;
	onOpenMarketplace: () => void;
}

export function Titlebar({
	sidebarOpen,
	onToggleSidebar,
	onNewAgent,
	onOpenSettings,
	onOpenMarketplace,
}: TitlebarProps) {
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
				<Button
					variant="ghost"
					size="icon"
					className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-accent"
					onClick={onOpenMarketplace}
				>
					<Store className="h-4 w-4" />
					<span className="sr-only">MCP Marketplace</span>
				</Button>
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
