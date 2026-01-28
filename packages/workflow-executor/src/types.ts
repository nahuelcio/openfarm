import type { LowdbInstance } from "@openfarm/core/db";
import type {
  ChangesSummary,
  CodingEngine,
  PlatformAdapter,
} from "@openfarm/core/types/adapters";
import type { ChatMessage } from "@openfarm/core/types/chat";
import type {
  AgentConfig,
  AgentConfiguration,
  AgentConfigurationRules,
  WorkItem,
} from "@openfarm/core/types/domain";
import type { GitConfig } from "@openfarm/core/types/git";
import type { ExecFunction } from "@openfarm/core/types/runtime";
import type {
  ExtendedWorkflowStep,
  WorkflowStep,
} from "@openfarm/core/types/workflow";

export type { WorkflowStep } from "@openfarm/core/types/workflow";

import type { KubernetesOrchestrator } from "../../orchestration";

export interface WorkflowContext {
  workflowId: string;
  workItemId: string;
  repoPath: string;
  repoUrl: string;
  branchName: string;
  defaultBranch: string;
  gitConfig: GitConfig;
  workItem: WorkItem;
  jobId: string;
  executionId: string;
  agentConfig?: AgentConfig;
  agentConfiguration?: AgentConfiguration;
  worktreePath?: string | null;
  podName?: string; // Name of the ephemeral Kubernetes Pod (if using ephemeral pods)
  platformAdapter?: PlatformAdapter; // Platform adapter (GitHub or Azure DevOps) determined during authentication
  metadata?: Record<string, unknown>; // Use metadata instead of indexer for flexibility
  workflowVariables?: Record<string, unknown>; // Resolved workflow-level variables
}

export type CodingEngineFactory = (options: {
  provider?: AgentConfiguration["provider"];
  model?: string;
  previewMode?: boolean;
  chatOnly?: boolean;
  mcpServers?: string[];
  rules?: AgentConfigurationRules;
  maxIterations?: number;
  onLog?: (message: string) => void | Promise<void>;
  onChanges?: (changes: ChangesSummary) => void | Promise<void>;
  onChatMessage?: (message: ChatMessage) => void | Promise<void>;
  jobId?: string;
  containerName?: string;
  podName?: string;
  namespace?: string;
  ephemeral?: boolean;
  maxTokens?: number;
  allowedTools?: string[];
  disallowedTools?: string[];
  maxTurns?: number;
  apiTimeout?: number;
  apiBaseUrl?: string;
}) => CodingEngine;

export interface ExecutionFlags {
  previewMode: boolean;
  verbose?: boolean;
}

export interface ExecutionServices {
  platformAdapter?: PlatformAdapter;
  codingEngine?: CodingEngine;
  codingEngineFactory?: CodingEngineFactory;
  defaultEngineOptions?: {
    previewMode?: boolean;
    mcpServers?: string[];
    onLog?: (message: string) => void | Promise<void>;
    onChanges?: (changes: ChangesSummary) => void | Promise<void>;
    onChatMessage?: (message: ChatMessage) => void | Promise<void>;
  };
  db?: LowdbInstance;
  executionId?: string;
  execAsync?: ExecFunction;
  kubernetesOrchestrator?: KubernetesOrchestrator;
}

export interface StepExecutionRequest {
  step: WorkflowStep | ExtendedWorkflowStep;
  context: WorkflowContext;
  stepResults?: Array<{ stepId: string; result?: string }>;
  logger: (message: string) => Promise<void>;
  flags: ExecutionFlags;
  services: ExecutionServices;
}
