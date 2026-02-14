"use client";

import { ChevronDown, FolderGit2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { AgentProvider, AppSettings } from "@/lib/store";
import { cn } from "@/lib/utils";

interface NewAgentDialogProps {
	open: boolean;
	onClose: () => void;
	onBrowseRepo?: () => Promise<string | null>;
	onListBranches?: (repoPath: string) => Promise<string[]>;
	onSubmit: (data: {
		prompt: string;
		repo: string;
		provider: string;
		model: string;
		baseBranch?: string;
		workspaceId?: string;
	}) => void;
	settings: AppSettings;
	repos?: { id?: string; name: string; label: string }[];
	initialRepo?: string;
	initialWorkspaceId?: string;
}

const DEFAULT_REPOS = [
	{ name: "conductor-labs/conductor", label: "conductor-app" },
	{ name: "conductor-labs/api", label: "api-server" },
];

const PROVIDER_COLORS: Record<AgentProvider, string> = {
	"claude-code": "#d97756",
	codex: "#10a37f",
	opencode: "#06b6d4",
};

function getOpenCodeGroup(modelId: string, description: string): string {
	if (modelId.startsWith("openrouter/")) {
		return "OpenRouter";
	}
	if (modelId.startsWith("github-copilot/")) {
		return "GitHub Copilot";
	}
	if (modelId.startsWith("zai-coding-plan/")) {
		return "ZAI Coding Plan";
	}
	if (modelId.startsWith("zai/")) {
		return "ZAI";
	}
	if (modelId.startsWith("opencode/")) {
		return "OpenCode";
	}
	if (description.includes("OpenRouter")) {
		return "OpenRouter";
	}
	if (description.includes("GitHub Copilot")) {
		return "GitHub Copilot";
	}
	if (description.includes("ZAI")) {
		return "ZAI";
	}
	return "OpenCode";
}

export function NewAgentDialog({
	open,
	onClose,
	onBrowseRepo,
	onListBranches,
	onSubmit,
	settings,
	repos,
	initialRepo,
	initialWorkspaceId,
}: NewAgentDialogProps) {
	const repoOptions = repos && repos.length > 0 ? repos : DEFAULT_REPOS;
	const [prompt, setPrompt] = useState("");
	const [selectedRepo, setSelectedRepo] = useState(repoOptions[0]);
	const [repoPath, setRepoPath] = useState(repoOptions[0]?.name ?? "");
	const fallbackProvider = settings.providers[0];
	const defaultProviderConfig =
		settings.providers.find((p) => p.id === settings.defaultProvider) ||
		fallbackProvider;
	const [selectedProvider, setSelectedProvider] = useState<AgentProvider>(
		defaultProviderConfig?.id || "claude-code",
	);
	const [selectedModel, setSelectedModel] = useState(
		defaultProviderConfig?.defaultModel || "",
	);
	const [selectedOpenCodeGroup, setSelectedOpenCodeGroup] = useState("all");
	const [availableBranches, setAvailableBranches] = useState<string[]>([
		"main",
		"master",
	]);
	const [selectedBaseBranch, setSelectedBaseBranch] = useState("main");

	const connectedProviders = settings.providers.filter((p) => p.connected);
	const currentProvider =
		connectedProviders.find((p) => p.id === selectedProvider) ||
		connectedProviders[0] ||
		defaultProviderConfig;
	const currentModels = currentProvider?.models || [];
	const openCodeGroups = useMemo(() => {
		if (selectedProvider !== "opencode") {
			return [];
		}
		const values = currentModels.map((model) =>
			getOpenCodeGroup(model.id, model.description),
		);
		return [...new Set(values)];
	}, [currentModels, selectedProvider]);
	const visibleModels = useMemo(() => {
		if (selectedProvider !== "opencode" || selectedOpenCodeGroup === "all") {
			return currentModels;
		}
		return currentModels.filter(
			(model) =>
				getOpenCodeGroup(model.id, model.description) === selectedOpenCodeGroup,
		);
	}, [currentModels, selectedOpenCodeGroup, selectedProvider]);

	useEffect(() => {
		if (!open) {
			return;
		}
		const workspaceId = initialWorkspaceId?.trim();
		if (workspaceId) {
			const byWorkspace = repoOptions.find(
				(option) => option.id === workspaceId,
			);
			if (byWorkspace) {
				setSelectedRepo(byWorkspace);
				setRepoPath(byWorkspace.name);
				return;
			}
		}

		const targetRepo = initialRepo?.trim();
		if (targetRepo) {
			const byRepo = repoOptions.find((option) => option.name === targetRepo);
			if (byRepo) {
				setSelectedRepo(byRepo);
			} else {
				setSelectedRepo({ name: targetRepo, label: targetRepo });
			}
			setRepoPath(targetRepo);
			return;
		}

		const fallback = repoOptions[0];
		if (fallback) {
			setSelectedRepo(fallback);
			setRepoPath(fallback.name);
		}
	}, [initialRepo, initialWorkspaceId, open, repoOptions]);

	useEffect(() => {
		if (selectedProvider !== "opencode") {
			setSelectedOpenCodeGroup("all");
			return;
		}
		if (
			selectedOpenCodeGroup !== "all" &&
			!openCodeGroups.includes(selectedOpenCodeGroup)
		) {
			setSelectedOpenCodeGroup("all");
		}
	}, [openCodeGroups, selectedOpenCodeGroup, selectedProvider]);

	useEffect(() => {
		if (visibleModels.some((model) => model.id === selectedModel)) {
			return;
		}
		setSelectedModel(visibleModels[0]?.id || "");
	}, [selectedModel, visibleModels]);

	useEffect(() => {
		const normalized = repoPath.trim();
		if (!normalized) {
			return;
		}
		let active = true;
		void (async () => {
			try {
				const listed = onListBranches
					? await onListBranches(normalized)
					: ["main", "master"];
				if (!active) {
					return;
				}
				const next = [
					...new Set(listed.filter((value) => value.trim().length > 0)),
				];
				const fallback = next.length > 0 ? next : ["main", "master"];
				setAvailableBranches(fallback);
				setSelectedBaseBranch((current) =>
					fallback.includes(current) ? current : fallback[0] || "main",
				);
			} catch {
				if (!active) {
					return;
				}
				setAvailableBranches(["main", "master"]);
				setSelectedBaseBranch((current) => current || "main");
			}
		})();
		return () => {
			active = false;
		};
	}, [onListBranches, repoPath]);

	if (!open) return null;

	const handleProviderChange = (id: AgentProvider) => {
		setSelectedProvider(id);
		const provider = settings.providers.find((pr) => pr.id === id);
		if (provider) {
			setSelectedModel(provider.defaultModel);
		}
		if (id !== "opencode") {
			setSelectedOpenCodeGroup("all");
		}
	};

	const handleSubmit = () => {
		const normalizedRepoPath = repoPath.trim();
		if (prompt.trim() && normalizedRepoPath) {
			const selectedWorkspaceId = repoOptions.find(
				(repo) => repo.name === normalizedRepoPath,
			)?.id;
			onSubmit({
				prompt: prompt.trim(),
				repo: normalizedRepoPath,
				provider: selectedProvider,
				model: selectedModel,
				baseBranch: selectedBaseBranch.trim() || undefined,
				workspaceId: selectedWorkspaceId,
			});
			setPrompt("");
			onClose();
		}
	};

	const handleBrowseRepo = async () => {
		if (!onBrowseRepo) {
			return;
		}
		const selectedPath = await onBrowseRepo();
		if (!selectedPath) {
			return;
		}
		setRepoPath(selectedPath);
		const existing = repoOptions.find((repo) => repo.name === selectedPath);
		if (existing) {
			setSelectedRepo(existing);
		} else {
			setSelectedRepo({ name: selectedPath, label: selectedPath });
		}
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center">
			{/* Overlay */}
			<div
				className="absolute inset-0 bg-background/80 backdrop-blur-sm"
				onClick={onClose}
			/>

			{/* Dialog */}
			<div className="relative w-full max-w-lg rounded-xl border border-border bg-card shadow-2xl mx-4">
				<div className="p-5">
					<h2 className="text-sm font-semibold text-foreground mb-4">
						Deploy New Agent
					</h2>

					{/* Provider selector */}
					<div className="flex items-center gap-2 mb-4 flex-wrap">
						{connectedProviders.map((provider) => {
							const color = PROVIDER_COLORS[provider.id];
							const isSelected = selectedProvider === provider.id;
							return (
								<button
									key={provider.id}
									className={cn(
										"flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border",
										isSelected
											? "border-transparent"
											: "bg-secondary text-muted-foreground border-border hover:bg-accent",
									)}
									style={
										isSelected
											? {
													backgroundColor: `${color}15`,
													color,
													borderColor: `${color}33`,
												}
											: undefined
									}
									onClick={() => handleProviderChange(provider.id)}
								>
									<span
										className="h-2 w-2 rounded-full"
										style={{
											backgroundColor: isSelected
												? color
												: "hsl(var(--muted-foreground))",
										}}
									/>
									{provider.name}
								</button>
							);
						})}
					</div>

					{/* Base branch selector */}
					<div className="mb-4">
						<label className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium mb-1.5 block">
							Base Branch
						</label>
						<div className="relative">
							<select
								value={selectedBaseBranch}
								onChange={(event) => setSelectedBaseBranch(event.target.value)}
								className="w-full appearance-none rounded-lg border border-border bg-background text-sm text-foreground px-3 py-2 pr-8 focus:outline-none focus:border-primary/40"
							>
								{availableBranches.map((branch) => (
									<option key={branch} value={branch}>
										{branch}
									</option>
								))}
							</select>
							<ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
						</div>
					</div>

					{/* Model selector */}
					<div className="mb-4">
						{selectedProvider === "opencode" && openCodeGroups.length > 0 ? (
							<div className="mb-2">
								<label className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium mb-1.5 block">
									OpenCode Provider
								</label>
								<div className="relative">
									<select
										value={selectedOpenCodeGroup}
										onChange={(e) => setSelectedOpenCodeGroup(e.target.value)}
										className="w-full appearance-none rounded-lg border border-border bg-background text-sm text-foreground px-3 py-2 pr-8 focus:outline-none focus:border-primary/40"
									>
										<option value="all">All providers</option>
										{openCodeGroups.map((group) => (
											<option key={group} value={group}>
												{group}
											</option>
										))}
									</select>
									<ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
								</div>
							</div>
						) : null}
						<label className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium mb-1.5 block">
							Model
						</label>
						<div className="relative">
							<select
								value={selectedModel}
								onChange={(e) => setSelectedModel(e.target.value)}
								className="w-full appearance-none rounded-lg border border-border bg-background text-sm text-foreground px-3 py-2 pr-8 focus:outline-none focus:border-primary/40"
							>
								{visibleModels.map((m) => (
									<option key={m.id} value={m.id}>
										{m.name} - {m.description}
									</option>
								))}
							</select>
							<ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
						</div>
					</div>

					{/* Repo selector */}
					<div className="mb-4">
						<label className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium mb-1.5 block">
							Repository
						</label>
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button
									variant="outline"
									className="w-full justify-between h-9 text-sm bg-background border-border text-foreground"
								>
									<span className="flex items-center gap-2">
										<FolderGit2 className="h-3.5 w-3.5 text-muted-foreground" />
										{selectedRepo.name}
									</span>
									<ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width]">
								{repoOptions.map((repo) => (
									<DropdownMenuItem
										key={repo.name}
										onClick={() => {
											setSelectedRepo(repo);
											setRepoPath(repo.name);
										}}
									>
										<FolderGit2 className="h-3.5 w-3.5 mr-2" />
										{repo.name}
									</DropdownMenuItem>
								))}
							</DropdownMenuContent>
						</DropdownMenu>
						<div className="mt-2 flex items-center gap-2">
							<input
								value={repoPath}
								onChange={(e) => setRepoPath(e.target.value)}
								placeholder="/absolute/path/to/repo"
								className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40"
							/>
							<Button
								type="button"
								variant="outline"
								onClick={handleBrowseRepo}
								className="h-9 shrink-0"
							>
								Browse
							</Button>
						</div>
					</div>

					{/* Prompt */}
					<div className="mb-4">
						<label className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium mb-1.5 block">
							Task
						</label>
						<textarea
							value={prompt}
							onChange={(e) => setPrompt(e.target.value)}
							placeholder="Describe what the agent should do..."
							rows={4}
							className={cn(
								"w-full resize-none rounded-lg border border-border bg-background px-3 py-2",
								"text-sm text-foreground placeholder:text-muted-foreground",
								"focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20",
								"leading-relaxed",
							)}
							autoFocus
						/>
					</div>

					{/* Actions */}
					<div className="flex items-center justify-end gap-2">
						<Button
							variant="ghost"
							onClick={onClose}
							className="text-muted-foreground hover:text-foreground"
						>
							Cancel
						</Button>
						<Button
							disabled={!prompt.trim() || !repoPath.trim()}
							onClick={handleSubmit}
							className="bg-primary text-primary-foreground hover:bg-primary/90"
						>
							Deploy Agent
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
}
