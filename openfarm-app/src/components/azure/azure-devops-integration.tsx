"use client";

import type { WorkItem } from "@openfarm/core/types/domain";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AzureDevOpsConfig } from "@/lib/store";
import { AzureWorkItemActions } from "./azure-work-item-actions";
import { AzureWorkItems } from "./azure-work-items";

interface AzureDevOpsIntegrationProps {
	config?: AzureDevOpsConfig;
	onAgentCreate?: (prompt: string, workItem: WorkItem) => void;
}

export function AzureDevOpsIntegration({
	config,
	onAgentCreate,
}: AzureDevOpsIntegrationProps) {
	const [selectedWorkItem, setSelectedWorkItem] = useState<WorkItem | null>(
		null,
	);

	const handleWorkItemSelect = (workItem: WorkItem) => {
		setSelectedWorkItem(workItem);
	};

	const handleActionComplete = (action: string, result: any) => {
		console.log(`Action ${action} completed:`, result);
		// You could show a toast notification here
	};

	const handleBackToList = () => {
		setSelectedWorkItem(null);
	};

	if (!config?.connected) {
		return (
			<Card>
				<CardContent className="p-6 text-center">
					<p className="text-sm text-muted-foreground">
						Configure Azure DevOps in settings to use this integration
					</p>
				</CardContent>
			</Card>
		);
	}

	return (
		<div className="w-full h-full">
			{selectedWorkItem ? (
				// Work Item Actions View
				<div className="space-y-4">
					<div className="flex items-center justify-between">
						<h2 className="text-lg font-semibold text-foreground">
							Work Item Actions - {selectedWorkItem.title}
						</h2>
						<button
							onClick={handleBackToList}
							className="text-sm text-muted-foreground hover:text-foreground"
						>
							← Back to work items
						</button>
					</div>
					<AzureWorkItemActions
						config={config}
						workItem={selectedWorkItem}
						onActionComplete={handleActionComplete}
						onAgentCreate={onAgentCreate}
					/>
				</div>
			) : (
				// Work Items List View
				<AzureWorkItems
					config={config}
					onWorkItemSelect={handleWorkItemSelect}
					onDeployAction={(workItem) => {
						setSelectedWorkItem(workItem);
						// Auto-select deploy action
					}}
					onFixAction={(workItem) => {
						setSelectedWorkItem(workItem);
						// Auto-select fix action
					}}
					onPrAction={(workItem) => {
						setSelectedWorkItem(workItem);
						// Auto-select PR action
					}}
				/>
			)}
		</div>
	);
}
