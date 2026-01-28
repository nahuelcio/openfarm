import type { ChatRole, JobStatus, QuestionType } from "../constants";

export interface AgentQuestion {
  id: string;
  question: string;
  type: QuestionType;
  options?: string[];
  createdAt: string;
  answeredAt?: string;
  answer?: string;
}

export interface ChatMessage {
  id?: string;
  sessionId?: string;
  role: ChatRole;
  content: string;
  timestamp: string;
  citedFiles?: string[];
  jobId?: string;
}

export interface Job {
  id: string;
  bugId: string;
  /** Alias for bugId - prefer using this for clarity */
  workItemId?: string;
  /** Type of work item (Bug, Task, User Story, Feature, etc.) */
  workItemType?: string;
  status: JobStatus;
  result?: string;
  output?: string; // Textual output from preview mode or query execution
  logs: string[];
  chat?: ChatMessage[];
  createdAt: string;
  completedAt?: string;
  executionTimeSeconds?: number; // Tiempo de ejecución en segundos (calculado cuando se completa o falla)
  model?: string;
  questions?: AgentQuestion[];
  currentQuestionId?: string;
  project?: string;
  repositoryUrl?: string;
  workItemTitle?: string;
  workItemDescription?: string;
  changes?: {
    filesModified?: string[];
    filesCreated?: string[];
    filesDeleted?: string[];
    diff?: string;
    summary?: string;
  };
  workflowExecutionId?: string;
}

export interface WorkItem {
  id: string;
  title: string;
  description: string;
  acceptanceCriteria: string;
  workItemType: string; // Bug, Task, User Story, Feature, etc.
  source: "azure-devops" | "local" | "github";
  status: "new" | "assigned" | "fixing" | "pr-created" | "completed" | "failed";
  assignedAgentId?: string;
  prUrl?: string;
  branchName?: string;
  /** Alias for branchName used by some workflow YAML expressions */
  defaultBranch?: string;
  project: string; // Project that owns the work item (can be different from board project)
  repositoryUrl?: string; // Repository URL (can be Azure DevOps or external)
  azureRepositoryId?: string; // Azure DevOps repository ID (if using Azure repo)
  azureRepositoryProject?: string; // Azure DevOps project that owns the repository
  tags?: string[]; // Tags from Azure DevOps
  state?: string; // Azure DevOps state (New, Active, Resolved, etc.)
  assignedTo?: string; // Assigned to user (display name or email) - deprecated, use assignee
  assignee?: {
    id: string;
    name: string;
    avatarUrl?: string;
  }; // Assigned user with full structure
  priority?: "low" | "medium" | "high" | "critical"; // Priority level
  preInstructions?: string; // Optional pre-instructions/hints to help the agent understand what to do
  chatMessages?: string;
  originalWorkItemId?: string; // For edited workitems: reference to the original Azure workitem ID
  resumeFromStepId?: string; // Optional step ID to resume workflow execution from
  previousExecutionId?: string; // Optional previous execution ID for resuming workflows
  previewMode?: boolean; // Optional preview mode flag for workflow execution
  workflowId?: string; // Optional workflow ID to use for execution
  mode?: "investigate" | "modify" | "explain"; // Optional chat mode for conversational workflows
}

// Alias for backward compatibility
export type Bug = WorkItem;

export interface Agent {
  id: string;
  name: string;
  status: "idle" | "busy";
  currentBugId?: string;
}

export interface AgentConfig {
  copilotToken: string;
  azureOrgUrl: string;
  azureProject: string; // Project that contains the Board (Project A)
  azurePat: string;
  workDir: string; // Base working directory for cloning repos
  model?: string; // Optional model override
  copilotApiBase?: string;
  gitUserName?: string; // Git user name for commits (default: "Minions Farm Agent")
  gitUserEmail?: string; // Git user email for commits (default: "minions-farm@automated.local")
}

export interface AgentConfigurationRules {
  allowedFilePatterns?: string[]; // Glob patterns for allowed files (e.g., ["*.ts", "src/**"])
  blockedFilePatterns?: string[]; // Glob patterns for blocked files
  maxFileChanges?: number; // Maximum number of files that can be modified
  allowedDirectories?: string[]; // Allowed directories (e.g., ["src", "lib"])
  blockedDirectories?: string[]; // Blocked directories (e.g., ["node_modules", "dist"])
  maxIterations?: number; // Máximo de rondas iterativas (default: 5)
  iterationStrategy?: "auto" | "manual" | "hybrid"; // Cómo gestionar iteraciones
  humanInTheLoop?: {
    enabled: boolean;
    triggerOnTokenThreshold?: number; // Porcentaje del límite (default: 80%)
    triggerOnFileRequest?: boolean; // Preguntar cuando el engine pide archivos
  };
  maxRoundsBehavior?: "fail" | "ask_user" | "continue"; // Qué hacer al alcanzar maxIterations
}

export interface AgentConfiguration {
  id: string;
  project?: string; // Azure DevOps project name (optional, applies to entire project)
  repositoryId?: string; // Azure DevOps repository ID (optional)
  repositoryUrl?: string; // Repository URL (optional, for external repos)
  model: string; // Model to use (e.g., "gpt-5-mini", "gpt-4", "claude-3-opus")
  fallbackModel?: string; // Model to use if the primary model fails
  rules?: AgentConfigurationRules; // Rules and restrictions
  mcpServers?: string[]; // List of MCP server commands (e.g., ["npx @upstash/context7-mcp"])
  prompt?: string; // Custom prompt (optional, overrides default)
  enabled: boolean; // Whether the configuration is active
  branchNamingPattern?: string; // Pattern for branch names (e.g., "fix/{type}-{id}", "feature/{id}")
  defaultBranch?: string; // Default base branch (e.g., "dev", "main", "master")
  createPullRequest?: boolean; // Whether to automatically create Pull Requests (default: false)
  pushBranch?: boolean; // Whether to push branch to remote (default: true)
  workflowId?: string; // Optional workflow ID to use for modular execution (defaults to default-agent-workflow)
  maxIterations?: number; // Override de maxIterations en rules
  humanInTheLoop?: AgentConfigurationRules["humanInTheLoop"]; // Override de humanInTheLoop
  provider?: "direct-llm" | "opencode" | "claude-code"; // Provider de coding engine
  containerName?: string; // Docker container name for engine (optional)
  createdAt: string;
  updatedAt: string;
}

export type { Integration } from "./adapters";
