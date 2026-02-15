import type { InstalledMcp } from "@openfarm/mcp-marketplace/browser";
import {
	getByCategory,
	getCategories,
	getCatalogEntries as getMcps,
	searchAvailable,
} from "@openfarm/mcp-marketplace/browser";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// Simple debounce utility
function debounce<T extends (...args: any[]) => void>(func: T, wait: number): T {
	let timeout: NodeJS.Timeout;
	return ((...args: Parameters<T>) => {
		clearTimeout(timeout);
		timeout = setTimeout(() => func(...args), wait);
	}) as T;
}
import { AgentPanel } from "@/components/conductor/agent-panel";
import { AppSidebar } from "@/components/conductor/app-sidebar";
import { EmptyState } from "@/components/conductor/empty-state";
import { AgentCreationDialog } from "@/components/conductor/agent-creation-dialog";
import { AdvancedSettingsPanel } from "@/components/conductor/advanced-settings-panel";
import { Titlebar } from "@/components/conductor/titlebar";
import { McpConfigDialog, McpMarketplaceView } from "@/components/mcp";
import { PlanReviewManager } from "@/components/plan-review";
import {
	addLocalWorkspace,
	archiveAgentConversation,
	bootstrapAppState,
	createAgent,
	getAgentEvents,
	getInstalledMcps,
	getProviderCatalog,
	getSettings,
	installMcp,
	killAgent,
	listRepositoryBranches,
	loadAgentDiffs,
	pickRepositoryDirectory,
	saveSettings,
	sendAgentMessage,
	subscribeAgentEvents,
	uninstallMcp,
} from "@/lib/backend";
import { mcpManager } from "@/lib/mcp-manager";
import {
	cleanupProviderMcpIntegrations,
	initializeProviderMcpIntegrations,
} from "@/lib/provider-mcp-integration";
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
import {
	extractSubthreads,
	filterMessagesForSubthread,
} from "@/lib/subthreads";
import { cn } from "@/lib/utils";

interface SelectedAgentContext {
	agent: Agent;
	workspace: Workspace;
}

interface SelectedSubthreadContext {
	agentId: string;
	name: string;
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
	const [isAppLoading, setIsAppLoading] = useState(true);
	const [isLoadingChat, setIsLoadingChat] = useState(false);
	const [sidebarOpen, setSidebarOpen] = useState(() => {
		// Default to closed on smaller screens
		if (typeof window !== 'undefined') {
			return window.innerWidth >= 768; // md breakpoint
		}
		return true;
	});
	const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
	const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
	const [selectedSubthread, setSelectedSubthread] =
		useState<SelectedSubthreadContext | null>(null);
	const [isSelectingAgent, setIsSelectingAgent] = useState(false);
	const [newAgentOpen, setNewAgentOpen] = useState(false);
	const [newAgentInitialRepo, setNewAgentInitialRepo] = useState<
		string | undefined
	>(undefined);
	const [newAgentInitialWorkspaceId, setNewAgentInitialWorkspaceId] = useState<
		string | undefined
	>(undefined);
	const [settingsOpen, setSettingsOpen] = useState(false);
	const [marketplaceOpen, setMarketplaceOpen] = useState(false);
	const [mcpConfigOpen, setMcpConfigOpen] = useState(false);
	const [selectedMcpId, setSelectedMcpId] = useState<string | null>(null);
	const [installedMcps, setInstalledMcps] = useState<
		Array<{
			id: string;
			provider: AgentProvider;
			config: Record<string, any>;
			installedAt: string;
		}>
	>([]);
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
	const [planReviewOpen, setPlanReviewOpen] = useState(false);
	const queueDispatchingRef = useRef<Set<string>>(new Set());
	const selectedAgentContext = useMemo(
		() => findAgentContext(workspaces, selectedAgentId),
		[workspaces, selectedAgentId],
	);
	
