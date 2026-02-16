"use client";

import type { WorkItem } from "@openfarm/core/types/domain";
import {
	Bug,
	ChevronRight,
	Code,
	GitBranch,
	Loader2,
	MessageSquare,
	Tag,
	User,
	Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getAzureDevOpsService } from "@/lib/azure-devops-service";
import type { AzureDevOpsConfig } from "@/lib/store";

interface AzureWorkItemsProps {
	config?: AzureDevOpsConfig;
	onWorkItemSelect?: (workItem: WorkItem) => void;
	onDeployAction?: (workItem: WorkItem) => void;
	onFixAction?: (workItem: WorkItem) => void;
	onPrAction?: (workItem: WorkItem) => void;
}

const getPriorityColor = (priority?: string) => {
	switch (priority) {
		case "critical":
			return "bg-red-500 text-white";
		case "high":
			return "bg-orange-500 text-white";
		case "medium":
			return "bg-blue-500 text-white";
		case "low":
			return "bg-gray-500 text-white";
		default:
			return "bg-gray-500 text-white";
	}
};

const getWorkItemIcon = (workItemType: string) => {
	switch (workItemType.toLowerCase()) {
		case "bug":
			return <Bug className="h-4 w-4" />;
		case "user story":
		case "product backlog item":
			return <User className="h-4 w-4" />;
		case "task":
			return <Code className="h-4 w-4" />;
		case "feature":
			return <Zap className="h-4 w-4" />;
		default:
			return <Code className="h-4 w-4" />;
	}
};

