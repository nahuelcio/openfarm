import { useCallback, useEffect, useMemo, useState } from "react";
import { AgentPanel } from "@/components/conductor/agent-panel";
import { AppSidebar } from "@/components/conductor/app-sidebar";
import { EmptyState } from "@/components/conductor/empty-state";
import { NewAgentDialog } from "@/components/conductor/new-agent-dialog";
import { SettingsPanel } from "@/components/conductor/settings-panel";
import { Titlebar } from "@/components/conductor/titlebar";
import {
	addLocalWorkspace,
	bootstrapAppState,
	createAgent,
	getProviderCatalog,
	getSettings,
	listRepositoryBranches,
	loadAgentDiffs,
	pickRepositoryDirectory,
	saveSettings,
	sendAgentMessage,
	subscribeAgentEvents,
} from "@/lib/backend";
import type {
	Agent,
	AgentMode,
	AgentProvider,
	AgentStatus,
	AppSettings,
	Attachment,
	BootstrapState,
	ProviderConfig,
	Workspace,
} from "@/lib/store";
import { DEFAULT_SETTINGS } from "@/lib/store";
import { cn } from "@/lib/utils";

function findAgent(workspaces: Workspace[], id: string | null): Agent | null {
	if (!id) {
		return null;
	}
	for (const workspace of workspaces) {
		const agent = workspace.agents.find((value) => value.id === id);
		if (agent) {
			return agent;
		}
	}
	return null;
}

