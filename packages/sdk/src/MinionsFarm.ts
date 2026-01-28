import { createExecutor, type Executor, type ExecutorType } from "./executors";
import type {
  ExecutionOptions,
  ExecutionResult,
  MinionsFarmConfig,
} from "./types";

const DEFAULT_MAX_TOKENS = 4096;

export class MinionsFarm {
  private config: MinionsFarmConfig;
  private executor: Executor;

  constructor(config: MinionsFarmConfig = {}) {
    this.config = config;
    const executorType = (config.defaultProvider || "opencode") as ExecutorType;
    this.executor = createExecutor(executorType);
  }

  async execute(options: ExecutionOptions): Promise<ExecutionResult> {
    const provider =
      options.provider || this.config.defaultProvider || "opencode";
    const executor = createExecutor(provider as ExecutorType);

    return executor.execute({
      ...options,
      provider,
      model: options.model || this.config.defaultModel,
      temperature: options.temperature ?? 0.7,
      maxTokens: options.maxTokens ?? DEFAULT_MAX_TOKENS,
    });
  }

  async testConnection(): Promise<boolean> {
    return this.executor.testConnection();
  }

  setProvider(provider: ExecutorType): void {
    this.executor = createExecutor(provider);
  }
}
