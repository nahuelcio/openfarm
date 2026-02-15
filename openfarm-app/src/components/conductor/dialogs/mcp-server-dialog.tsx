"use client";

import { Plus, Trash2, X } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { AgentProvider, McpServerConfig } from "@/lib/store";
import { cn } from "@/lib/utils";

interface McpServerDialogProps {
	open: boolean;
	onClose: () => void;
	onSubmit: (config: McpServerConfig) => void;
	mcpServer?: McpServerConfig;
	provider: AgentProvider;
	providerName: string;
}

const COMMON_MCP_PACKAGES = [
	{
		id: "filesystem",
		name: "Filesystem",
		command: "@modelcontextprotocol/server-filesystem",
	},
	{ id: "git", name: "Git", command: "@modelcontextprotocol/server-git" },
	{ id: "fetch", name: "Fetch", command: "@modelcontextprotocol/server-fetch" },
	{
		id: "brave-search",
		name: "Brave Search",
		command: "@modelcontextprotocol/server-brave-search",
	},
	{
		id: "memory",
		name: "Memory",
		command: "@modelcontextprotocol/server-memory",
	},
	{ id: "context7", name: "Context7", command: "@context7/mcp-server" },
];

export function McpServerDialog({
	open,
	onClose,
	onSubmit,
	mcpServer,
	provider,
	providerName,
}: McpServerDialogProps) {
	const [config, setConfig] = useState<Partial<McpServerConfig>>(
		mcpServer || {
			id: "",
			name: "",
			command: "npx",
			args: [],
			env: {},
			enabled: true,
			provider,
			installedAt: new Date().toISOString(),
		},
	);

	const [envVars, setEnvVars] = useState<Array<{ key: string; value: string }>>(
		mcpServer
			? Object.entries(mcpServer.env || {}).map(([key, value]) => ({
					key,
					value,
				}))
			: [{ key: "", value: "" }],
	);

	const [args, setArgs] = useState<string[]>(mcpServer?.args || []);

	const isEdit = !!mcpServer;

	const handleSubmit = () => {
		if (!config.id?.trim() || !config.name?.trim()) {
			alert("Please fill in all required fields");
			return;
		}

		const env: Record<string, string> = {};
		envVars.forEach(({ key, value }) => {
			if (key.trim()) {
				env[key.trim()] = value;
			}
		});

		const finalConfig: McpServerConfig = {
			id: config.id!,
			name: config.name!,
			command: config.command || "npx",
			args: args.filter((arg) => arg.trim()),
			env,
			enabled: config.enabled ?? true,
			provider,
			installedAt: mcpServer?.installedAt || new Date().toISOString(),
		};

		onSubmit(finalConfig);
		onClose();
	};

	const addEnvVar = () => {
		setEnvVars([...envVars, { key: "", value: "" }]);
	};

	const updateEnvVar = (
		index: number,
		field: "key" | "value",
		value: string,
	) => {
		const updated = envVars.map((envVar, i) =>
			i === index ? { ...envVar, [field]: value } : envVar,
		);
		setEnvVars(updated);
	};

	const removeEnvVar = (index: number) => {
		setEnvVars(envVars.filter((_, i) => i !== index));
	};

	const addArg = () => {
		setArgs([...args, ""]);
	};

	const updateArg = (index: number, value: string) => {
		const updated = args.map((arg, i) => (i === index ? value : arg));
		setArgs(updated);
	};

	const removeArg = (index: number) => {
		setArgs(args.filter((_, i) => i !== index));
	};

	const selectCommonPackage = (pkg: (typeof COMMON_MCP_PACKAGES)[0]) => {
		setConfig({
			...config,
			id: pkg.id,
			name: pkg.name,
			args: [pkg.command],
		});
	};

	return (
		<Dialog open={open} onOpenChange={onClose}>
			<DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>
						{isEdit ? "Edit MCP Server" : "Add MCP Server"} - {providerName}
					</DialogTitle>
					<DialogDescription>
						Configure an MCP server for this provider. MCP servers extend agent
						capabilities with additional tools and resources.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-6">
					{/* Common Packages */}
					{!isEdit && (
						<div>
							<Label className="text-sm font-medium">Common MCP Packages</Label>
							<div className="grid grid-cols-2 gap-2 mt-2">
								{COMMON_MCP_PACKAGES.map((pkg) => (
									<Button
										key={pkg.id}
										variant="outline"
										size="sm"
										onClick={() => selectCommonPackage(pkg)}
										className="justify-start"
									>
										{pkg.name}
									</Button>
								))}
							</div>
						</div>
					)}

					{/* Basic Configuration */}
					<div className="space-y-4">
						<div className="grid grid-cols-2 gap-4">
							<div>
								<Label htmlFor="mcp-id">Server ID *</Label>
								<Input
									id="mcp-id"
									value={config.id || ""}
									onChange={(e) => setConfig({ ...config, id: e.target.value })}
									placeholder="filesystem"
									disabled={isEdit}
								/>
							</div>
							<div>
								<Label htmlFor="mcp-name">Display Name *</Label>
								<Input
									id="mcp-name"
									value={config.name || ""}
									onChange={(e) =>
										setConfig({ ...config, name: e.target.value })
									}
									placeholder="Filesystem Access"
								/>
							</div>
						</div>

						<div>
							<Label htmlFor="mcp-command">Command</Label>
							<Input
								id="mcp-command"
								value={config.command || ""}
								onChange={(e) =>
									setConfig({ ...config, command: e.target.value })
								}
								placeholder="npx"
							/>
						</div>

						<div className="flex items-center space-x-2">
							<Switch
								id="mcp-enabled"
								checked={config.enabled ?? true}
								onCheckedChange={(checked) =>
									setConfig({ ...config, enabled: checked })
								}
							/>
							<Label htmlFor="mcp-enabled">Enable this MCP server</Label>
						</div>
					</div>

					{/* Arguments */}
					<div>
						<div className="flex items-center justify-between mb-2">
							<Label className="text-sm font-medium">Arguments</Label>
							<Button variant="outline" size="sm" onClick={addArg}>
								<Plus className="h-3 w-3 mr-1" />
								Add Argument
							</Button>
						</div>
						<div className="space-y-2">
							{args.map((arg, index) => (
								<div key={index} className="flex items-center gap-2">
									<Input
										value={arg}
										onChange={(e) => updateArg(index, e.target.value)}
										placeholder="Argument value"
										className="font-mono text-sm"
									/>
									<Button
										variant="ghost"
										size="sm"
										onClick={() => removeArg(index)}
									>
										<Trash2 className="h-3 w-3" />
									</Button>
								</div>
							))}
						</div>
					</div>

					{/* Environment Variables */}
					<div>
						<div className="flex items-center justify-between mb-2">
							<Label className="text-sm font-medium">
								Environment Variables
							</Label>
							<Button variant="outline" size="sm" onClick={addEnvVar}>
								<Plus className="h-3 w-3 mr-1" />
								Add Variable
							</Button>
						</div>
						<div className="space-y-2">
							{envVars.map((envVar, index) => (
								<div key={index} className="flex items-center gap-2">
									<Input
										value={envVar.key}
										onChange={(e) => updateEnvVar(index, "key", e.target.value)}
										placeholder="Variable name"
										className="font-mono text-sm"
									/>
									<Input
										value={envVar.value}
										onChange={(e) =>
											updateEnvVar(index, "value", e.target.value)
										}
										placeholder="Variable value"
										className="font-mono text-sm"
									/>
									<Button
										variant="ghost"
										size="sm"
										onClick={() => removeEnvVar(index)}
									>
										<Trash2 className="h-3 w-3" />
									</Button>
								</div>
							))}
						</div>
					</div>

					{/* Provider-specific hints */}
					<div className="p-3 bg-secondary/30 rounded-lg">
						<p className="text-xs text-muted-foreground">
							<strong>Provider: {providerName}</strong>
							<br />
							{provider === "claude-code" &&
								"Anthropic API key will be automatically available as ANTHROPIC_API_KEY"}
							{provider === "codex" &&
								"GitHub token will be automatically available as GITHUB_TOKEN"}
							{provider === "opencode" &&
								"OpenAI API key will be automatically available as OPENAI_API_KEY"}
						</p>
					</div>

					{/* Actions */}
					<div className="flex items-center justify-end gap-2 pt-4">
						<Button variant="ghost" onClick={onClose}>
							Cancel
						</Button>
						<Button onClick={handleSubmit}>
							{isEdit ? "Update MCP Server" : "Add MCP Server"}
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
