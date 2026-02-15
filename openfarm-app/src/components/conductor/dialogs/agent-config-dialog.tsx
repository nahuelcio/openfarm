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
import type { AgentConfig, AgentProvider } from "@/lib/store";

interface AgentConfigDialogProps {
	open: boolean;
	onClose: () => void;
	onSubmit: (config: AgentConfig) => void;
	agent?: AgentConfig;
	provider: AgentProvider;
	providerName: string;
	availableModels: Array<{ id: string; name: string }>;
}

const COMMON_AGENT_CAPABILITIES = [
	{
		id: "code-review",
		name: "Code Review",
		description: "Review and analyze code",
	},
	{ id: "debugging", name: "Debugging", description: "Find and fix bugs" },
	{
		id: "documentation",
		name: "Documentation",
		description: "Generate documentation",
	},
	{ id: "testing", name: "Testing", description: "Write and run tests" },
	{
		id: "refactoring",
		name: "Refactoring",
		description: "Improve code structure",
	},
	{
		id: "security",
		name: "Security",
		description: "Security analysis and fixes",
	},
];

export function AgentConfigDialog({
	open,
	onClose,
	onSubmit,
	agent,
	provider,
	providerName,
	availableModels,
}: AgentConfigDialogProps) {
	const [config, setConfig] = useState<Partial<AgentConfig>>(
		agent || {
			id: "",
			name: "",
			description: "",
			prompt: "",
			mode: "default",
			enabled: true,
			customSettings: {},
		},
	);

	const isEdit = !!agent;

	const handleSubmit = () => {
		if (!config.id?.trim() || !config.name?.trim()) {
			alert("Please fill in all required fields");
			return;
		}

		const finalConfig: AgentConfig = {
			id: config.id!,
			name: config.name!,
			description: config.description || "",
			prompt: config.prompt,
			mode: config.mode || "default",
			enabled: config.enabled ?? true,
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

	return (
		<Dialog open={open} onOpenChange={onClose}>
			<DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>
						{isEdit ? "Edit Custom Agent" : "Add Custom Agent"} - {providerName}
					</DialogTitle>
					<DialogDescription>
						Create a custom agent with specific capabilities and behavior for
						this provider.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-6">
					{/* Basic Configuration */}
					<div className="space-y-4">
						<div className="grid grid-cols-2 gap-4">
							<div>
								<Label htmlFor="agent-id">Agent ID *</Label>
								<Input
									id="agent-id"
									value={config.id || ""}
									onChange={(e) => setConfig({ ...config, id: e.target.value })}
									placeholder="code-reviewer"
									disabled={isEdit}
								/>
							</div>
							<div>
								<Label htmlFor="agent-name">Display Name *</Label>
								<Input
									id="agent-name"
									value={config.name || ""}
									onChange={(e) =>
										setConfig({ ...config, name: e.target.value })
									}
									placeholder="Code Reviewer"
								/>
							</div>
						</div>

						<div>
							<Label htmlFor="agent-description">Description</Label>
							<Textarea
								id="agent-description"
								value={config.description || ""}
								onChange={(e) =>
									setConfig({ ...config, description: e.target.value })
								}
								placeholder="Specializes in reviewing code for best practices and potential issues..."
								rows={2}
							/>
						</div>

						<div className="grid grid-cols-2 gap-4">
							<div>
								<Label htmlFor="agent-mode">Mode</Label>
								<Select
									value={config.mode || "default"}
									onValueChange={(value) =>
										setConfig({ ...config, mode: value })
									}
								>
									<SelectTrigger>
										<SelectValue placeholder="Select mode" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="default">Default</SelectItem>
										<SelectItem value="precise">Precise</SelectItem>
										<SelectItem value="creative">Creative</SelectItem>
										<SelectItem value="fast">Fast</SelectItem>
									</SelectContent>
								</Select>
							</div>
							<div>
								<Label htmlFor="agent-model">Preferred Model</Label>
								<Select
									value={String(config.customSettings?.preferredModel || "")}
									onValueChange={(value) =>
										updateCustomSetting("preferredModel", value)
									}
								>
									<SelectTrigger>
										<SelectValue placeholder="Use provider default" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="">Use provider default</SelectItem>
										{availableModels.map((model) => (
											<SelectItem key={model.id} value={model.id}>
												{model.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						</div>

						<div className="flex items-center space-x-2">
							<Switch
								id="agent-enabled"
								checked={config.enabled ?? true}
								onCheckedChange={(checked) =>
									setConfig({ ...config, enabled: checked })
								}
							/>
							<Label htmlFor="agent-enabled">Enable this agent</Label>
						</div>
					</div>

					{/* Custom Prompt */}
					<div>
						<Label htmlFor="agent-prompt">Custom System Prompt</Label>
						<Textarea
							id="agent-prompt"
							value={config.prompt || ""}
							onChange={(e) => setConfig({ ...config, prompt: e.target.value })}
							placeholder="You are a specialized code reviewer. Focus on identifying potential bugs, performance issues, and maintainability problems..."
							rows={4}
						/>
						<p className="text-xs text-muted-foreground mt-1">
							Leave empty to use the provider's default system prompt
						</p>
					</div>

					{/* Common Capabilities */}
					<div>
						<Label className="text-sm font-medium">Common Capabilities</Label>
						<div className="grid grid-cols-2 gap-2 mt-2">
							{COMMON_AGENT_CAPABILITIES.map((capability) => (
								<Button
									key={capability.id}
									variant="outline"
									size="sm"
									onClick={() => {
										setConfig({
											...config,
											id: capability.id,
											name: capability.name,
											description: capability.description,
										});
									}}
									className="justify-start text-xs"
								>
									{capability.name}
								</Button>
							))}
						</div>
					</div>

					{/* Custom Settings */}
					<div>
						<Label className="text-sm font-medium">Custom Settings</Label>
						<div className="space-y-3 mt-2">
							<div>
								<Label htmlFor="temperature">Temperature (0.0-1.0)</Label>
								<Input
									id="temperature"
									type="number"
									step="0.1"
									min="0"
									max="1"
									value={String(config.customSettings?.temperature || "")}
									onChange={(e) =>
										updateCustomSetting(
											"temperature",
											parseFloat(e.target.value),
										)
									}
									placeholder="0.2"
								/>
							</div>
							<div>
								<Label htmlFor="max-tokens">Max Tokens</Label>
								<Input
									id="max-tokens"
									type="number"
									value={String(config.customSettings?.maxTokens || "")}
									onChange={(e) =>
										updateCustomSetting("maxTokens", parseInt(e.target.value))
									}
									placeholder="4096"
								/>
							</div>
							<div>
								<Label htmlFor="timeout">Timeout (seconds)</Label>
								<Input
									id="timeout"
									type="number"
									value={String(config.customSettings?.timeout || "")}
									onChange={(e) =>
										updateCustomSetting("timeout", parseInt(e.target.value))
									}
									placeholder="60"
								/>
							</div>
						</div>
					</div>

					{/* Actions */}
					<div className="flex items-center justify-end gap-2 pt-4">
						<Button variant="ghost" onClick={onClose}>
							Cancel
						</Button>
						<Button onClick={handleSubmit}>
							{isEdit ? "Update Agent" : "Add Agent"}
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
