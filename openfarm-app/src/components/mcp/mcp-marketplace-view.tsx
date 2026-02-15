import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { McpCard } from "./mcp-card";
import { McpSearch } from "./mcp-search";

interface McpCatalogEntry {
	id: string;
	name: string;
	description: string;
	icon: string;
	npmPackage: string;
	category: string;
}

interface InstalledMcp {
	id: string;
	catalogEntryId: string;
}

interface McpMarketplaceViewProps {
	catalog: McpCatalogEntry[];
	installed: InstalledMcp[];
	loading?: string | null;
	onInstall: (id: string) => void;
	onUninstall: (id: string) => void;
}

export function McpMarketplaceView({
	catalog,
	installed,
	loading,
	onInstall,
	onUninstall,
}: McpMarketplaceViewProps) {
	const [search, setSearch] = useState("");
	const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

	const installedIds = new Set(installed.map((i) => i.catalogEntryId));

	const categories = Array.from(new Set(catalog.map((m) => m.category)));

	const filteredMcps = catalog.filter((mcp) => {
		const matchesSearch =
			search === "" ||
			mcp.name.toLowerCase().includes(search.toLowerCase()) ||
			mcp.description.toLowerCase().includes(search.toLowerCase());

		const matchesCategory =
			!selectedCategory || mcp.category === selectedCategory;

		return matchesSearch && matchesCategory;
	});

	return (
		<div className="space-y-6">
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h2 className="text-2xl font-bold">MCP Marketplace</h2>
					<p className="text-muted-foreground">
						Discover and install Model Context Protocol servers
					</p>
				</div>
				<McpSearch value={search} onChange={setSearch} />
			</div>

			<div className="flex flex-wrap gap-2">
				<Badge
					variant={selectedCategory === null ? "default" : "outline"}
					className="cursor-pointer"
					onClick={() => setSelectedCategory(null)}
				>
					All ({catalog.length})
				</Badge>
				{categories.map((category) => (
					<Badge
						key={category}
						variant={selectedCategory === category ? "default" : "outline"}
						className="cursor-pointer"
						onClick={() => setSelectedCategory(category)}
					>
						{category} ({catalog.filter((m) => m.category === category).length})
					</Badge>
				))}
			</div>

			{filteredMcps.length === 0 ? (
				<Card>
					<CardContent className="py-10 text-center">
						<p className="text-muted-foreground">
							No MCPs found matching your criteria
						</p>
					</CardContent>
				</Card>
			) : (
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{filteredMcps.map((mcp) => (
						<McpCard
							key={mcp.id}
							id={mcp.id}
							name={mcp.name}
							description={mcp.description}
							icon={mcp.icon}
							category={mcp.category}
							installed={installedIds.has(mcp.id)}
							loading={loading === mcp.id}
							onInstall={() => onInstall(mcp.id)}
							onUninstall={() => onUninstall(mcp.id)}
						/>
					))}
				</div>
			)}
		</div>
	);
}