export function AzureWorkItems({
	config,
	onWorkItemSelect,
	onDeployAction,
	onFixAction,
	onPrAction,
}: AzureWorkItemsProps) {
	const [workItems, setWorkItems] = useState<WorkItem[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
	const [searchQuery, setSearchQuery] = useState("");

	const azureService = getAzureDevOpsService(config);

	const workItemTypes = [
		{ id: "Bug", name: "Bugs", icon: <Bug className="h-3 w-3" /> },
		{
			id: "User Story",
			name: "User Stories",
			icon: <User className="h-3 w-3" />,
		},
		{ id: "Task", name: "Tasks", icon: <Code className="h-3 w-3" /> },
		{ id: "Feature", name: "Features", icon: <Zap className="h-3 w-3" /> },
		{
			id: "Product Backlog Item",
			name: "Backlog Items",
			icon: <ChevronRight className="h-3 w-3" />,
		},
	];

	useEffect(() => {
		if (config?.connected) {
			loadWorkItems();
		}
	}, [config, selectedTypes]);

	const loadWorkItems = async () => {
		if (!config?.connected) return;

		setLoading(true);
		setError(null);

		try {
			const items = await azureService.getWorkItems(
				selectedTypes.length > 0 ? selectedTypes : undefined,
			);
			setWorkItems(items);
		} catch (err) {
			setError(
				err instanceof Error ? err.message : "Failed to load work items",
			);
		} finally {
			setLoading(false);
		}
	};

	const toggleWorkItemType = (type: string) => {
		setSelectedTypes((prev) =>
			prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type],
		);
	};

	const filteredWorkItems = workItems.filter(
		(item) =>
			item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
			item.description.toLowerCase().includes(searchQuery.toLowerCase()),
	);

	if (!config?.connected) {
		return (
			<Card>
				<CardContent className="p-6 text-center">
					<p className="text-sm text-muted-foreground">
						Connect to Azure DevOps in settings to view work items
					</p>
				</CardContent>
			</Card>
		);
	}

	return (
		<div className="space-y-4">
			{/* Header */}
			<div className="flex items-center justify-between">
				<h3 className="text-lg font-semibold text-foreground">
					Azure DevOps Work Items
				</h3>
				<Button
					variant="outline"
					size="sm"
					onClick={loadWorkItems}
					disabled={loading}
				>
					{loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
					Refresh
				</Button>
			</div>

			{/* Filters */}
			<div className="space-y-3">
				{/* Search */}
				<div>
					<input
						type="text"
						placeholder="Search work items..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:border-primary/40"
					/>
				</div>

				{/* Work Item Types */}
				<div className="flex flex-wrap gap-2">
					{workItemTypes.map((type) => (
						<Button
							key={type.id}
							variant={selectedTypes.includes(type.id) ? "default" : "outline"}
							size="sm"
							onClick={() => toggleWorkItemType(type.id)}
							className="h-7 text-xs gap-1"
						>
							{type.icon}
							{type.name}
						</Button>
					))}
				</div>
			</div>

			{/* Error */}
			{error && (
				<Card className="border-red-200 bg-red-50/50">
					<CardContent className="p-4">
						<p className="text-sm text-red-600">{error}</p>
					</CardContent>
				</Card>
			)}

			{/* Work Items List */}
			<ScrollArea className="h-[600px]">
				<div className="space-y-3">
					{filteredWorkItems.map((workItem) => (
						<Card
							key={workItem.id}
							className="hover:border-primary/50 transition-colors"
						>
							<CardHeader className="pb-3">
								<div className="flex items-start justify-between">
									<div className="flex items-center gap-2">
										{getWorkItemIcon(workItem.workItemType)}
										<CardTitle className="text-sm font-medium text-foreground">
											{workItem.title}
										</CardTitle>
									</div>
									<div className="flex items-center gap-2">
										<Badge className={getPriorityColor(workItem.priority)}>
											{workItem.priority}
										</Badge>
										<Badge variant="outline" className="text-xs">
											{workItem.workItemType}
										</Badge>
									</div>
								</div>
							</CardHeader>
							<CardContent className="pt-0">
								<div className="space-y-3">
									{/* Description */}
									<p className="text-xs text-muted-foreground line-clamp-2">
										{workItem.description || "No description"}
									</p>

									{/* Metadata */}
									<div className="flex items-center gap-4 text-xs text-muted-foreground">
										<span>#{workItem.id}</span>
										<span>State: {workItem.state}</span>
										{workItem.assignee && (
											<span className="flex items-center gap-1">
												<User className="h-3 w-3" />
												{workItem.assignee.name}
											</span>
										)}
										{workItem.tags && workItem.tags.length > 0 && (
											<span className="flex items-center gap-1">
												<Tag className="h-3 w-3" />
												{workItem.tags.slice(0, 2).join(", ")}
												{workItem.tags.length > 2 &&
													`+${workItem.tags.length - 2}`}
											</span>
										)}
									</div>

									{/* Actions */}
									<div className="flex items-center gap-2 pt-2 border-t border-border/50">
										<Button
											variant="outline"
											size="sm"
											className="h-7 text-xs"
											onClick={() => onWorkItemSelect?.(workItem)}
										>
											View Details
										</Button>
										{onDeployAction && (
											<Button
												variant="outline"
												size="sm"
												className="h-7 text-xs gap-1"
												onClick={() => onDeployAction(workItem)}
											>
												<GitBranch className="h-3 w-3" />
												Deploy
											</Button>
										)}
										{onFixAction && (
											<Button
												variant="outline"
												size="sm"
												className="h-7 text-xs gap-1"
												onClick={() => onFixAction(workItem)}
											>
												<Code className="h-3 w-3" />
												Fix
											</Button>
										)}
										{onPrAction && (
											<Button
												variant="outline"
												size="sm"
												className="h-7 text-xs gap-1"
												onClick={() => onPrAction(workItem)}
											>
												<GitBranch className="h-3 w-3" />
												Create PR
											</Button>
										)}
									</div>
								</div>
							</CardContent>
						</Card>
					))}
				</div>
			</ScrollArea>

			{filteredWorkItems.length === 0 && !loading && !error && (
				<Card>
					<CardContent className="p-6 text-center">
						<p className="text-sm text-muted-foreground">
							{searchQuery
								? "No work items found matching your search"
								: "No work items found"}
						</p>
					</CardContent>
				</Card>
			)}
		</div>
	);
}
