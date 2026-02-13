import type { AgentRegistry } from "../core/registry";
import type { AgentExecutionResult, AgentPlugin } from "../core/types";
import type { RateLimitDetector } from "./rate-limit-detector";

export interface FallbackConfig {
  primaryAgent: string;
  fallbackAgents: string[];
  maxRetries: number;
  baseBackoffMs: number;
  recoverPrimaryBetweenIterations: boolean;
}

export class AgentFallbackManager {
  private activeAgent: string;
  private readonly rateLimited = new Set<string>();
  private retryCount = 0;

  constructor(
    private readonly config: FallbackConfig,
    private readonly registry: AgentRegistry,
    private readonly detector: RateLimitDetector
  ) {
    this.activeAgent = config.primaryAgent;
  }

  getActiveAgentId(): string {
    return this.activeAgent;
  }

  async getActiveAgent(): Promise<AgentPlugin> {
    const agent = this.registry.createInstance(this.activeAgent);
    if (!agent) {
      throw new Error(`Agent '${this.activeAgent}' not found`);
    }
    return agent;
  }

  handleResult(result: AgentExecutionResult): {
    shouldRetry: boolean;
    backoffMs?: number;
  } {
    const detection = this.detector.detect({
      stderr: result.stderr,
      exitCode: result.exitCode,
      agentId: this.activeAgent,
    });

    if (!detection.isRateLimit) {
      this.retryCount = 0;
      return { shouldRetry: false };
    }

    this.rateLimited.add(this.activeAgent);

    for (const fallbackId of this.config.fallbackAgents) {
      if (
        !this.rateLimited.has(fallbackId) &&
        this.registry.hasPlugin(fallbackId)
      ) {
        this.activeAgent = fallbackId;
        this.retryCount = 0;
        return { shouldRetry: true, backoffMs: 0 };
      }
    }

    this.retryCount += 1;
    if (this.retryCount > this.config.maxRetries) {
      return { shouldRetry: false };
    }

    const backoff = detection.retryAfter
      ? detection.retryAfter * 1000
      : this.config.baseBackoffMs * 2 ** (this.retryCount - 1);

    return { shouldRetry: true, backoffMs: backoff };
  }

  attemptPrimaryRecovery(): void {
    if (!this.config.recoverPrimaryBetweenIterations) {
      return;
    }
    if (this.activeAgent === this.config.primaryAgent) {
      return;
    }

    this.rateLimited.delete(this.config.primaryAgent);
    this.activeAgent = this.config.primaryAgent;
    this.retryCount = 0;
  }
}
