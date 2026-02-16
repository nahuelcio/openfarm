"use client";

import { Check, Cloud, Eye, EyeOff, Loader2, RefreshCw, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { AzureDevOpsConfig } from "@/lib/store";
import { cn } from "@/lib/utils";

interface AzureDevOpsSettingsProps {
	config?: AzureDevOpsConfig;
	onConfigChange: (config: AzureDevOpsConfig) => void;
}

export function AzureDevOpsSettings({ config, onConfigChange }: AzureDevOpsSettingsProps) {
	const [showPat, setShowPat] = useState(false);
	const [testing, setTesting] = useState(false);
	const [testResult, setTestResult] = useState<"success" | "error" | null>(null);
	const [projects, setProjects] = useState<string[]>([]);
	const [repositories, setRepositories] = useState<string[]>([]);
	const [loadingProjects, setLoadingProjects] = useState(false);
	const [loadingRepos, setLoadingRepos] = useState(false);

	const updateConfig = (updates: Partial<AzureDevOpsConfig>) => {
		if (!config) return;
		onConfigChange({ ...config, ...updates });
	};

	const handleTest = async () => {
		if (!config?.orgUrl || !config?.pat || !config?.project) return;

		setTesting(true);
		setTestResult(null);

		try {
			// Test connection by fetching projects
			const response = await fetch(`${config.orgUrl.replace(/\/$/, "")}/_apis/projects?api-version=6.0`, {
				headers: {
					Authorization: `Basic ${Buffer.from(`:${config.pat}`).toString("base64")}`,
				},
			});

			if (response.ok) {
				setTestResult("success");
				// Load projects on successful test
				await loadProjects();
			} else {
				setTestResult("error");
			}
		} catch (error) {
			setTestResult("error");
		} finally {
			setTesting(false);
		}
	};

	const loadProjects = async () => {
		if (!config?.orgUrl || !config?.pat) return;

		setLoadingProjects(true);
		try {
			const response = await fetch(`${config.orgUrl.replace(/\/$/, "")}/_apis/projects?api-version=6.0`, {
				headers: {
					Authorization: `Basic ${Buffer.from(`:${config.pat}`).toString("base64")}`,
				},
			});

			if (response.ok) {
				const data = await response.json();
				setProjects(data.value?.map((p: any) => p.name) || []);
			}
		} catch (error) {
			console.error("Failed to load projects:", error);
		} finally {
			setLoadingProjects(false);
		}
	};

	const loadRepositories = async () => {
		if (!config?.orgUrl || !config?.pat || !config?.project) return;

		setLoadingRepos(true);
		try {
			const response = await fetch(`${config.orgUrl.replace(/\/$/, "")}/${config.project}/_apis/git/repositories?api-version=6.0`, {
				headers: {
					Authorization: `Basic ${Buffer.from(`:${config.pat}`).toString("base64")}`,
				},
			});

			if (response.ok) {
				const data = await response.json();
				setRepositories(data.value?.map((r: any) => ({ id: r.id, name: r.name })) || []);
			}
		} catch (error) {
			console.error("Failed to load repositories:", error);
		} finally {
			setLoadingRepos(false);
		}
	};

	const toggleConnection = () => {
		if (!config) return;
		updateConfig({ connected: !config.connected });
	};

	if (!config) {
		return (
			<div className="text-center py-8">
				<p className="text-sm text-muted-foreground">Azure DevOps configuration not available</p>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-3">
					<div className="h-8 w-8 rounded-lg flex items-center justify-center bg-blue-500/10">
						<Cloud className="h-4 w-4 text-blue-500" />
					</div>
					<div>
						<h3 className="text-sm font-semibold text-foreground">Azure DevOps Integration</h3>
						<p className="text-[11px] text-muted-foreground leading-relaxed">
							Connect to Azure DevOps to manage work items, pull requests, and deployments
						</p>
					</div>
				</div>
				<Switch checked={config.connected} onCheckedChange={toggleConnection} />
			</div>

			{config.connected && (
				<div className="space-y-4 pt-2 border-t border-border/50">
					{/* Organization URL */}
					<div>
						<Label className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium mb-1 block">
							Organization URL
						</Label>
						<Input
							value={config.orgUrl}
							onChange={(e) => updateConfig({ orgUrl: e.target.value })}
							placeholder="https://dev.azure.com/your-org"
							className="text-xs font-mono"
						/>
					</div>

					{/* Personal Access Token */}
					<div>
						<Label className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium mb-1 block">
							Personal Access Token
						</Label>
						<div className="flex items-center gap-2">
							<div className="flex-1 flex items-center rounded-lg border border-border bg-background overflow-hidden">
								<Input
									type={showPat ? "text" : "password"}
									value={config.pat}
									onChange={(e) => updateConfig({ pat: e.target.value })}
									placeholder="Enter PAT..."
									className="border-0 bg-transparent text-xs font-mono focus:ring-0"
								/>
								<Button
									variant="ghost"
									size="sm"
									className="h-8 px-2 text-muted-foreground hover:text-foreground"
									onClick={() => setShowPat(!showPat)}
									type="button"
								>
									{showPat ? (
										<EyeOff className="h-3.5 w-3.5" />
									) : (
										<Eye className="h-3.5 w-3.5" />
									)}
								</Button>
							</div>
							<Button
								variant="outline"
								size="sm"
								className="h-8 text-xs gap-1.5"
								onClick={handleTest}
								disabled={testing || !config.orgUrl || !config.pat}
							>
								{testing ? (
									<Loader2 className="h-3 w-3 animate-spin" />
								) : testResult === "success" ? (
									<Check className="h-3 w-3 text-green-500" />
								) : null}
								Test
							</Button>
						</div>
						{testResult === "success" && (
							<p className="text-[10px] text-green-500 mt-1">Connection successful</p>
						)}
						{testResult === "error" && (
							<p className="text-[10px] text-red-500 mt-1">Connection failed. Check your credentials.</p>
						)}
					</div>

					{/* Project */}
					<div>
						<Label className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium mb-1 block">
							Project
						</Label>
						<div className="flex items-center gap-2">
							<Input
								value={config.project}
								onChange={(e) => updateConfig({ project: e.target.value })}
								placeholder="Select or enter project name"
								className="text-xs"
								list="azure-projects"
							/>
							<Button
								variant="outline"
								size="sm"
								className="h-8 text-xs gap-1.5"
								onClick={loadProjects}
								disabled={loadingProjects || !config.orgUrl || !config.pat}
							>
								{loadingProjects ? (
									<Loader2 className="h-3 w-3 animate-spin" />
								) : (
									<RefreshCw className="h-3 w-3" />
								)}
								Load
							</Button>
						</div>
						<datalist id="azure-projects">
							{projects.map((project) => (
								<option key={project} value={project} />
							))}
						</datalist>
					</div>

					{/* Repository */}
					<div>
						<Label className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium mb-1 block">
							Repository
						</Label>
						<div className="flex items-center gap-2">
							<Input
								value={config.repoId}
								onChange={(e) => updateConfig({ repoId: e.target.value })}
								placeholder="Select or enter repository ID"
								className="text-xs"
								list="azure-repos"
							/>
							<Button
								variant="outline"
								size="sm"
								className="h-8 text-xs gap-1.5"
								onClick={loadRepositories}
								disabled={loadingRepos || !config.orgUrl || !config.pat || !config.project}
							>
								{loadingRepos ? (
									<Loader2 className="h-3 w-3 animate-spin" />
								) : (
									<RefreshCw className="h-3 w-3" />
								)}
								Load
							</Button>
						</div>
						<datalist id="azure-repos">
							{repositories.map((repo: any) => (
								<option key={repo.id} value={repo.id}>
									{repo.name}
								</option>
							))}
						</datalist>
					</div>

					{/* Status Summary */}
					{(config.orgUrl && config.pat && config.project && config.repoId) && (
						<div className="rounded-lg border border-border bg-secondary/30 p-3">
							<h4 className="text-xs font-medium text-foreground mb-2">Configuration Summary</h4>
							<div className="space-y-1">
								<div className="flex items-center gap-2">
									<div className="h-1.5 w-1.5 rounded-full bg-green-500" />
									<span className="text-[10px] text-muted-foreground">Organization configured</span>
								</div>
								<div className="flex items-center gap-2">
									<div className="h-1.5 w-1.5 rounded-full bg-green-500" />
									<span className="text-[10px] text-muted-foreground">Authentication ready</span>
								</div>
								<div className="flex items-center gap-2">
									<div className="h-1.5 w-1.5 rounded-full bg-green-500" />
									<span className="text-[10px] text-muted-foreground">Project: {config.project}</span>
								</div>
								<div className="flex items-center gap-2">
									<div className="h-1.5 w-1.5 rounded-full bg-green-500" />
									<span className="text-[10px] text-muted-foreground">Repository: {config.repoId}</span>
								</div>
							</div>
						</div>
					)}
				</div>
			)}
		</div>
	);
}