	// Memoized findAgentContext to prevent recalculations
	const memoizedFindAgentContext = useMemo(
		() => findAgentContext,
		[]
	);
	const selectedAgent = selectedAgentContext?.agent || null;
	const selectedSubthreadName =
		selectedAgent && selectedSubthread?.agentId === selectedAgent.id
			? selectedSubthread.name
			: null;
	const selectedAgentMessages = useMemo(() => {
		if (!selectedAgent) {
			return [];
		}
		if (!selectedSubthreadName) {
			return selectedAgent.messages;
		}
		return filterMessagesForSubthread(
			selectedAgent.messages,
			selectedSubthreadName,
		);
	}, [selectedAgent, selectedSubthreadName]);
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
				id: workspace.id,
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
				// If we have a preferred agent ID (from user action), use it
				if (preferredAgentId) {
					const context = findAgentContext(nextState.workspaces, preferredAgentId);
					return context?.agent.id || null;
				}
				// Otherwise, try to preserve the current selection if it still exists
				if (prev) {
					const context = findAgentContext(nextState.workspaces, prev);
					return context?.agent.id || null;
				}
				// If no current selection, don't auto-select anything
				return null;
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

	// Debounced version for events to prevent excessive calls
	const debouncedRefreshState = useMemo(
		() => debounce(refreshState, 2000), // Increased to 2 seconds
		[refreshState]
	);

	useEffect(() => {
		let mounted = true;
		void (async () => {
			const state = await bootstrapAppState();
			if (!mounted) {
				return;
			}
			// Only sync state if no agent is currently selected
			if (!selectedAgentId) {
				syncState(state);
			} else {
				// Just update workspaces and settings, preserve selection
				setWorkspaces(state.workspaces);
				setSettings(state.settings);
			}
			// Mark app as loaded
			setIsAppLoading(false);
		})();

		const active = setInterval(() => {
			// Only refresh if no agent is selected to avoid interfering with user interaction
			if (!selectedAgentId) {
				debouncedRefreshState();
			}
		}, 30000); // Increased to 30 seconds - much less frequent

		// Handle window resize for responsive sidebar
		const handleResize = () => {
			if (typeof window !== 'undefined') {
				const isMobile = window.innerWidth < 768;
				if (isMobile && sidebarOpen) {
					// Optionally close sidebar on mobile when resizing down
					// setSidebarOpen(false);
				}
			}
		};

		window.addEventListener('resize', handleResize);

		let unsubs: Array<() => void> = [];
		void (async () => {
			unsubs = [
				await subscribeAgentEvents("agent:started", () => {
					// Don't refresh state - let the existing intervals handle it
					// This prevents blocking the UI when user is interacting
				}),
				await subscribeAgentEvents("agent:completed", async (payload) => {
					const value = payload as { agent_id?: string; agentId?: string; statistics?: any };
					const id = value.agent_id || value.agentId;
					if (!id) {
						return;
					}
					
					// Update agent with statistics if available
					if (value.statistics) {
						setWorkspaces((prev) =>
							prev.map((workspace) => ({
								...workspace,
								agents: workspace.agents.map((agent) => {
									if (agent.id === id) {
										const lastMessage = agent.messages[agent.messages.length - 1];
										if (lastMessage && lastMessage.role === "agent") {
											return {
												...agent,
												messages: [
													...agent.messages.slice(0, -1),
													{
														...lastMessage,
														statistics: value.statistics,
														thinking: false,
													},
												],
											};
										}
									}
									return agent;
								})
							}))
						);
					}
					
					// Don't refresh state - let the existing intervals handle it
					// This prevents blocking the UI when user is interacting
				}),
				await subscribeAgentEvents("agent:failed", async (payload) => {
					const value = payload as { agent_id?: string; agentId?: string; statistics?: any };
					const id = value.agent_id || value.agentId;
					if (!id) {
						return;
					}
					
					// Update agent with statistics if available
					if (value.statistics) {
						setWorkspaces((prev) =>
							prev.map((workspace) => ({
								...workspace,
								agents: workspace.agents.map((agent) => {
									if (agent.id === id) {
										const lastMessage = agent.messages[agent.messages.length - 1];
										if (lastMessage && lastMessage.role === "agent") {
											return {
												...agent,
												messages: [
													...agent.messages.slice(0, -1),
													{
														...lastMessage,
														statistics: value.statistics,
														thinking: false,
													},
												],
											};
										}
									}
									return agent;
								})
							}))
						);
					}
					
					// Don't refresh state - let the existing intervals handle it
					// This prevents blocking the UI when user is interacting
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
			];
		})();

		return () => {
			mounted = false;
			clearInterval(active);
			window.removeEventListener('resize', handleResize);
			for (const unlisten of unsubs) {
				unlisten();
			}
		};
	}, [refreshState, selectedAgentId, syncState, sidebarOpen]);

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

		// Cargar MCPs instalados
		void (async () => {
			try {
				const mcps = await getInstalledMcps();
				setInstalledMcps(mcps);
			} catch (error) {
				console.log("MCP commands not available, using localStorage fallback");
				// Intentar cargar desde localStorage
				try {
					const existingData = localStorage.getItem("openfarm-installed-mcps");
					const mcps = existingData ? JSON.parse(existingData) : [];
					setInstalledMcps(mcps);
				} catch (localStorageError) {
					console.log(
						"No installed MCPs found in localStorage, using empty state",
					);
					setInstalledMcps([]);
				}
			}
		})();
	}, []);

