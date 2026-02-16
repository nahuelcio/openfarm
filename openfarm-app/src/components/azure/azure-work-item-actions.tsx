"use client";

import type { WorkItem } from "@openfarm/core/types/domain";
import { GitBranch, Hammer, Loader2, Rocket, Send } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { getAzureDevOpsService } from "@/lib/azure-devops-service";
import type { AzureDevOpsConfig } from "@/lib/store";

interface AzureWorkItemActionsProps {
	config?: AzureDevOpsConfig;
	workItem: WorkItem;
	onActionComplete?: (action: string, result: any) => void;
	onAgentCreate?: (prompt: string, workItem: WorkItem) => void;
}

type ActionType = "deploy" | "fix" | "pr";

interface ActionTemplate {
	type: ActionType;
	title: string;
	description: string;
	icon: React.ReactNode;
	prompt: (workItem: WorkItem) => string;
}

export function AzureWorkItemActions({
	config,
	workItem,
	onActionComplete,
	onAgentCreate,
}: AzureWorkItemActionsProps) {
	const [selectedAction, setSelectedAction] = useState<ActionType | null>(null);
	const [customPrompt, setCustomPrompt] = useState("");
	const [isExecuting, setIsExecuting] = useState(false);

	const azureService = getAzureDevOpsService(config);

	const actionTemplates: ActionTemplate[] = [
		{
			type: "deploy",
			title: "Deploy Changes",
			description: "Deploy the work item changes to production",
			icon: <Rocket className="h-4 w-4" />,
			prompt: (wi) => `Deploy the changes for work item #${wi.id}: ${wi.title}

Description: ${wi.description}

Please:
1. Review the current changes in the repository
2. Ensure all tests pass
3. Create a deployment plan
4. Execute the deployment following best practices
5. Update the work item status to "Completed" or "Deployed"

Work Item Details:
- Type: ${wi.workItemType}
- Priority: ${wi.priority}
- State: ${wi.state}
- Tags: ${wi.tags?.join(", ") || "None"}

Focus on safe deployment practices and rollback procedures.`,
		},
		{
			type: "fix",
			title: "Fix Issue",
			description: "Fix the bug or implement the requested changes",
			icon: <Hammer className="h-4 w-4" />,
			prompt: (
				wi,
			) => `Fix the issue described in work item #${wi.id}: ${wi.title}

Description: ${wi.description}
${wi.acceptanceCriteria ? `Acceptance Criteria: ${wi.acceptanceCriteria}` : ""}

Please:
1. Analyze the issue and identify the root cause
2. Implement the necessary fixes
3. Add appropriate tests
4. Ensure code quality and follow best practices
5. Update documentation if needed

Work Item Details:
- Type: ${wi.workItemType}
- Priority: ${wi.priority}
- State: ${wi.state}
- Tags: ${wi.tags?.join(", ") || "None"}

Focus on delivering a complete and tested solution.`,
		},
		{
			type: "pr",
			title: "Create Pull Request",
			description: "Create a pull request for the work item",
			icon: <GitBranch className="h-4 w-4" />,
			prompt: (
				wi,
			) => `Create a pull request for work item #${wi.id}: ${wi.title}

Description: ${wi.description}

Please:
1. Review all changes in the current branch
2. Create a comprehensive pull request description
3. Ensure the PR follows the project's contribution guidelines
4. Add appropriate reviewers and labels
5. Link the PR to the work item

Work Item Details:
- Type: ${wi.workItemType}
- Priority: ${wi.priority}
- State: ${wi.state}
- Tags: ${wi.tags?.join(", ") || "None"}

Create a well-structured PR that clearly explains the changes and their impact.`,
		},
	];

	const handleActionSelect = (action: ActionType) => {
		setSelectedAction(action);
		const template = actionTemplates.find((t) => t.type === action);
		if (template) {
			setCustomPrompt(template.prompt(workItem));
		}
	};

	const handleExecuteAction = async () => {
		if (!selectedAction || !config) return;

		setIsExecuting(true);

		try {
			// Create agent with the prompt
			if (onAgentCreate) {
				onAgentCreate(customPrompt, workItem);
			}

			// Update work item status to "In Progress"
			await azureService.updateWorkItemStatus(workItem.id, "In Progress");

			// Add comment about the action being taken
			const actionText =
				actionTemplates.find((t) => t.type === selectedAction)?.title ||
				selectedAction;
			await azureService.addComment(
				workItem.id,
				`Started ${actionText.toLowerCase()} action. Agent is working on this task.`,
			);

			onActionComplete?.(selectedAction, { success: true, workItem });
		} catch (error) {
			console.error("Error executing action:", error);
			onActionComplete?.(selectedAction, { success: false, error });
		} finally {
			setIsExecuting(false);
			setSelectedAction(null);
			setCustomPrompt("");
		}
	};

	const handleCreatePR = async () => {
		if (!config) return;

		setIsExecuting(true);

		try {
			// This would typically create a PR with the current branch changes
			// For now, we'll simulate it by creating a PR with the work item details
			const prUrl = await azureService.createPullRequest(
				`[${workItem.workItemType}] ${workItem.title}`,
				workItem.description || "",
				`feature/${workItem.id}-${workItem.title.toLowerCase().replace(/\s+/g, "-")}`,
				"main",
			);

			// Update work item with PR link
			await azureService.addComment(
				workItem.id,
				`Pull request created: ${prUrl}`,
			);

			onActionComplete?.("pr", { success: true, prUrl });
		} catch (error) {
			console.error("Error creating PR:", error);
			onActionComplete?.("pr", { success: false, error });
		} finally {
			setIsExecuting(false);
		}
	};

	return (
		<div className="space-y-4">
			{/* Work Item Summary */}
			<Card>
				<CardHeader className="pb-3">
					<div className="flex items-center justify-between">
						<CardTitle className="text-sm font-medium">
							{workItem.title}
						</CardTitle>
						<Badge variant="outline">#{workItem.id}</Badge>
					</div>
				</CardHeader>
				<CardContent className="pt-0">
					<div className="space-y-2">
						<p className="text-xs text-muted-foreground line-clamp-2">
							{workItem.description}
						</p>
						<div className="flex items-center gap-2 text-xs text-muted-foreground">
							<Badge variant="secondary">{workItem.workItemType}</Badge>
							<Badge variant="secondary">{workItem.state}</Badge>
							<Badge variant="secondary">{workItem.priority}</Badge>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Action Selection */}
			<div className="space-y-3">
				<h4 className="text-sm font-medium text-foreground">Choose Action</h4>
				<div className="grid grid-cols-1 gap-2">
					{actionTemplates.map((action) => (
						<Button
							key={action.type}
							variant={selectedAction === action.type ? "default" : "outline"}
							className="h-auto p-3 justify-start"
							onClick={() => handleActionSelect(action.type)}
							disabled={isExecuting}
						>
							<div className="flex items-center gap-3 text-left">
								{action.icon}
								<div>
									<div className="font-medium text-sm">{action.title}</div>
									<div className="text-xs text-muted-foreground">
										{action.description}
									</div>
								</div>
							</div>
						</Button>
					))}
				</div>
			</div>

			{/* Custom Prompt */}
			{selectedAction && (
				<Card>
					<CardHeader className="pb-3">
						<CardTitle className="text-sm font-medium">
							Agent Prompt -{" "}
							{actionTemplates.find((t) => t.type === selectedAction)?.title}
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-3">
						<Textarea
							value={customPrompt}
							onChange={(e) => setCustomPrompt(e.target.value)}
							placeholder="Customize the agent prompt..."
							className="min-h-[200px] text-xs font-mono"
							disabled={isExecuting}
						/>
						<div className="flex items-center gap-2">
							<Button
								onClick={handleExecuteAction}
								disabled={isExecuting || !customPrompt.trim()}
								className="flex-1"
							>
								{isExecuting ? (
									<Loader2 className="h-4 w-4 animate-spin mr-2" />
								) : (
									<Send className="h-4 w-4 mr-2" />
								)}
								{isExecuting ? "Executing..." : "Execute with Agent"}
							</Button>
							<Button
								variant="outline"
								onClick={() => setSelectedAction(null)}
								disabled={isExecuting}
							>
								Cancel
							</Button>
						</div>
					</CardContent>
				</Card>
			)}

			{/* Quick PR Action */}
			{selectedAction === "pr" && (
				<Card>
					<CardHeader className="pb-3">
						<CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
					</CardHeader>
					<CardContent>
						<Button
							variant="outline"
							onClick={handleCreatePR}
							disabled={isExecuting}
							className="w-full"
						>
							{isExecuting ? (
								<Loader2 className="h-4 w-4 animate-spin mr-2" />
							) : (
								<GitBranch className="h-4 w-4 mr-2" />
							)}
							Create Pull Request Directly
						</Button>
					</CardContent>
				</Card>
			)}
		</div>
	);
}
