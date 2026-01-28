import type { Result } from "@openfarm/result";
import type { WorkItem } from "./domain";

export interface CreatePRParams {
  source: string;
  target: string;
  title: string;
  description?: string;
}

// Platform Adapter Interface
export interface PlatformAdapter {
  getWorkItem(id: string): Promise<Result<WorkItem>>;
  createPullRequest(params: CreatePRParams): Promise<Result<string>>;
  postComment(id: string, text: string): Promise<Result<void>>;

  // MVP methods
  testConnection(): Promise<Result<boolean>>;
  getName(): string;
}

export interface ChangesSummary {
  filesModified?: string[];
  filesCreated?: string[];
  filesDeleted?: string[];
  diff?: string;
  summary?: string;
  totalCost?: number;
}

// Coding Engine Interface
export interface CodingEngine {
  applyChanges(
    instruction: string,
    repoPath: string,
    contextFiles?: string[]
  ): Promise<Result<ChangesSummary>>;

  applyChangesIterative?(
    instruction: string,
    repoPath: string,
    contextFiles?: string[],
    jobId?: string
  ): Promise<Result<ChangesSummary>>;

  // MVP methods
  getName(): string;
  getSupportedModels(): Promise<string[]>;
  cancelExecution?(executionId: string): Promise<Result<void>>;
}

// Integration/Vault Credentials
export interface Integration {
  id: string;
  name: string; // "My Azure Account", "Personal GitHub"
  type: "azure" | "github" | "gitlab";
  credentials: string; // PAT or token (plain text for MVP)
  organization?: string; // For Azure (Organization URL)
  gitUserName?: string; // Custom Git name for commits
  gitUserEmail?: string; // Custom Git email for commits
  createdAt: string;
  lastTestedAt?: string;
  lastTestStatus?: "success" | "failed";
}
