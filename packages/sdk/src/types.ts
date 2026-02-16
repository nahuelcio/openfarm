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
  verbose?: boolean;
  onProgress?: (chunk: string) => void;
  onLog?: (log: string) => void;
  workspace?: string;
  // External agent options (for output parsing wrapper)
  cli?: string;
  args?: string[];
  agentName?: string;
}

export interface ExecutionStatistics {
  creditsSpent?: number;
  toolCalls: number;
  model: string;
  filesChanged: number;
  processesCreated: number;
  requestId: string;
  tokensInput: number;
  tokensOutput: number;
  duration?: number;
}

export interface ExecutionResult {
  success: boolean;
  output?: string;
  error?: string;
  duration: number;
  tokens?: number;
  statistics?: ExecutionStatistics;
}

export interface ProviderInfo {
  id: string;
  name: string;
  models: string[];
  capabilities: string[];
}