	const handleSelectAgent = useCallback((agent: Agent) => {
		// Don't do anything if this agent is already selected or we're already selecting
		if (selectedAgentId === agent.id || isSelectingAgent || isLoadingChat) {
			return;
		}
		
		// Set loading states for visual feedback
		setIsSelectingAgent(true);
		setIsLoadingChat(true);
		
		// Immediate UI update - NO backend calls for instant response
		setSelectedAgentId(agent.id);
		setSelectedSubthread(null);
		
		// Clear loading states after a short delay (simulates loading)
		// This gives visual feedback that something is happening
		requestAnimationFrame(() => {
			setTimeout(() => {
				setIsSelectingAgent(false);
				setIsLoadingChat(false);
			}, 150);
		});
	}, [selectedAgentId, isSelectingAgent, isLoadingChat]);

	const handleSelectSubthread = useCallback(
		(agent: Agent, subthreadName: string) => {
			// Don't do anything if this subthread is already selected or we're already selecting
			if (selectedAgentId === agent.id && selectedSubthread?.name === subthreadName) {
				return;
			}
			
			// Set loading states for visual feedback
			setIsSelectingAgent(true);
			setIsLoadingChat(true);
			
			// Immediate UI update - NO backend calls for instant response
			setSelectedAgentId(agent.id);
			setSelectedSubthread({
				agentId: agent.id,
				name: subthreadName,
			});
			
			// Clear loading states after a short delay
			requestAnimationFrame(() => {
				setTimeout(() => {
					setIsSelectingAgent(false);
					setIsLoadingChat(false);
				}, 150);
			});
		},
		[selectedAgentId, selectedSubthread],
	);

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

