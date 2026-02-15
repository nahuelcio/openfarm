"use client";

import {
	Bot,
	ChevronDown,
	ChevronRight,
	Database,
	Edit,
	Globe,
	Plus,
	Settings,
	Trash2,
	Users,
	Webhook,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type {
	AgentConfig,
	HookConfig,
	McpServerConfig,
	ProviderConfig,
	SubAgentConfig,
} from "@/lib/store";
import { cn } from "@/lib/utils";

interface ProviderSettingsCardProps {
	provider: ProviderConfig;
	onUpdate: (provider: ProviderConfig) => void;
	onAddMcpServer: () => void;
	onEditMcpServer: (mcp: McpServerConfig) => void;
	onDeleteMcpServer: (mcpId: string) => void;
	onAddAgent: () => void;
	onEditAgent: (agent: AgentConfig) => void;
	onDeleteAgent: (agentId: string) => void;
	onAddHook: () => void;
	onEditHook: (hook: HookConfig) => void;
	onDeleteHook: (hookId: string) => void;
	onAddSubAgent: () => void;
	onEditSubAgent: (subAgent: SubAgentConfig) => void;
	onDeleteSubAgent: (subAgentId: string) => void;
}

interface SectionProps {
	title: string;
	icon: React.ComponentType<any>;
	children: React.ReactNode;
	defaultOpen?: boolean;
}

function Section({
	title,
	icon: Icon,
	children,
	defaultOpen = false,
}: SectionProps) {
	const [open, setOpen] = useState(defaultOpen);

	return (
		<div className="border border-border rounded-lg overflow-hidden">
			<button
				onClick={() => setOpen(!open)}
				className="w-full flex items-center gap-2 px-4 py-3 bg-secondary/30 hover:bg-secondary/50 transition-colors"
			>
				<Icon className="h-4 w-4 text-muted-foreground" />
				<span className="text-sm font-medium text-foreground">{title}</span>
				{open ? (
					<ChevronDown className="h-4 w-4 text-muted-foreground ml-auto" />
				) : (
					<ChevronRight className="h-4 w-4 text-muted-foreground ml-auto" />
				)}
			</button>
			{open && <div className="p-4 space-y-3">{children}</div>}
		</div>
	);
}

export function ProviderSettingsCard({
	provider,
	onUpdate,
	onAddMcpServer,
	onEditMcpServer,
	onDeleteMcpServer,
	onAddAgent,
	onEditAgent,
	onDeleteAgent,
	onAddHook,
	onEditHook,
	onDeleteHook,
	onAddSubAgent,
	onEditSubAgent,
	onDeleteSubAgent,
}: ProviderSettingsCardProps) {
	const updateProvider = (updates: Partial<ProviderConfig>) => {
		onUpdate({ ...provider, ...updates });
	};

	const updateCustomSetting = (key: string, value: unknown) => {
		onUpdate({
			...provider,
			customSettings: {
				...provider.customSettings,
				[key]: value,
			},
		});
	};

	return (
		<div className="space-y-4">
			{/* Provider Header */}
			<div className="flex items-center gap-3 p-4 border border-border rounded-lg bg-card">
				<div
					className="h-10 w-10 rounded-lg flex items-center justify-center"
					style={{ backgroundColor: `${provider.color}15` }}
				>
					<Settings className="h-5 w-5" style={{ color: provider.color }} />
				</div>
				<div className="flex-1">
					<h3 className="text-lg font-semibold text-foreground">
						{provider.name}
					</h3>
					<p className="text-sm text-muted-foreground">
						{provider.description}
					</p>
				</div>
				<Switch
					checked={provider.connected}
					onCheckedChange={(checked) => updateProvider({ connected: checked })}
				/>
			</div>

			<ScrollArea className="h-[600px]">
				<div className="space-y-4 pr-4">
					{/* Basic Configuration */}
					<Section title="Basic Configuration" icon={Settings} defaultOpen>
						<div className="space-y-3">
							<div>
								<Label htmlFor="api-key">API Key</Label>
								<Input
									id="api-key"
									type="password"
									value={provider.apiKey}
									onChange={(e) => updateProvider({ apiKey: e.target.value })}
									placeholder="Enter API key..."
									className="font-mono text-sm"
								/>
							</div>
							<div>
								<Label htmlFor="default-model">Default Model</Label>
								<Select
									value={provider.defaultModel}
									onValueChange={(value) =>
										updateProvider({ defaultModel: value })
									}
								>
									<SelectTrigger>
										<SelectValue placeholder="Select model" />
									</SelectTrigger>
									<SelectContent>
										{provider.models.map((model) => (
											<SelectItem key={model.id} value={model.id}>
												{model.name} - {model.description}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						</div>
					</Section>

					{/* MCP Servers */}
					<Section title="MCP Servers" icon={Database}>
						<div className="space-y-2">
							{provider.mcpServers?.map((mcp) => (
								<div
									key={mcp.id}
									className="flex items-center justify-between p-3 border border-border rounded-lg bg-secondary/30"
								>
									<div className="flex items-center gap-2">
										<Database className="h-4 w-4 text-muted-foreground" />
										<div>
											<div className="text-sm font-medium text-foreground">
												{mcp.name}
											</div>
											<div className="text-xs text-muted-foreground">
												{mcp.command}
											</div>
										</div>
									</div>
									<div className="flex items-center gap-1">
										<Switch
											checked={mcp.enabled}
											onCheckedChange={(checked) => {
												const updatedMcps = provider.mcpServers?.map((m) =>
													m.id === mcp.id ? { ...m, enabled: checked } : m,
												);
												updateProvider({ mcpServers: updatedMcps });
											}}
										/>
										<Button
											variant="ghost"
											size="sm"
											onClick={() => onEditMcpServer(mcp)}
										>
											<Edit className="h-3 w-3" />
										</Button>
										<Button
											variant="ghost"
											size="sm"
											onClick={() => onDeleteMcpServer(mcp.id)}
										>
											<Trash2 className="h-3 w-3" />
										</Button>
									</div>
								</div>
							))}
							<Button
								variant="outline"
								size="sm"
								onClick={onAddMcpServer}
								className="w-full"
							>
								<Plus className="h-4 w-4 mr-2" />
								Add MCP Server
							</Button>
						</div>
					</Section>

					{/* Custom Agents */}
					<Section title="Custom Agents" icon={Bot}>
						<div className="space-y-2">
							{provider.customAgents?.map((agent) => (
								<div
									key={agent.id}
									className="flex items-center justify-between p-3 border border-border rounded-lg bg-secondary/30"
								>
									<div className="flex items-center gap-2">
										<Bot className="h-4 w-4 text-muted-foreground" />
										<div>
											<div className="text-sm font-medium text-foreground">
												{agent.name}
											</div>
											<div className="text-xs text-muted-foreground">
												{agent.description}
											</div>
										</div>
									</div>
									<div className="flex items-center gap-1">
										<Switch
											checked={agent.enabled}
											onCheckedChange={(checked) => {
												const updatedAgents = provider.customAgents?.map((a) =>
													a.id === agent.id ? { ...a, enabled: checked } : a,
												);
												updateProvider({ customAgents: updatedAgents });
											}}
										/>
										<Button
											variant="ghost"
											size="sm"
											onClick={() => onEditAgent(agent)}
										>
											<Edit className="h-3 w-3" />
										</Button>
										<Button
											variant="ghost"
											size="sm"
											onClick={() => onDeleteAgent(agent.id)}
										>
											<Trash2 className="h-3 w-3" />
										</Button>
									</div>
								</div>
							))}
							<Button
								variant="outline"
								size="sm"
								onClick={onAddAgent}
								className="w-full"
							>
								<Plus className="h-4 w-4 mr-2" />
								Add Custom Agent
							</Button>
						</div>
					</Section>

					{/* Hooks */}
					<Section title="Hooks" icon={Webhook}>
						<div className="space-y-2">
							{provider.hooks?.map((hook) => (
								<div
									key={hook.id}
									className="flex items-center justify-between p-3 border border-border rounded-lg bg-secondary/30"
								>
									<div className="flex items-center gap-2">
										<Webhook className="h-4 w-4 text-muted-foreground" />
										<div>
											<div className="text-sm font-medium text-foreground">
												{hook.name}
											</div>
											<div className="text-xs text-muted-foreground">
												{hook.type} hook
											</div>
										</div>
									</div>
									<div className="flex items-center gap-1">
										<Switch
											checked={hook.enabled}
											onCheckedChange={(checked) => {
												const updatedHooks = provider.hooks?.map((h) =>
													h.id === hook.id ? { ...h, enabled: checked } : h,
												);
												updateProvider({ hooks: updatedHooks });
											}}
										/>
										<Button
											variant="ghost"
											size="sm"
											onClick={() => onEditHook(hook)}
										>
											<Edit className="h-3 w-3" />
										</Button>
										<Button
											variant="ghost"
											size="sm"
											onClick={() => onDeleteHook(hook.id)}
										>
											<Trash2 className="h-3 w-3" />
										</Button>
									</div>
								</div>
							))}
							<Button
								variant="outline"
								size="sm"
								onClick={onAddHook}
								className="w-full"
							>
								<Plus className="h-4 w-4 mr-2" />
								Add Hook
							</Button>
						</div>
					</Section>

					{/* Sub-Agents */}
					<Section title="Sub-Agents" icon={Users}>
						<div className="space-y-2">
							{provider.subAgents?.map((subAgent) => (
								<div
									key={subAgent.id}
									className="flex items-center justify-between p-3 border border-border rounded-lg bg-secondary/30"
								>
									<div className="flex items-center gap-2">
										<Users className="h-4 w-4 text-muted-foreground" />
										<div>
											<div className="text-sm font-medium text-foreground">
												{subAgent.name}
											</div>
											<div className="text-xs text-muted-foreground">
												{subAgent.capability}
											</div>
										</div>
									</div>
									<div className="flex items-center gap-1">
										<Switch
											checked={subAgent.enabled}
											onCheckedChange={(checked) => {
												const updatedSubAgents = provider.subAgents?.map((s) =>
													s.id === subAgent.id ? { ...s, enabled: checked } : s,
												);
												updateProvider({ subAgents: updatedSubAgents });
											}}
										/>
										<Button
											variant="ghost"
											size="sm"
											onClick={() => onEditSubAgent(subAgent)}
										>
											<Edit className="h-3 w-3" />
										</Button>
										<Button
											variant="ghost"
											size="sm"
											onClick={() => onDeleteSubAgent(subAgent.id)}
										>
											<Trash2 className="h-3 w-3" />
										</Button>
									</div>
								</div>
							))}
							<Button
								variant="outline"
								size="sm"
								onClick={onAddSubAgent}
								className="w-full"
							>
								<Plus className="h-4 w-4 mr-2" />
								Add Sub-Agent
							</Button>
						</div>
					</Section>

					{/* Custom Settings */}
					<Section title="Custom Settings" icon={Settings}>
						<div className="space-y-3">
							<div>
								<Label htmlFor="timeout">Request Timeout (ms)</Label>
								<Input
									id="timeout"
									type="number"
									value={String(provider.customSettings?.timeout || 30000)}
									onChange={(e) =>
										updateCustomSetting("timeout", parseInt(e.target.value))
									}
									placeholder="30000"
								/>
							</div>
							<div>
								<Label htmlFor="retry-attempts">Retry Attempts</Label>
								<Input
									id="retry-attempts"
									type="number"
									value={String(provider.customSettings?.retryAttempts || 3)}
									onChange={(e) =>
										updateCustomSetting(
											"retryAttempts",
											parseInt(e.target.value),
										)
									}
									placeholder="3"
								/>
							</div>
							<div>
								<Label htmlFor="custom-endpoint">Custom Endpoint</Label>
								<Input
									id="custom-endpoint"
									value={String(provider.customSettings?.customEndpoint || "")}
									onChange={(e) =>
										updateCustomSetting("customEndpoint", e.target.value)
									}
									placeholder="https://api.example.com"
								/>
							</div>
							<div>
								<Label htmlFor="provider-notes">Notes</Label>
								<Textarea
									id="provider-notes"
									value={String(provider.customSettings?.notes || "")}
									onChange={(e) =>
										updateCustomSetting("notes", e.target.value)
									}
									placeholder="Add any notes about this provider..."
									rows={3}
								/>
							</div>
						</div>
					</Section>
				</div>
			</ScrollArea>
		</div>
	);
}
