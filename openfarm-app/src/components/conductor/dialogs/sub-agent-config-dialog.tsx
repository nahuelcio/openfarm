"use client";

import { X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { AgentConfig, AgentProvider, SubAgentConfig } from "@/lib/store";

interface SubAgentConfigDialogProps {
	open: boolean;
	onClose: () => void;
	onSubmit: (config: SubAgentConfig) => void;
	subAgent?: SubAgentConfig;
	provider: AgentProvider;
	providerName: string;
	availableModels: Array<{ id: string; name: string }>;
	parentAgents: AgentConfig[];
}

const COMMON_SUB_AGENT_CAPABILITIES = [
	{
		id: "research",
		name: "Research",
		description: "Gather and analyze information",
	},
	{
		id: "code-generation",
		name: "Code Generation",
		description: "Write and generate code",
	},
	{ id: "testing", name: "Testing", description: "Create and run tests" },
	{
		id: "documentation",
		name: "Documentation",
		description: "Write and update documentation",
	},
	{ id: "debugging", name: "Debugging", description: "Find and fix issues" },
	{
		id: "optimization",
		name: "Optimization",
		description: "Improve performance and efficiency",
	},
	{
		id: "security",
		name: "Security",
		description: "Security analysis and fixes",
	},
	{
		id: "deployment",
		name: "Deployment",
		description: "Handle deployment tasks",
	},
];

export function SubAgentConfigDialog({
	open,
	onClose,
	onSubmit,
	subAgent,
	provider,
	providerName,
	availableModels,
	parentAgents,
}: SubAgentConfigDialogProps) {
	const [config, setConfig] = useState<Partial<SubAgentConfig>>(
		subAgent || {
			id: "",
			name: "",
			description: "",
			parentAgent: "",
			capability: "",
			enabled: true,
			model: "",
			customSettings: {},
		},
	);

	const isEdit = !!subAgent;

	const handleSubmit = () => {
		if (
			!config.id?.trim() ||
			!config.name?.trim() ||
			!config.parentAgent?.trim() ||
			!config.capability?.trim()
		) {
			alert("Please fill in all required fields");
			return;
		}

		const finalConfig: SubAgentConfig = {
			id: config.id!,
			name: config.name!,
			description: config.description || "",
			parentAgent: config.parentAgent!,
			capability: config.capability!,
			enabled: config.enabled ?? true,
			model: config.model,
			customSettings: config.customSettings || {},
		};

		onSubmit(finalConfig);
		onClose();
	};

	const updateCustomSetting = (key: string, value: unknown) => {
		setConfig({
			...config,
			customSettings: {
				...config.customSettings,
				[key]: value,
			},
		});
	};

	const applyCapabilityTemplate = (
		capability: (typeof COMMON_SUB_AGENT_CAPABILITIES)[0],
	) => {
		setConfig({
			...config,
			id: capability.id,
			name: capability.name,
			description: capability.description,
			capability: capability.id,
		});
	};

	return (
		<Dialog open={open} onOpenChange={onClose}>
			<DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>
						{isEdit ? "Edit Sub-Agent" : "Add Sub-Agent"} - {providerName}
					</DialogTitle>
					<DialogDescription>
						Create a specialized sub-agent that can handle specific tasks within
						a parent agent's workflow.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-6">
					{/* Capability Templates */}
					{!isEdit && (
						<div>
							<Label className="text-sm font-medium">Common Capabilities</Label>
							<div className="grid grid-cols-2 gap-2 mt-2">
								{COMMON_SUB_AGENT_CAPABILITIES.map((capability) => (
									<Button
										key={capability.id}
										variant="outline"
										size="sm"
										onClick={() => applyCapabilityTemplate(capability)}
										className="justify-start"
									>
										{capability.name}
									</Button>
								))}
							</div>
						</div>
					)}

					{/* Basic Configuration */}
					<div className="space-y-4">
						<div className="grid grid-cols-2 gap-4">
							<div>
								<Label htmlFor="subagent-id">Sub-Agent ID *</Label>
								<Input
									id="subagent-id"
									value={config.id || ""}
									onChange={(e) => setConfig({ ...config, id: e.target.value })}
									placeholder="code-researcher"
									disabled={isEdit}
								/>
							</div>
							<div>
								<Label htmlFor="subagent-name">Display Name *</Label>
								<Input
									id="subagent-name"
									value={config.name || ""}
									onChange={(e) =>
										setConfig({ ...config, name: e.target.value })
									}
									placeholder="Code Researcher"
								/>
							</div>
						</div>

						<div>
							<Label htmlFor="subagent-description">Description</Label>
							<Textarea
								id="subagent-description"
								value={config.description || ""}
								onChange={(e) =>
									setConfig({ ...config, description: e.target.value })
								}
								placeholder="Specializes in researching code patterns, libraries, and best practices..."
								rows={2}
							/>
						</div>

						<div className="grid grid-cols-2 gap-4">
							<div>
								<Label htmlFor="parent-agent">Parent Agent *</Label>
								<Select
									value={config.parentAgent || ""}
									onValueChange={(value) =>
										setConfig({ ...config, parentAgent: value })
									}
								>
									<SelectTrigger>
										<SelectValue placeholder="Select parent agent" />
									</SelectTrigger>
									<SelectContent>
										{parentAgents.map((agent) => (
											<SelectItem key={agent.id} value={agent.id}>
												{agent.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							<div>
								<Label htmlFor="capability">Capability *</Label>
								<Select
									value={config.capability || ""}
									onValueChange={(value) =>
										setConfig({ ...config, capability: value })
									}
								>
									<SelectTrigger>
										<SelectValue placeholder="Select capability" />
									</SelectTrigger>
									<SelectContent>
										{COMMON_SUB_AGENT_CAPABILITIES.map((capability) => (
											<SelectItem key={capability.id} value={capability.id}>
												{capability.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						</div>

						<div className="grid grid-cols-2 gap-4">
							<div>
								<Label htmlFor="subagent-model">Preferred Model</Label>
								<Select
									value={config.model || ""}
									onValueChange={(value) =>
										setConfig({ ...config, model: value })
									}
								>
									<SelectTrigger>
										<SelectValue placeholder="Use parent agent model" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="">Use parent agent model</SelectItem>
										{availableModels.map((model) => (
											<SelectItem key={model.id} value={model.id}>
												{model.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							<div className="flex items-center space-x-2">
								<Switch
									id="subagent-enabled"
									checked={config.enabled ?? true}
									onCheckedChange={(checked) =>
										setConfig({ ...config, enabled: checked })
									}
								/>
								<Label htmlFor="subagent-enabled">Enable this sub-agent</Label>
							</div>
						</div>
					</div>

					{/* Custom Settings */}
					<div>
						<Label className="text-sm font-medium">Custom Settings</Label>
						<div className="space-y-3 mt-2">
							<div>
								<Label htmlFor="max-tasks">Max Concurrent Tasks</Label>
								<Input
									id="max-tasks"
									type="number"
									min="1"
									max="10"
									value={String(config.customSettings?.maxTasks || "")}
									onChange={(e) =>
										updateCustomSetting("maxTasks", parseInt(e.target.value))
									}
									placeholder="3"
								/>
							</div>
							<div>
								<Label htmlFor="priority">Priority</Label>
								<Select
									value={String(config.customSettings?.priority || "normal")}
									onValueChange={(value) =>
										updateCustomSetting("priority", value)
									}
								>
									<SelectTrigger>
										<SelectValue placeholder="Select priority" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="low">Low</SelectItem>
										<SelectItem value="normal">Normal</SelectItem>
										<SelectItem value="high">High</SelectItem>
										<SelectItem value="critical">Critical</SelectItem>
									</SelectContent>
								</Select>
							</div>
							<div>
								<Label htmlFor="timeout">Timeout (seconds)</Label>
								<Input
									id="timeout"
									type="number"
									min="10"
									value={String(config.customSettings?.timeout || "")}
									onChange={(e) =>
										updateCustomSetting("timeout", parseInt(e.target.value))
									}
									placeholder="120"
								/>
							</div>
							<div>
								<Label htmlFor="retry-attempts">Retry Attempts</Label>
								<Input
									id="retry-attempts"
									type="number"
									min="0"
									max="5"
									value={String(config.customSettings?.retryAttempts || "")}
									onChange={(e) =>
										updateCustomSetting(
											"retryAttempts",
											parseInt(e.target.value),
										)
									}
									placeholder="2"
								/>
							</div>
						</div>
					</div>

					{/* Integration Notes */}
					<div className="p-3 bg-secondary/30 rounded-lg">
						<p className="text-xs text-muted-foreground">
							<strong>Integration Notes:</strong>
							<br />• This sub-agent will be available to the parent agent for
							specialized tasks
							<br />• The parent agent can delegate specific capabilities to
							this sub-agent
							<br />• Sub-agents inherit the parent's context and permissions
							<br />• Custom settings override the parent agent's settings when
							specified
						</p>
					</div>

					{/* Actions */}
					<div className="flex items-center justify-end gap-2 pt-4">
						<Button variant="ghost" onClick={onClose}>
							Cancel
						</Button>
						<Button onClick={handleSubmit}>
							{isEdit ? "Update Sub-Agent" : "Add Sub-Agent"}
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