function applyOutputChunk(
	workspaces: Workspace[],
	agentId: string,
	chunk: string,
	status?: AgentStatus,
): Workspace[] {
	return workspaces.map((workspace) => ({
		...workspace,
		agents: workspace.agents.map((agent) => {
			if (agent.id !== agentId) {
				return agent;
			}
			const messages = [...agent.messages];
			const last = messages[messages.length - 1];
			if (last && last.role === "agent" && last.thinking) {
				last.content = `${last.content}${chunk}`;
			} else {
				messages.push({
					id: `m-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
					role: "agent",
					content: chunk,
					timestamp: new Date().toLocaleTimeString([], {
						hour: "2-digit",
						minute: "2-digit",
					}),
					thinking: true,
				});
			}
			return {
				...agent,
				status: status || agent.status,
				messages,
			};
		}),
	}));
}

function mergeSettingsWithCatalog(
	current: AppSettings,
	catalog: ProviderConfig[],
): AppSettings {
	const existingById = new Map(
		current.providers.map((provider) => [provider.id, provider]),
	);
	const providers = catalog.map((provider) => {
		const existing = existingById.get(provider.id);
		const modelIds = new Set(provider.models.map((model) => model.id));
		const agentIds = new Set((provider.agents || []).map((agent) => agent.id));
		const defaultModel =
			existing?.defaultModel && modelIds.has(existing.defaultModel)
				? existing.defaultModel
				: provider.defaultModel;
		const defaultAgent =
			existing?.defaultAgent && agentIds.has(existing.defaultAgent)
				? existing.defaultAgent
				: provider.defaultAgent || provider.agents?.[0]?.id || "";
		return {
			...provider,
			connected: existing?.connected ?? provider.connected,
			apiKey: existing?.apiKey ?? "",
			defaultModel,
			defaultAgent,
		};
	});

	const providerIds = new Set(providers.map((provider) => provider.id));
	const defaultProvider = providerIds.has(current.defaultProvider)
		? current.defaultProvider
		: providers[0]?.id || current.defaultProvider;
	const selectedProvider = providers.find(
		(provider) => provider.id === defaultProvider,
	);
	const selectedModelIds = new Set(
		selectedProvider?.models.map((model) => model.id) || [],
	);
	const defaultModel = selectedModelIds.has(current.defaultModel)
		? current.defaultModel
		: selectedProvider?.defaultModel || current.defaultModel;

	return {
		...current,
		providers,
		defaultProvider,
		defaultModel,
	};
}

export default function App() {
	const [sidebarOpen, setSidebarOpen] = useState(true);
	const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
	const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
	const [newAgentOpen, setNewAgentOpen] = useState(false);
	const [settingsOpen, setSettingsOpen] = useState(false);
	const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
	const selectedAgent = useMemo(
		() => findAgent(workspaces, selectedAgentId),
		[workspaces, selectedAgentId],
	);
	const repos = useMemo(
		() =>
			workspaces.map((workspace) => ({
				name: workspace.repo,
				label: workspace.name,
			})),
		[workspaces],
	);

	const syncState = useCallback(
		(nextState: BootstrapState, preferredAgentId?: string | null) => {
			setWorkspaces(nextState.workspaces);
			setSettings(nextState.settings);
			setSelectedAgentId((prev) => {
				const candidate = preferredAgentId ?? prev;
				return findAgent(nextState.workspaces, candidate)?.id || null;
			});
		},
		[],
	);

	const refreshState = useCallback(
		async (preferredAgentId?: string | null) => {
			const state = await bootstrapAppState();
			syncState(state, preferredAgentId);
		},
		[syncState],
	);

	useEffect(() => {
		let mounted = true;
		void (async () => {
			const state = await bootstrapAppState();
			if (!mounted) {
				return;
			}
			syncState(state, selectedAgentId);
		})();

		const active = setInterval(() => {
			void refreshState(selectedAgentId);
		}, 4000);

		let unsubs: Array<() => void> = [];
		void (async () => {
			unsubs = [
				await subscribeAgentEvents("agent:started", () => {
					void refreshState(selectedAgentId);
				}),
				await subscribeAgentEvents("agent:completed", () => {
					void refreshState(selectedAgentId);
				}),
				await subscribeAgentEvents("agent:failed", () => {
					void refreshState(selectedAgentId);
				}),
				await subscribeAgentEvents("agent:diff-updated", async (payload) => {
					const value = payload as { agent_id?: string; agentId?: string };
					const id = value.agent_id || value.agentId;
					if (!id) {
						return;
					}
					const diffs = await loadAgentDiffs(id);
					setWorkspaces((prev) =>
						prev.map((workspace) => ({
							...workspace,
							agents: workspace.agents.map((agent) =>
								agent.id === id ? { ...agent, diffs } : agent,
							),
						})),
					);
				}),
				await subscribeAgentEvents("agent:output", (payload) => {
					const value = payload as { agent_id?: string; chunk?: string };
					if (!value.agent_id || !value.chunk) {
						return;
					}
					setWorkspaces((prev) =>
						applyOutputChunk(prev, value.agent_id || "", value.chunk || ""),
					);
				}),
			];
		})();

		return () => {
			mounted = false;
			clearInterval(active);
			for (const unlisten of unsubs) {
				unlisten();
			}
		};
	}, [refreshState, selectedAgentId, syncState]);

	useEffect(() => {
		void (async () => {
			const persisted = await getSettings();
			const catalog = await getProviderCatalog().catch(() => []);
			if (catalog.length > 0) {
				const merged = mergeSettingsWithCatalog(persisted, catalog);
				setSettings(merged);
				await saveSettings(merged).catch(() => {});
				return;
			}
			setSettings(persisted);
		})();
	}, []);

	const handleSelectAgent = useCallback((agent: Agent) => {
		setSelectedAgentId(agent.id);
	}, []);

	const handleSendMessage = useCallback(
		async (payload: {
			message: string;
			attachments?: Attachment[];
			provider?: AgentProvider;
			model?: string;
			agentMode?: AgentMode;
		}) => {
			if (!selectedAgentId) {
				return;
			}
			const next = await sendAgentMessage({
				agentId: selectedAgentId,
				message: payload.message,
				attachments: payload.attachments,
				provider: payload.provider,
				model: payload.model,
				agentMode: payload.agentMode,
			});
			syncState(next, selectedAgentId);
		},
		[selectedAgentId, syncState],
	);

	const handleNewAgent = useCallback(
		async (data: {
			prompt: string;
			repo: string;
			provider: string;
			model: string;
			baseBranch?: string;
		}) => {
			const next = await createAgent(data);
			const workspace = next.workspaces.find(
				(value) => value.repo === data.repo,
			);
			const created =
				workspace && workspace.agents.length > 0
					? workspace.agents[workspace.agents.length - 1]?.id || null
					: null;
			syncState(next, created);
		},
		[syncState],
	);

	const handleAddWorkspace = useCallback(async () => {
		const selectedPath = await pickRepositoryDirectory();
		if (!selectedPath) {
			return;
		}
		try {
			const next = await addLocalWorkspace(selectedPath);
			syncState(next, selectedAgentId);
		} catch (error) {
			const message =
				error instanceof Error ? error.message : "Failed to add workspace";
			if (typeof window !== "undefined") {
				window.alert(message);
			}
		}
	}, [selectedAgentId, syncState]);

	const handleSettingsChange = useCallback(
		async (nextSettings: AppSettings) => {
			setSettings(nextSettings);
			const persisted = await saveSettings(nextSettings);
			setSettings(persisted);
		},
		[],
	);

	return (
		<div className="flex h-screen flex-col overflow-hidden">
			<Titlebar
				onNewAgent={() => setNewAgentOpen(true)}
				onOpenSettings={() => setSettingsOpen(true)}
				onToggleSidebar={() => setSidebarOpen((value) => !value)}
				sidebarOpen={sidebarOpen}
			/>

			<div className="flex flex-1 overflow-hidden">
				<div
					className={cn(
						"shrink-0 overflow-hidden border-r border-border transition-all duration-200",
						sidebarOpen ? "w-64 xl:w-72" : "w-0",
					)}
				>
					<AppSidebar
						onAddWorkspace={handleAddWorkspace}
						onSelectAgent={handleSelectAgent}
						selectedAgentId={selectedAgentId}
						workspaces={workspaces}
					/>
				</div>

				<main className="min-w-0 flex-1">
					{selectedAgent ? (
						<AgentPanel
							agent={selectedAgent}
							onSendMessage={handleSendMessage}
							providers={settings.providers}
						/>
					) : (
						<EmptyState onNewAgent={() => setNewAgentOpen(true)} />
					)}
				</main>
			</div>

			<NewAgentDialog
				onBrowseRepo={pickRepositoryDirectory}
				onClose={() => setNewAgentOpen(false)}
				onListBranches={listRepositoryBranches}
				onSubmit={handleNewAgent}
				open={newAgentOpen}
				repos={repos}
				settings={settings}
			/>

			<SettingsPanel
				onClose={() => setSettingsOpen(false)}
				onSettingsChange={handleSettingsChange}
				open={settingsOpen}
				settings={settings}
			/>
		</div>
	);
}
