"use client";

import {
	Check,
	ChevronDown,
	Eye,
	EyeOff,
	Loader2,
	Settings,
	X,
	Zap,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type {
	AgentConfig,
	AgentProvider,
	AppSettings,
	HookConfig,
	McpServerConfig,
	ProviderConfig,
	SubAgentConfig,
} from "@/lib/store";
import { cn } from "@/lib/utils";
import { readCurrentProviderConfiguration, listAllAgents } from "@/lib/config-reader";
import { AgentConfigDialog } from "./dialogs/agent-config-dialog";
import { HookConfigDialog } from "./dialogs/hook-config-dialog";
import { McpServerDialog } from "./dialogs/mcp-server-dialog";
import { SubAgentConfigDialog } from "./dialogs/sub-agent-config-dialog";
import { ProviderSettingsCard } from "./provider-settings/provider-settings-card";

// --- Simple Provider Card (for basic view) ---

function SimpleProviderCard({
	provider,
	onToggle,
	onApiKeyChange,
	onDefaultModelChange,
}: {
	provider: ProviderConfig;
	onToggle: () => void;
	onApiKeyChange: (key: string) => void;
	onDefaultModelChange: (model: string) => void;
}) {
	const [showKey, setShowKey] = useState(false);
	const [testing, setTesting] = useState(false);
	const [testResult, setTestResult] = useState<"success" | "error" | null>(
		null,
	);

	const handleTest = () => {
		setTesting(true);
		setTestResult(null);
		setTimeout(() => {
			setTesting(false);
			setTestResult(provider.apiKey ? "success" : "error");
		}, 1500);
	};

	return (
		<div
			className={cn(
				"rounded-xl border p-4 transition-colors",
				provider.connected
					? "border-border bg-card"
					: "border-border/50 bg-secondary/30 opacity-75",
			)}
		>
			{/* Header */}
			<div className="flex items-center justify-between mb-3">
				<div className="flex items-center gap-3">
					<div
						className="h-8 w-8 rounded-lg flex items-center justify-center"
						style={{ backgroundColor: `${provider.color}15` }}
					>
						<Zap className="h-4 w-4" style={{ color: provider.color }} />
					</div>
					<div>
						<h3 className="text-sm font-semibold text-foreground">
							{provider.name}
						</h3>
						<p className="text-[11px] text-muted-foreground leading-relaxed">
							{provider.description}
						</p>
					</div>
				</div>
				<Switch checked={provider.connected} onCheckedChange={onToggle} />
			</div>

			{provider.connected && (
				<div className="space-y-3 pt-2 border-t border-border/50">
					{/* API Key */}
					<div>
						<label className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium mb-1 block">
							API Key
						</label>
						<div className="flex items-center gap-2">
							<div className="flex-1 flex items-center rounded-lg border border-border bg-background overflow-hidden">
								<input
									type={showKey ? "text" : "password"}
									value={provider.apiKey}
									onChange={(e) => onApiKeyChange(e.target.value)}
									placeholder="Enter API key..."
									className="flex-1 bg-transparent text-xs font-mono text-foreground px-3 py-2 focus:outline-none placeholder:text-muted-foreground"
								/>
								<button
									className="px-2 text-muted-foreground hover:text-foreground transition-colors"
									onClick={() => setShowKey(!showKey)}
									type="button"
								>
									{showKey ? (
										<EyeOff className="h-3.5 w-3.5" />
									) : (
										<Eye className="h-3.5 w-3.5" />
									)}
								</button>
							</div>
							<Button
								variant="outline"
								size="sm"
								className="h-8 text-xs gap-1.5"
								onClick={handleTest}
								disabled={testing || !provider.apiKey}
							>
								{testing ? (
									<Loader2 className="h-3 w-3 animate-spin" />
								) : testResult === "success" ? (
									<Check className="h-3 w-3 text-agent-active" />
								) : null}
								Test
							</Button>
						</div>
						{testResult === "success" && (
							<p className="text-[10px] text-agent-active mt-1">
								Connection successful
							</p>
						)}
						{testResult === "error" && (
							<p className="text-[10px] text-agent-error mt-1">
								Connection failed. Check your API key.
							</p>
						)}
					</div>

					{/* Default Model */}
					<div>
						<label className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium mb-1 block">
							Default Model
						</label>
						<div className="relative">
							<select
								value={provider.defaultModel}
								onChange={(e) => onDefaultModelChange(e.target.value)}
								className="w-full appearance-none rounded-lg border border-border bg-background text-xs text-foreground px-3 py-2 pr-8 focus:outline-none focus:border-primary/40"
							>
								{provider.models.map((m) => (
									<option key={m.id} value={m.id}>
										{m.name} - {m.description}
									</option>
								))}
							</select>
							<ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

// --- Settings Panel ---

interface SettingsPanelProps {
	open: boolean;
	onClose: () => void;
	settings: AppSettings;
	onSettingsChange: (settings: AppSettings) => void;
}

export function AdvancedSettingsPanel({
	open,
	onClose,
	settings,
	onSettingsChange,
}: SettingsPanelProps) {
	if (!open) return null;

	// Dialog states
	const [mcpDialogOpen, setMcpDialogOpen] = useState(false);
	const [agentDialogOpen, setAgentDialogOpen] = useState(false);
	const [hookDialogOpen, setHookDialogOpen] = useState(false);
	const [subAgentDialogOpen, setSubAgentDialogOpen] = useState(false);

	// Current editing states
	const [selectedProvider, setSelectedProvider] =
		useState<AgentProvider | undefined>(undefined);
	const [editingMcpServer, setEditingMcpServer] =
		useState<McpServerConfig | undefined>(undefined);
	const [editingAgent, setEditingAgent] = useState<AgentConfig | undefined>(undefined);
	const [editingHook, setEditingHook] = useState<HookConfig | undefined>(undefined);
	const [editingSubAgent, setEditingSubAgent] = useState<SubAgentConfig | undefined>(undefined);

	const updateProvider = (
		providerId: AgentProvider,
		updater: (p: ProviderConfig) => ProviderConfig,
	) => {
		onSettingsChange({
			...settings,
			providers: settings.providers.map((p) =>
				p.id === providerId ? updater(p) : p,
			),
		});
	};

	// MCP Server handlers
	const handleAddMcpServer = (providerId: AgentProvider) => {
		setSelectedProvider(providerId);
		setEditingMcpServer(undefined);
		setMcpDialogOpen(true);
	};

	const handleEditMcpServer = (
		providerId: AgentProvider,
		mcp: McpServerConfig,
	) => {
		setSelectedProvider(providerId);
		setEditingMcpServer(mcp);
		setMcpDialogOpen(true);
	};

	const handleMcpServerSubmit = (config: McpServerConfig) => {
		if (!selectedProvider) return;

		updateProvider(selectedProvider, (provider) => ({
			...provider,
			mcpServers: editingMcpServer
				? provider.mcpServers?.map((m) => m.id === config.id ? config : m) || [config]
				: [...(provider.mcpServers || []), config],
		}));
	};

	const handleDeleteMcpServer = (providerId: AgentProvider, mcpId: string) => {
		updateProvider(providerId, (provider) => ({
			...provider,
			mcpServers: provider.mcpServers?.filter((m) => m.id !== mcpId) || [],
		}));
	};

	// Agent handlers
	const handleAddAgent = (providerId: AgentProvider) => {
		setSelectedProvider(providerId);
		setEditingAgent(undefined);
		setAgentDialogOpen(true);
	};

	const handleEditAgent = (providerId: AgentProvider, agent: AgentConfig) => {
		setSelectedProvider(providerId);
		setEditingAgent(agent);
		setAgentDialogOpen(true);
	};

	const handleAgentSubmit = (config: AgentConfig) => {
		if (!selectedProvider) return;

		updateProvider(selectedProvider, (provider) => ({
			...provider,
			customAgents: editingAgent
				? provider.customAgents?.map((a) => a.id === config.id ? config : a) || [config]
				: [...(provider.customAgents || []), config],
		}));
	};

	const handleDeleteAgent = (providerId: AgentProvider, agentId: string) => {
		updateProvider(providerId, (provider) => ({
			...provider,
			customAgents:
				provider.customAgents?.filter((a) => a.id !== agentId) || [],
		}));
	};

	// Hook handlers
	const handleAddHook = (providerId: AgentProvider) => {
		setSelectedProvider(providerId);
		setEditingHook(undefined);
		setHookDialogOpen(true);
	};

	const handleEditHook = (providerId: AgentProvider, hook: HookConfig) => {
		setSelectedProvider(providerId);
		setEditingHook(hook);
		setHookDialogOpen(true);
	};

	const handleHookSubmit = (config: HookConfig) => {
		if (!selectedProvider) return;

		updateProvider(selectedProvider, (provider) => ({
			...provider,
			hooks: editingHook
				? provider.hooks?.map((h) => (h.id === config.id ? config : h)) || [
						config,
					]
				: [...(provider.hooks || []), config],
		}));
	};

	const handleDeleteHook = (providerId: AgentProvider, hookId: string) => {
		updateProvider(providerId, (provider) => ({
			...provider,
			hooks: provider.hooks?.filter((h) => h.id !== hookId) || [],
		}));
	};

	// Sub-Agent handlers
	const handleAddSubAgent = (providerId: AgentProvider) => {
		setSelectedProvider(providerId);
		setEditingSubAgent(undefined);
		setSubAgentDialogOpen(true);
	};

	const handleEditSubAgent = (
		providerId: AgentProvider,
		subAgent: SubAgentConfig,
	) => {
		setSelectedProvider(providerId);
		setEditingSubAgent(subAgent);
		setSubAgentDialogOpen(true);
	};

	const handleSubAgentSubmit = (config: SubAgentConfig) => {
		if (!selectedProvider) return;

		updateProvider(selectedProvider, (provider) => ({
			...provider,
			subAgents: editingSubAgent
				? provider.subAgents?.map((s) => (s.id === config.id ? config : s)) || [
						config,
					]
				: [...(provider.subAgents || []), config],
		}));
	};

	const handleDeleteSubAgent = (
		providerId: AgentProvider,
		subAgentId: string,
	) => {
		updateProvider(providerId, (provider) => ({
			...provider,
			subAgents: provider.subAgents?.filter((s) => s.id !== subAgentId) || [],
		}));
	};

	const closeAllDialogs = () => {
		setMcpDialogOpen(false);
		setAgentDialogOpen(false);
		setHookDialogOpen(false);
		setSubAgentDialogOpen(false);
		setSelectedProvider(undefined);
		setEditingMcpServer(undefined);
		setEditingAgent(undefined);
		setEditingHook(undefined);
		setEditingSubAgent(undefined);
	};

	// Function to log current configuration
	const logCurrentConfiguration = async () => {
		await readCurrentProviderConfiguration(settings);
	};

	// Function to list all agents
	const listAgents = () => {
		listAllAgents(settings);
	};

	return (
		<div className="fixed inset-0 z-50 flex">
			<div
				className="absolute inset-0 bg-background/60 backdrop-blur-sm"
				onClick={onClose}
			/>

			<div className="relative ml-auto flex h-full w-full max-w-6xl animate-in slide-in-from-right duration-300">
				<div className="flex h-full w-full flex-col border-l border-border bg-card shadow-2xl">
					{/* Header */}
					<div className="flex items-center justify-between border-b border-border px-5 py-4">
						<div>
							<h2 className="text-sm font-semibold text-foreground">
								Advanced Settings
							</h2>
							<p className="text-[11px] text-muted-foreground mt-0.5">
								Configure providers, MCPs, agents, hooks, and sub-agents
							</p>
						</div>
						<div className="flex items-center gap-2">
							<Button
								variant="outline"
								size="sm"
								onClick={logCurrentConfiguration}
								className="text-xs"
							>
								Log Config
							</Button>
							<Button
								variant="ghost"
								size="icon"
								className="h-7 w-7 text-muted-foreground hover:text-foreground"
								onClick={onClose}
							>
								<X className="h-4 w-4" />
								<span className="sr-only">Close settings</span>
							</Button>
						</div>
					</div>

					{/* Body */}
					<Tabs
						defaultValue="providers"
						className="flex-1 flex flex-col min-h-0"
					>
						<div className="border-b border-border px-5">
							<TabsList className="h-9 bg-transparent p-0 gap-4">
								<TabsTrigger
									value="providers"
									className="h-9 rounded-none border-b-2 border-transparent px-0 pb-2.5 pt-2 text-xs font-medium data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none text-muted-foreground"
								>
									Providers
								</TabsTrigger>
								<TabsTrigger
									value="advanced"
									className="h-9 rounded-none border-b-2 border-transparent px-0 pb-2.5 pt-2 text-xs font-medium data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none text-muted-foreground"
								>
									Advanced
								</TabsTrigger>
								<TabsTrigger
									value="models"
									className="h-9 rounded-none border-b-2 border-transparent px-0 pb-2.5 pt-2 text-xs font-medium data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none text-muted-foreground"
								>
									Models
								</TabsTrigger>
								<TabsTrigger
									value="defaults"
									className="h-9 rounded-none border-b-2 border-transparent px-0 pb-2.5 pt-2 text-xs font-medium data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none text-muted-foreground"
								>
									Defaults
								</TabsTrigger>
							</TabsList>
						</div>

						{/* Providers tab - Basic view */}
						<TabsContent value="providers" className="flex-1 m-0 min-h-0">
							<ScrollArea className="h-full">
								<div className="p-5 space-y-3">
									{settings.providers.map((provider) => (
										<SimpleProviderCard
											key={provider.id}
											provider={provider}
											onToggle={() =>
												updateProvider(provider.id, (p) => ({
													...p,
													connected: !p.connected,
												}))
											}
											onApiKeyChange={(key) =>
												updateProvider(provider.id, (p) => ({
													...p,
													apiKey: key,
												}))
											}
											onDefaultModelChange={(model) =>
												updateProvider(provider.id, (p) => ({
													...p,
													defaultModel: model,
												}))
											}
										/>
									))}
								</div>
							</ScrollArea>
						</TabsContent>

						{/* Advanced tab - Full provider configuration */}
						<TabsContent value="advanced" className="flex-1 m-0 min-h-0">
							<ScrollArea className="h-full">
								<div className="p-5">
									<div className="space-y-6">
										{settings.providers.map((provider) => (
											<ProviderSettingsCard
												key={provider.id}
												provider={provider}
												onUpdate={(updatedProvider) =>
													updateProvider(provider.id, () => updatedProvider)
												}
												onAddMcpServer={() => handleAddMcpServer(provider.id)}
												onEditMcpServer={(mcp) =>
													handleEditMcpServer(provider.id, mcp)
												}
												onDeleteMcpServer={(mcpId) =>
													handleDeleteMcpServer(provider.id, mcpId)
												}
												onAddAgent={() => handleAddAgent(provider.id)}
												onEditAgent={(agent) =>
													handleEditAgent(provider.id, agent)
												}
												onDeleteAgent={(agentId) =>
													handleDeleteAgent(provider.id, agentId)
												}
												onAddHook={() => handleAddHook(provider.id)}
												onEditHook={(hook) => handleEditHook(provider.id, hook)}
												onDeleteHook={(hookId) =>
													handleDeleteHook(provider.id, hookId)
												}
												onAddSubAgent={() => handleAddSubAgent(provider.id)}
												onEditSubAgent={(subAgent) =>
													handleEditSubAgent(provider.id, subAgent)
												}
												onDeleteSubAgent={(subAgentId) =>
													handleDeleteSubAgent(provider.id, subAgentId)
												}
											/>
										))}
									</div>
								</div>
							</ScrollArea>
						</TabsContent>

						{/* Models tab */}
						<TabsContent value="models" className="flex-1 m-0 min-h-0">
							<ScrollArea className="h-full">
								<div className="p-5 space-y-5">
									{/* Temperature */}
									<div>
										<div className="flex items-center justify-between mb-2">
											<label className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">
												Temperature
											</label>
											<span className="text-xs font-mono text-foreground">
												{settings.temperature.toFixed(1)}
											</span>
										</div>
										<Slider
											value={[settings.temperature]}
											onValueChange={([v]) =>
												onSettingsChange({ ...settings, temperature: v })
											}
											min={0}
											max={1}
											step={0.1}
											className="w-full"
										/>
										<div className="flex items-center justify-between mt-1">
											<span className="text-[10px] text-muted-foreground">
												Precise
											</span>
											<span className="text-[10px] text-muted-foreground">
												Creative
											</span>
										</div>
									</div>

									{/* Max Tokens */}
									<div>
										<label className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium mb-1.5 block">
											Max Tokens
										</label>
										<input
											type="number"
											value={settings.maxTokens}
											onChange={(e) =>
												onSettingsChange({
													...settings,
													maxTokens: parseInt(e.target.value) || 0,
												})
											}
											className="w-full rounded-lg border border-border bg-background text-xs font-mono text-foreground px-3 py-2 focus:outline-none focus:border-primary/40"
										/>
									</div>

									{/* System Prompt */}
									<div>
										<label className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium mb-1.5 block">
											System Prompt / Custom Instructions
										</label>
										<textarea
											value={settings.systemPrompt}
											onChange={(e) =>
												onSettingsChange({
													...settings,
													systemPrompt: e.target.value,
												})
											}
											placeholder="Add custom instructions for all agents..."
											rows={5}
											className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40 leading-relaxed"
										/>
									</div>

									{/* Available models summary */}
									<div>
										<label className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium mb-2 block">
											Available Models
										</label>
										<div className="space-y-2">
											{settings.providers
												.filter((p) => p.connected)
												.map((provider) => (
													<div
														key={provider.id}
														className="rounded-lg border border-border bg-secondary/30 p-3"
													>
														<div className="flex items-center gap-2 mb-2">
															<div
																className="h-2 w-2 rounded-full"
																style={{ backgroundColor: provider.color }}
															/>
															<span className="text-xs font-medium text-foreground">
																{provider.name}
															</span>
														</div>
														<div className="flex flex-wrap gap-1.5">
															{provider.models.map((m) => (
																<span
																	key={m.id}
																	className={cn(
																		"text-[10px] font-mono px-2 py-0.5 rounded border",
																		m.id === provider.defaultModel
																			? "border-primary/30 bg-primary/10 text-primary"
																			: "border-border bg-background text-muted-foreground",
																	)}
																>
																	{m.name}
																</span>
															))}
														</div>
													</div>
												))}
										</div>
									</div>
								</div>
							</ScrollArea>
						</TabsContent>

						{/* Defaults tab */}
						<TabsContent value="defaults" className="flex-1 m-0 min-h-0">
							<ScrollArea className="h-full">
								<div className="p-5 space-y-5">
									{/* Default Provider */}
									<div>
										<label className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium mb-1.5 block">
											Default Provider
										</label>
										<div className="flex gap-2">
											{settings.providers
												.filter((p) => p.connected)
												.map((provider) => (
													<button
														key={provider.id}
														className={cn(
															"flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors border flex-1",
															settings.defaultProvider === provider.id
																? "border-primary/30 bg-primary/5 text-foreground"
																: "border-border bg-secondary text-muted-foreground hover:bg-accent",
														)}
														onClick={() =>
															onSettingsChange({
																...settings,
																defaultProvider: provider.id,
																defaultModel: provider.defaultModel,
															})
														}
													>
														<span
															className="h-2 w-2 rounded-full shrink-0"
															style={{ backgroundColor: provider.color }}
														/>
														{provider.name}
													</button>
												))}
										</div>
									</div>

									{/* Default Model */}
									<div>
										<label className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium mb-1.5 block">
											Default Model
										</label>
										<div className="relative">
											<select
												value={settings.defaultModel}
												onChange={(e) =>
													onSettingsChange({
														...settings,
														defaultModel: e.target.value,
													})
												}
												className="w-full appearance-none rounded-lg border border-border bg-background text-xs text-foreground px-3 py-2 pr-8 focus:outline-none focus:border-primary/40"
											>
												{settings.providers
													.find((p) => p.id === settings.defaultProvider)
													?.models.map((m) => (
														<option key={m.id} value={m.id}>
															{m.name}
														</option>
													))}
											</select>
											<ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
										</div>
									</div>

									{/* Auto PR */}
									<div className="flex items-center justify-between">
										<div>
											<p className="text-xs font-medium text-foreground">
												Auto-create Pull Requests
											</p>
											<p className="text-[11px] text-muted-foreground mt-0.5">
												Automatically create a PR when an agent completes its
												task
											</p>
										</div>
										<Switch
											checked={settings.autoPR}
											onCheckedChange={(checked) =>
												onSettingsChange({ ...settings, autoPR: checked })
											}
										/>
									</div>

									{/* Branch naming */}
									<div>
										<label className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium mb-1.5 block">
											Branch Naming Convention
										</label>
										<input
											type="text"
											value={settings.branchConvention}
											onChange={(e) =>
												onSettingsChange({
													...settings,
													branchConvention: e.target.value,
												})
											}
											className="w-full rounded-lg border border-border bg-background text-xs font-mono text-foreground px-3 py-2 focus:outline-none focus:border-primary/40"
										/>
										<p className="text-[10px] text-muted-foreground mt-1">
											{
												"Use <task-slug> as a placeholder for the auto-generated branch name"
											}
										</p>
									</div>
								</div>
							</ScrollArea>
						</TabsContent>
					</Tabs>
				</div>
			</div>

			{/* Dialogs */}
			{selectedProvider && (
				<>
					<McpServerDialog
						open={mcpDialogOpen}
						onClose={closeAllDialogs}
						onSubmit={handleMcpServerSubmit}
						mcpServer={editingMcpServer}
						provider={selectedProvider}
						providerName={
							settings.providers.find((p) => p.id === selectedProvider)?.name ||
							""
						}
					/>

					<AgentConfigDialog
						open={agentDialogOpen}
						onClose={closeAllDialogs}
						onSubmit={handleAgentSubmit}
						agent={editingAgent}
						provider={selectedProvider}
						providerName={
							settings.providers.find((p) => p.id === selectedProvider)?.name ||
							""
						}
						availableModels={
							settings.providers.find((p) => p.id === selectedProvider)
								?.models || []
						}
					/>

					<HookConfigDialog
						open={hookDialogOpen}
						onClose={closeAllDialogs}
						onSubmit={handleHookSubmit}
						hook={editingHook}
						provider={selectedProvider}
						providerName={
							settings.providers.find((p) => p.id === selectedProvider)?.name ||
							""
						}
					/>

					<SubAgentConfigDialog
						open={subAgentDialogOpen}
						onClose={closeAllDialogs}
						onSubmit={handleSubAgentSubmit}
						subAgent={editingSubAgent}
						provider={selectedProvider}
						providerName={
							settings.providers.find((p) => p.id === selectedProvider)?.name ||
							""
						}
						availableModels={
							settings.providers.find((p) => p.id === selectedProvider)
								?.models || []
						}
						parentAgents={
							settings.providers.find((p) => p.id === selectedProvider)
								?.customAgents || []
						}
					/>
				</>
			)}
		</div>
	);
}