	const handleForceSendQueuedInstruction = useCallback(
		async (queueItemId: string) => {
			if (!selectedAgent) {
				return;
			}
			const agentId = selectedAgent.id;
			if (queueDispatchingRef.current.has(agentId)) {
				return;
			}

			let queuedItem: QueuedInstruction | undefined;
			setQueuedInstructionsByAgent((prev) => {
				const current = prev[agentId] || [];
				queuedItem = current.find((item) => item.id === queueItemId);
				if (!queuedItem) {
					return prev;
				}
				const nextQueue = current.filter((item) => item.id !== queueItemId);
				const next = { ...prev };
				if (nextQueue.length === 0) {
					delete next[agentId];
				} else {
					next[agentId] = nextQueue;
				}
				return next;
			});

			if (!queuedItem) {
				return;
			}

			queueDispatchingRef.current.add(agentId);
			try {
				await dispatchMessageToAgent(agentId, {
					message: queuedItem.message,
					attachments: queuedItem.attachments,
					provider: queuedItem.provider,
					model: queuedItem.model,
					agentMode: queuedItem.agentMode,
				});
			} catch (error) {
				const message =
					error instanceof Error
						? error.message
						: "Failed to force send queued instruction";
				if (typeof window !== "undefined") {
					window.alert(message);
				}
				setQueuedInstructionsByAgent((prev) => ({
					...prev,
					[agentId]: [
						queuedItem as QueuedInstruction,
						...(prev[agentId] || []),
					],
				}));
			} finally {
				queueDispatchingRef.current.delete(agentId);
			}
		},
		[dispatchMessageToAgent, selectedAgent],
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
			workspaceId?: string;
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
			setNewAgentInitialRepo(undefined);
			setNewAgentInitialWorkspaceId(undefined);
		},
		[syncState],
	);

	const handleArchiveConversation = useCallback(async () => {
		if (!selectedAgent) {
			return;
		}
		try {
			const next = await archiveAgentConversation(selectedAgent.id);
			syncState(next, null);
		} catch (error) {
			const message =
				error instanceof Error
					? error.message
					: "Failed to archive conversation";
			if (typeof window !== "undefined") {
				window.alert(message);
			}
		}
	}, [selectedAgent, syncState]);

	const handleArchiveAgentFromSidebar = useCallback(
		async (agent: Agent) => {
			try {
				const next = await archiveAgentConversation(agent.id);
				syncState(next, null);
				// If the archived agent was selected, clear the selection
				if (selectedAgentId === agent.id) {
					syncState(next, null);
				}
			} catch (error) {
				const message =
					error instanceof Error
						? error.message
						: "Failed to archive conversation";
				if (typeof window !== "undefined") {
					window.alert(message);
				}
			}
		},
		[selectedAgentId, syncState],
	);

	const handleSpawnAgentInWorkspace = useCallback((workspace: Workspace) => {
		setNewAgentInitialRepo(workspace.repo);
		setNewAgentInitialWorkspaceId(workspace.id);
		setNewAgentOpen(true);
	}, []);

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

	const handleMcpInstall = useCallback((mcpId: string) => {
		setSelectedMcpId(mcpId);
		setMcpConfigOpen(true);
	}, []);

	const handleMcpConfigSubmit = useCallback(
		async (config: {
			mcpId: string;
			provider: AgentProvider;
			config: Record<string, any>;
		}) => {
			try {
				const updatedMcps = await installMcp(config);
				setInstalledMcps(updatedMcps);
				console.log("MCP installed successfully:", config);
			} catch (error) {
				console.log("MCP commands not available, using localStorage fallback");
				// Si los comandos no están disponibles, guardamos en localStorage directamente
				try {
					const existingData = localStorage.getItem("openfarm-installed-mcps");
					const mcps = existingData ? JSON.parse(existingData) : [];

					// Buscar si ya existe
					const existingIndex = mcps.findIndex(
						(mcp: any) =>
							mcp.id === config.mcpId && mcp.provider === config.provider,
					);

					const mcpEntry = {
						id: config.mcpId,
						provider: config.provider,
						config: config.config,
						installedAt: new Date().toISOString(),
					};

					if (existingIndex >= 0) {
						mcps[existingIndex] = mcpEntry;
					} else {
						mcps.push(mcpEntry);
					}

					localStorage.setItem("openfarm-installed-mcps", JSON.stringify(mcps));
					setInstalledMcps(mcps);
					console.log("MCP installed successfully via localStorage:", config);
				} catch (localStorageError) {
					console.error("Failed to install MCP:", localStorageError);
					const message =
						localStorageError instanceof Error
							? localStorageError.message
							: "Failed to install MCP";
					if (typeof window !== "undefined") {
						window.alert(message);
					}
					return; // No cerrar los diálogos si hay error
				}
			}

			// Cerrar diálogos solo si la instalación fue exitosa
			setMcpConfigOpen(false);
			setSelectedMcpId(null);
			setMarketplaceOpen(false);
		},
		[],
	);

	const handleToggleMcp = useCallback(
		(mcpId: string, provider: AgentProvider) => {
			// Toggle MCP active/inactive status
			const existingData = localStorage.getItem("openfarm-mcp-status");
			const statusMap = existingData ? JSON.parse(existingData) : {};

			const key = `${mcpId}-${provider}`;
			statusMap[key] = !statusMap[key]; // Toggle

			localStorage.setItem("openfarm-mcp-status", JSON.stringify(statusMap));
			console.log(
				`MCP ${mcpId} ${statusMap[key] ? "activated" : "deactivated"}`,
			);
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
				if (validAgentIds.has(agentId)) {
					next[agentId] = queue;
				} else {
					changed = true;
				}
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
		setSelectedSubthread((prev) => {
			if (!prev) {
				return prev;
			}
			const context = findAgentContext(workspaces, prev.agentId);
			if (!context) {
				return null;
			}
			const stillExists = extractSubthreads(context.agent).some(
				(thread) => thread.name === prev.name,
			);
			return stillExists ? prev : null;
		});
	}, [workspaces]);

	// Initialize MCP Manager
	useEffect(() => {
		const initializeMcpSystem = async () => {
			try {
				// Initialize MCP Manager
				await mcpManager.loadServers();
				console.log("🚀 MCP Manager initialized and servers loaded");

				// Initialize all provider integrations
				await initializeProviderMcpIntegrations();
				console.log("🚀 All provider MCP integrations initialized");
			} catch (error) {
				console.error("❌ Failed to initialize MCP system:", error);
			}
		};

		initializeMcpSystem();

		// Cleanup on unmount
		return () => {
			mcpManager.cleanup();
			cleanupProviderMcpIntegrations();
		};
	}, []);

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

	// Show loading screen while app is initializing
	if (isAppLoading) {
		return (
			<div className="flex h-screen flex-col items-center justify-center bg-background">
				<div className="flex flex-col items-center gap-4">
					<div className="flex items-center gap-2">
						<div className="h-3 w-3 rounded-full bg-primary animate-pulse" />
						<div className="h-3 w-3 rounded-full bg-primary animate-pulse" style={{ animationDelay: "0.2s" }} />
						<div className="h-3 w-3 rounded-full bg-primary animate-pulse" style={{ animationDelay: "0.4s" }} />
					</div>
					<span className="text-sm text-muted-foreground">Loading OpenFarm...</span>
				</div>
			</div>
		);
	}

	return (
		<div className="flex h-screen flex-col overflow-hidden">
			<Titlebar
				onNewAgent={() => {
					setNewAgentInitialRepo(undefined);
					setNewAgentInitialWorkspaceId(undefined);
					setNewAgentOpen(true);
				}}
				onOpenSettings={() => setSettingsOpen(true)}
				onOpenMarketplace={() => setMarketplaceOpen(true)}
				onToggleSidebar={() => setSidebarOpen((value) => !value)}
				sidebarOpen={sidebarOpen}
			/>

			<div className="flex flex-1 overflow-hidden relative">
				{/* Mobile backdrop */}
				{sidebarOpen && (
					<div 
						className="fixed inset-0 bg-black/50 z-[5] md:hidden" 
						onClick={() => setSidebarOpen(false)}
					/>
				)}
				<div
					className={cn(
						"shrink-0 overflow-hidden border-r border-border transition-all duration-200 z-10",
						sidebarOpen ? "w-60 md:w-72 xl:w-80" : "w-0",
						"md:relative absolute inset-y-0 left-0",
						"md:translate-x-0", 
						sidebarOpen ? "translate-x-0" : "-translate-x-full"
					)}
				>
					<AppSidebar
						onAddWorkspace={handleAddWorkspace}
						onSelectAgent={handleSelectAgent}
						onSelectSubthread={handleSelectSubthread}
						onSpawnAgentInWorkspace={handleSpawnAgentInWorkspace}
						onArchiveAgent={handleArchiveAgentFromSidebar}
						selectedAgentId={selectedAgentId}
						selectedSubthread={selectedSubthread}
						workspaces={workspaces}
						onOpenPlanReview={() => setPlanReviewOpen(true)}
						isSelectingAgent={isSelectingAgent}
					/>
				</div>

				<main className="min-w-0 flex-1 relative">
					{/* Chat loading overlay */}
					{isLoadingChat && (
						<div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-20 flex items-center justify-center">
							<div className="flex flex-col items-center gap-3">
								<div className="flex items-center gap-1.5">
									<div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
									<div className="h-2 w-2 rounded-full bg-primary animate-pulse" style={{ animationDelay: "0.15s" }} />
									<div className="h-2 w-2 rounded-full bg-primary animate-pulse" style={{ animationDelay: "0.3s" }} />
								</div>
								<span className="text-xs text-muted-foreground">Loading chat...</span>
							</div>
						</div>
					)}
					{planReviewOpen ? (
						<PlanReviewManager />
					) : selectedAgent ? (
						<AgentPanel
							agent={selectedAgent}
							onSendMessage={handleSendMessage}
							onDeployNewAgent={handleDeployNewAgent}
							providers={settings.providers}
							installedMcps={installedMcps}
							onToggleMcp={handleToggleMcp}
							workspaceId={selectedWorkspaceId}
							workspaceAgents={selectedWorkspaceAgents}
							queuedInstructions={selectedQueuedInstructions}
							onRemoveQueuedInstruction={handleRemoveQueuedInstruction}
							onForceSendQueuedInstruction={handleForceSendQueuedInstruction}
							onStopAgent={handleStopAgent}
							onArchiveConversation={handleArchiveConversation}
							stoppingAgent={stoppingAgentId === selectedAgent.id}
							agentEvents={selectedAgentEvents}
							logsLoading={selectedLogsLoading}
							onLoadAgentEvents={handleLoadAgentEvents}
							messages={selectedAgentMessages}
							activeSubthreadName={selectedSubthreadName}
							onBackToMainThread={() => setSelectedSubthread(null)}
						/>
					) : (
						<EmptyState onNewAgent={() => setNewAgentOpen(true)} />
					)}
				</main>
			</div>

			<AgentCreationDialog
				onBrowseRepo={pickRepositoryDirectory}
				onClose={() => {
					setNewAgentOpen(false);
					setNewAgentInitialRepo(undefined);
					setNewAgentInitialWorkspaceId(undefined);
				}}
				onListBranches={listRepositoryBranches}
				onSubmit={handleNewAgent}
				open={newAgentOpen}
				repos={repos}
				settings={settings}
				initialRepo={newAgentInitialRepo}
				initialWorkspaceId={newAgentInitialWorkspaceId}
			/>

			<AdvancedSettingsPanel
				onClose={() => setSettingsOpen(false)}
				onSettingsChange={handleSettingsChange}
				open={settingsOpen}
				settings={settings}
			/>

			{marketplaceOpen && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
					<div className="h-[80vh] w-[90vw] max-w-4xl overflow-hidden rounded-lg border bg-background shadow-xl">
						<McpMarketplaceView
							catalog={getMcps()}
							installed={installedMcps.map((mcp) => ({
								id: `${mcp.id}-${mcp.provider}`,
								catalogEntryId: mcp.id,
							}))}
							onInstall={handleMcpInstall}
							onUninstall={async (id) => {
								const [catalogEntryId] = id.split("-");
								const mcp = installedMcps.find((m) => m.id === catalogEntryId);
								if (mcp) {
									try {
										const updatedMcps = await uninstallMcp({
											mcpId: mcp.id,
											provider: mcp.provider,
										});
										setInstalledMcps(updatedMcps);
										console.log("MCP uninstalled successfully:", id);
									} catch (error) {
										console.log(
											"MCP commands not available, using localStorage fallback",
										);
										// Usar localStorage fallback
										try {
											const existingData = localStorage.getItem(
												"openfarm-installed-mcps",
											);
											const mcps = existingData ? JSON.parse(existingData) : [];

											// Filtrar para remover el MCP específico
											const updatedMcps = mcps.filter(
												(mcp: any) =>
													!(mcp.id === mcp.id && mcp.provider === mcp.provider),
											);

											localStorage.setItem(
												"openfarm-installed-mcps",
												JSON.stringify(updatedMcps),
											);
											setInstalledMcps(updatedMcps);
											console.log(
												"MCP uninstalled successfully via localStorage:",
												id,
											);
										} catch (localStorageError) {
											console.error(
												"Failed to uninstall MCP:",
												localStorageError,
											);
											const message =
												localStorageError instanceof Error
													? localStorageError.message
													: "Failed to uninstall MCP";
											if (typeof window !== "undefined") {
												window.alert(message);
											}
										}
									}
								}
							}}
						/>
					</div>
				</div>
			)}

			{selectedMcpId && (
				<McpConfigDialog
					open={mcpConfigOpen}
					onClose={() => {
						setMcpConfigOpen(false);
						setSelectedMcpId(null);
					}}
					onSubmit={handleMcpConfigSubmit}
					mcpId={selectedMcpId}
					mcpName={
						getMcps().find((mcp) => mcp.id === selectedMcpId)?.name || ""
					}
					mcpConfigSchema={
						getMcps().find((mcp) => mcp.id === selectedMcpId)?.configSchema ||
						{}
					}
					providers={settings.providers}
				/>
			)}
		</div>
	);
}
