"use client";

import { Clock3, SendHorizontal, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type {
	Agent,
	AgentExecutionEvent,
	AgentMode,
	AgentProvider,
	Attachment,
	ProviderConfig,
	QueuedInstruction,
} from "@/lib/store";
import { AgentHeader } from "./agent-header";
import { AgentLogsSidebar } from "./agent-logs-sidebar";
import { ChatMessages } from "./chat-messages";
import { DiffViewer } from "./diff-viewer";
import { PromptInput } from "./prompt-input";

interface AgentPanelProps {
	agent: Agent;
	workspaceId?: string;
	workspaceAgents: Agent[];
	queuedInstructions: QueuedInstruction[];
	agentEvents: AgentExecutionEvent[];
	logsLoading: boolean;
	onSendMessage: (payload: {
		message: string;
		attachments?: Attachment[];
		provider?: AgentProvider;
		model?: string;
		agentMode?: AgentMode;
	}) => void;
	onDeployNewAgent: (payload: {
		message: string;
		attachments?: Attachment[];
		provider?: AgentProvider;
		model?: string;
		agentMode?: AgentMode;
	}) => void;
	onRemoveQueuedInstruction: (queueItemId: string) => void;
	onForceSendQueuedInstruction: (queueItemId: string) => void;
	onStopAgent: () => void;
	stoppingAgent: boolean;
	onLoadAgentEvents: () => void;
	providers: ProviderConfig[];
}

export function AgentPanel({
	agent,
	workspaceId,
	workspaceAgents,
	queuedInstructions,
	agentEvents,
	logsLoading,
	onSendMessage,
	onDeployNewAgent,
	onRemoveQueuedInstruction,
	onForceSendQueuedInstruction,
	onStopAgent,
	stoppingAgent,
	onLoadAgentEvents,
	providers,
}: AgentPanelProps) {
	const [diffOpen, setDiffOpen] = useState(false);
	const [diffInitialFile, setDiffInitialFile] = useState<string | undefined>();
	const [logsOpen, setLogsOpen] = useState(false);

	const handleFileClick = (filename: string) => {
		if (agent.diffs.length > 0) {
			setDiffInitialFile(filename);
			setDiffOpen(true);
		}
	};

	const handleViewChanges = () => {
		setDiffInitialFile(undefined);
		setDiffOpen(true);
	};

	const handleToggleLogs = () => {
		const next = !logsOpen;
		setLogsOpen(next);
		if (next) {
			onLoadAgentEvents();
		}
	};

	return (
		<div className="relative flex h-full flex-col overflow-hidden bg-background">
			<AgentHeader
				agent={agent}
				onViewChanges={handleViewChanges}
				onStopAgent={onStopAgent}
				stopping={stoppingAgent}
				onToggleLogs={handleToggleLogs}
				logsOpen={logsOpen}
			/>
			<ChatMessages
				messages={agent.messages}
				isRunning={agent.status === "running"}
				onFileClick={handleFileClick}
			/>
			{queuedInstructions.length > 0 && (
				<div className="border-t border-border/70 bg-card px-4 py-2">
					<div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
						<Clock3 className="h-3.5 w-3.5" />
						<span>{queuedInstructions.length} instrucciones en cola</span>
					</div>
					<div className="max-h-28 space-y-1 overflow-y-auto pr-1">
						{queuedInstructions.map((item) => (
							<div
								key={item.id}
								className="flex items-start justify-between gap-2 rounded-md border border-border bg-background px-2 py-1.5"
							>
								<div className="min-w-0">
									<p className="truncate text-xs text-foreground">
										{item.message}
									</p>
									<p className="text-[11px] text-muted-foreground">
										{item.createdAt}
									</p>
								</div>
								<Button
									variant="ghost"
									size="icon"
									className="h-6 w-6 shrink-0 text-muted-foreground hover:text-primary"
									onClick={() => onForceSendQueuedInstruction(item.id)}
									type="button"
								>
									<SendHorizontal className="h-3.5 w-3.5" />
									<span className="sr-only">Force send queued instruction</span>
								</Button>
								<Button
									variant="ghost"
									size="icon"
									className="h-6 w-6 shrink-0 text-muted-foreground hover:text-agent-error"
									onClick={() => onRemoveQueuedInstruction(item.id)}
									type="button"
								>
									<Trash2 className="h-3.5 w-3.5" />
									<span className="sr-only">Remove queued instruction</span>
								</Button>
							</div>
						))}
					</div>
				</div>
			)}
			<PromptInput
				onSend={onSendMessage}
				onDeployAsNew={onDeployNewAgent}
				provider={agent.provider}
				model={agent.model}
				mode={agent.mode}
				providers={providers}
				agentId={agent.id}
				workspaceId={workspaceId}
				workspaceAgents={workspaceAgents}
				placeholder={
					agent.status === "error"
						? "Agent failed. Retry here or deploy as a new agent."
						: "Ask the agent anything..."
				}
			/>
			<AgentLogsSidebar
				open={logsOpen}
				agentName={agent.name}
				events={agentEvents}
				loading={logsLoading}
				onClose={() => setLogsOpen(false)}
				onRefresh={onLoadAgentEvents}
			/>

			{/* Diff viewer overlay */}
			<DiffViewer
				open={diffOpen}
				onClose={() => setDiffOpen(false)}
				diffs={agent.diffs}
				agentName={agent.name}
				initialFile={diffInitialFile}
			/>
		</div>
	);
}
