export interface OpenCodeConfig {
  mode?: "local" | "cloud";
  baseUrl?: string;
  password?: string;
  timeout?: number;
}

export interface OpenCodeSession {
  id: string;
  title: string;
  created_at: string;
}

export interface OpenCodeMessage {
  id: string;
  status: "pending" | "running" | "completed" | "failed";
  created_at: string;
  usage?: {
    total_tokens: number;
    input_tokens: number;
    output_tokens: number;
  };
}

export interface FileDiff {
  path: string;
  diff: string;
  additions: number;
  deletions: number;
}

export interface OpenCodeEvent {
  type: string;
  part?: {
    text?: string;
    tool?: string;
    state?: {
      status?: string;
      input?: Record<string, unknown>;
      output?: Record<string, unknown>;
      error?: string;
    };
    usage?: {
      total_tokens: number;
      input_tokens: number;
      output_tokens: number;
    };
  };
  name?: string;
  message?: string;
  error?: string;
  text?: string;
}

export interface OpenCodeExecutionState {
  outputText: string;
  totalTokens: number;
  modifiedFiles: Set<string>;
  createdFiles: Set<string>;
}
