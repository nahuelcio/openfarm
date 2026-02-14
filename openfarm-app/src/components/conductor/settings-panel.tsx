"use client";

import { Check, ChevronDown, Eye, EyeOff, Loader2, X, Zap } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AgentProvider, AppSettings, ProviderConfig } from "@/lib/store";
import { cn } from "@/lib/utils";

// --- Provider Card ---

function ProviderCard({
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

export function SettingsPanel({
	open,
	onClose,
	settings,
	onSettingsChange,
}: SettingsPanelProps) {
	if (!open) return null;

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

	return (
		<div className="fixed inset-0 z-50 flex">
			<div
				className="absolute inset-0 bg-background/60 backdrop-blur-sm"
				onClick={onClose}
			/>

			<div className="relative ml-auto flex h-full w-full max-w-xl animate-in slide-in-from-right duration-300">
				<div className="flex h-full w-full flex-col border-l border-border bg-card shadow-2xl">
					{/* Header */}
					<div className="flex items-center justify-between border-b border-border px-5 py-4">
						<div>
							<h2 className="text-sm font-semibold text-foreground">
								Settings
							</h2>
							<p className="text-[11px] text-muted-foreground mt-0.5">
								Configure providers, models, and agent defaults
							</p>
						</div>
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

						{/* Providers tab */}
						<TabsContent value="providers" className="flex-1 m-0 min-h-0">
							<ScrollArea className="h-full">
								<div className="p-5 space-y-3">
									{settings.providers.map((provider) => (
										<ProviderCard
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
		</div>
	);
}
