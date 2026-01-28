export interface ChatSession {
  id: string;
  userId: string; // "local-user" for now if no auth
  projectId: string; // maps to a "Project" name or ID
  repositoryUrl: string;
  branchName: string;
  status: "initializing" | "ready" | "archived";
  createdAt: string;
  expiresAt: string;
  resourceId?: string; // For future container persistence
  context?: string; // Optional context about what to focus on
}

export interface ChatSessionMessage {
  id: string;
  sessionId: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
  citedFiles?: string[];
  jobId?: string;
}

export type ChatMessage = ChatSessionMessage;

export interface ProjectContextSummary {
  id: string;
  projectId: string;
  repositoryUrl: string;
  branchName: string;
  summary: string;
  keyPoints?: string;
  fileReferences?: string;
  createdAt: string;
  updatedAt: string;
  tokenCount?: number;
  sessionIds?: string;
  expiresAt?: string;
}

export type ChatMode = "investigate" | "modify" | "explain";
