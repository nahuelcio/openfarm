export type ExecutorType = "opencode" | "aider" | "claude-code" | "direct-api";

export interface Executor {
  type: ExecutorType;
  execute(options: ExecutionOptions): Promise<ExecutionResult>;
  testConnection(): Promise<boolean>;
}

export interface OpenFarmConfig {
  apiUrl?: string;
  apiKey?: string;
  defaultProvider?: string;
  defaultModel?: string;
  timeout?: number;
  retries?: number;
}

export interface ExecutionOptions {
  task: string;
  context?: string;
  provider?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  onProgress?: (chunk: string) => void;
  onLog?: (log: string) => void; // Callback para logs en tiempo real en TUI
}

export interface ExecutionResult {
  success: boolean;
  output?: string;
  error?: string;
  duration: number;
  tokens?: number;
}

export interface ProviderInfo {
  id: string;
  name: string;
  models: string[];
  capabilities: string[];
}
