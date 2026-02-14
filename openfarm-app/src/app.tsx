import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
	getAgentEvents,
	getProviderCatalog,
	getSettings,
	killAgent,
	listRepositoryBranches,
	loadAgentDiffs,
	pickRepositoryDirectory,
	saveSettings,
	sendAgentMessage,
	subscribeAgentEvents,
} from "@/lib/backend";
import type {
	Agent,
	AgentExecutionEvent,
	AgentMode,
	AgentProvider,
	AgentStatus,
	AppSettings,
	Attachment,
	BootstrapState,
	ProviderConfig,
	QueuedInstruction,
	Workspace,
} from "@/lib/store";
import { DEFAULT_SETTINGS } from "@/lib/store";
import { cn } from "@/lib/utils";

interface SelectedAgentContext {
	agent: Agent;
	workspace: Workspace;
}

interface MessagePayload {
	message: string;
	attachments?: Attachment[];
	provider?: AgentProvider;
	model?: string;
	agentMode?: AgentMode;
}

function findAgentContext(
	workspaces: Workspace[],
	id: string | null,
): SelectedAgentContext | null {
	if (!id) {
		return null;
	}
	for (const workspace of workspaces) {
		const agent = workspace.agents.find((value) => value.id === id);
		if (agent) {
			return { agent, workspace };
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
	const defaultsById = new Map(
		DEFAULT_SETTINGS.providers.map((provider) => [provider.id, provider]),
	);
	const providers = catalog.map((provider) => {
		const existing = existingById.get(provider.id);
		const fallback = defaultsById.get(provider.id);
		const modelIds = new Set(provider.models.map((model) => model.id));
		const mergedAgents =
			provider.agents && provider.agents.length > 0
				? provider.agents
				: existing?.agents && existing.agents.length > 0
					? existing.agents
					: fallback?.agents || [];
		const agentIds = new Set(mergedAgents.map((agent) => agent.id));
		const defaultModel =
			existing?.defaultModel && modelIds.has(existing.defaultModel)
				? existing.defaultModel
				: provider.defaultModel;
		const defaultAgent =
			existing?.defaultAgent && agentIds.has(existing.defaultAgent)
				? existing.defaultAgent
				: provider.defaultAgent ||
					existing?.defaultAgent ||
					fallback?.defaultAgent ||
					mergedAgents[0]?.id ||
					"";
		return {
			...provider,
			connected: existing?.connected ?? provider.connected,
			apiKey: existing?.apiKey ?? "",
			agents: mergedAgents,
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
	const [queuedInstructionsByAgent, setQueuedInstructionsByAgent] = useState<
		Record<string, QueuedInstruction[]>
	>({});
	const [agentEventsByAgent, setAgentEventsByAgent] = useState<
		Record<string, AgentExecutionEvent[]>
	>({});
	const [logsLoadingByAgent, setLogsLoadingByAgent] = useState<
		Record<string, boolean>
	>({});
	const [stoppingAgentId, setStoppingAgentId] = useState<string | null>(null);
	const queueDispatchingRef = useRef<Set<string>>(new Set());
	const selectedAgentContext = useMemo(
		() => findAgentContext(workspaces, selectedAgentId),
		[workspaces, selectedAgentId],
	);
	const selectedAgent = selectedAgentContext?.agent || null;
	const selectedWorkspaceId = selectedAgentContext?.workspace.id;
	const selectedWorkspaceAgents = selectedAgentContext?.workspace.agents || [];
	const selectedQueuedInstructions = selectedAgent
		? queuedInstructionsByAgent[selectedAgent.id] || []
		: [];
	const selectedAgentEvents = selectedAgent
		? agentEventsByAgent[selectedAgent.id] || []
		: [];
	const selectedLogsLoading = selectedAgent
		? Boolean(logsLoadingByAgent[selectedAgent.id])
		: false;
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
				return (
					findAgentContext(nextState.workspaces, candidate)?.agent.id || null
				);
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

	const dispatchMessageToAgent = useCallback(
		async (agentId: string, payload: MessagePayload) => {
			const next = await sendAgentMessage({
				agentId,
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

	const enqueueInstruction = useCallback(
		(agentId: string, payload: MessagePayload) => {
			const item: QueuedInstruction = {
				id: `queue-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
				message: payload.message,
				createdAt: new Date().toLocaleTimeString([], {
					hour: "2-digit",
					minute: "2-digit",
				}),
				attachments: payload.attachments,
				provider: payload.provider,
				model: payload.model,
				agentMode: payload.agentMode,
			};
			setQueuedInstructionsByAgent((prev) => ({
				...prev,
				[agentId]: [...(prev[agentId] || []), item],
			}));
		},
		[],
	);

	const handleSendMessage = useCallback(
		async (payload: MessagePayload) => {
			if (!selectedAgent) {
				return;
			}
			if (selectedAgent.status === "running") {
				enqueueInstruction(selectedAgent.id, payload);
				return;
			}
			await dispatchMessageToAgent(selectedAgent.id, payload);
		},
		[dispatchMessageToAgent, enqueueInstruction, selectedAgent],
	);

	const handleDeployNewAgent = useCallback(
		async (payload: MessagePayload) => {
			if (!selectedAgent) {
				return;
			}
			const existingAgentIds = new Set(
				workspaces.flatMap((workspace) =>
					workspace.agents.map((agent) => agent.id),
				),
			);
			try {
				const next = await createAgent({
					prompt: payload.message,
					repo: selectedAgent.repo,
					provider: payload.provider || selectedAgent.provider,
					model: payload.model || selectedAgent.model || settings.defaultModel,
				});
				const createdAgentId =
					next.workspaces
						.flatMap((workspace) => workspace.agents)
						.find((agent) => !existingAgentIds.has(agent.id))?.id || null;
				syncState(next, createdAgentId);
			} catch (error) {
				const message =
					error instanceof Error ? error.message : "Failed to deploy agent";
				if (typeof window !== "undefined") {
					window.alert(message);
				}
			}
		},
		[selectedAgent, settings.defaultModel, syncState, workspaces],
	);

	const handleRemoveQueuedInstruction = useCallback(
		(queueItemId: string) => {
			if (!selectedAgent) {
				return;
			}
			setQueuedInstructionsByAgent((prev) => {
				const current = prev[selectedAgent.id] || [];
				const nextQueue = current.filter((item) => item.id !== queueItemId);
				if (nextQueue.length === current.length) {
					return prev;
				}
				const next = { ...prev };
				if (nextQueue.length === 0) {
					delete next[selectedAgent.id];
				} else {
					next[selectedAgent.id] = nextQueue;
				}
				return next;
			});
		},
		[selectedAgent],
	);

	const handleStopAgent = useCallback(async () => {
		if (!selectedAgent || selectedAgent.status !== "running") {
			return;
		}
		const agentId = selectedAgent.id;
		setStoppingAgentId(agentId);
		setWorkspaces((prev) =>
			prev.map((workspace) => ({
				...workspace,
				agents: workspace.agents.map((agent) => {
					if (agent.id !== agentId) {
						return agent;
					}
					return {
						...agent,
						status: "error",
						messages: [
							...agent.messages,
							{
								id: `m-${Date.now()}-stop`,
								role: "system",
								content: "Stop requested. Terminating execution...",
								timestamp: new Date().toLocaleTimeString([], {
									hour: "2-digit",
									minute: "2-digit",
								}),
							},
						],
					};
				}),
			})),
		);
		try {
			await killAgent(agentId);
			await refreshState(agentId);
		} catch (error) {
			const message =
				error instanceof Error ? error.message : "Failed to stop agent";
			if (typeof window !== "undefined") {
				window.alert(message);
			}
			await refreshState(agentId).catch(() => {});
		} finally {
			setStoppingAgentId(null);
		}
	}, [refreshState, selectedAgent]);

	const handleLoadAgentEvents = useCallback(async () => {
		if (!selectedAgent) {
			return;
		}
		const agentId = selectedAgent.id;
		setLogsLoadingByAgent((prev) => ({ ...prev, [agentId]: true }));
		try {
			const events = await getAgentEvents(agentId);
			setAgentEventsByAgent((prev) => ({ ...prev, [agentId]: events }));
		} finally {
			setLogsLoadingByAgent((prev) => ({ ...prev, [agentId]: false }));
		}
	}, [selectedAgent]);

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

	useEffect(() => {
		const validAgentIds = new Set(
			workspaces.flatMap((workspace) =>
				workspace.agents.map((agent) => agent.id),
			),
		);
		setQueuedInstructionsByAgent((prev) => {
			let changed = false;
			const next: Record<string, QueuedInstruction[]> = {};
			for (const [agentId, queue] of Object.entries(prev)) {
				if (!validAgentIds.has(agentId)) {
					changed = true;
					continue;
				}
				next[agentId] = queue;
			}
			return changed ? next : prev;
		});
		setAgentEventsByAgent((prev) => {
			let changed = false;
			const next: Record<string, AgentExecutionEvent[]> = {};
			for (const [agentId, events] of Object.entries(prev)) {
				if (!validAgentIds.has(agentId)) {
					changed = true;
					continue;
				}
				next[agentId] = events;
			}
			return changed ? next : prev;
		});
		setLogsLoadingByAgent((prev) => {
			let changed = false;
			const next: Record<string, boolean> = {};
			for (const [agentId, loading] of Object.entries(prev)) {
				if (!validAgentIds.has(agentId)) {
					changed = true;
					continue;
				}
				next[agentId] = loading;
			}
			return changed ? next : prev;
		});
	}, [workspaces]);

	useEffect(() => {
		const statuses = new Map<string, AgentStatus>();
		for (const workspace of workspaces) {
			for (const agent of workspace.agents) {
				statuses.set(agent.id, agent.status);
			}
		}

		for (const [agentId, queue] of Object.entries(queuedInstructionsByAgent)) {
			if (queue.length === 0) {
				continue;
			}
			const status = statuses.get(agentId);
			if (status === "running" || status === "error" || !status) {
				continue;
			}
			if (queueDispatchingRef.current.has(agentId)) {
				continue;
			}
			const nextItem = queue[0];
			if (!nextItem) {
				continue;
			}

			queueDispatchingRef.current.add(agentId);
			void (async () => {
				try {
					await dispatchMessageToAgent(agentId, {
						message: nextItem.message,
						attachments: nextItem.attachments,
						provider: nextItem.provider,
						model: nextItem.model,
						agentMode: nextItem.agentMode,
					});
				} catch (error) {
					const message =
						error instanceof Error
							? error.message
							: "Failed to process queued instruction";
					if (typeof window !== "undefined") {
						window.alert(message);
					}
				} finally {
					setQueuedInstructionsByAgent((prev) => {
						const current = prev[agentId] || [];
						if (current.length === 0 || current[0]?.id !== nextItem.id) {
							return prev;
						}
						const rest = current.slice(1);
						const next = { ...prev };
						if (rest.length === 0) {
							delete next[agentId];
						} else {
							next[agentId] = rest;
						}
						return next;
					});
					queueDispatchingRef.current.delete(agentId);
				}
			})();
		}
	}, [dispatchMessageToAgent, queuedInstructionsByAgent, workspaces]);

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
							onDeployNewAgent={handleDeployNewAgent}
							providers={settings.providers}
							workspaceId={selectedWorkspaceId}
							workspaceAgents={selectedWorkspaceAgents}
							queuedInstructions={selectedQueuedInstructions}
							onRemoveQueuedInstruction={handleRemoveQueuedInstruction}
							onStopAgent={handleStopAgent}
							stoppingAgent={stoppingAgentId === selectedAgent.id}
							agentEvents={selectedAgentEvents}
							logsLoading={selectedLogsLoading}
							onLoadAgentEvents={handleLoadAgentEvents}
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
