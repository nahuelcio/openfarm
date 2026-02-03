import { logger } from "@openfarm/logger";

type CircuitBreakerState = "closed" | "open" | "half-open";

interface CircuitBreakerOptions {
  readonly maxFailures: number;
  readonly cooldownMs: number;
  readonly halfOpenAttempts: number;
}

export class CircuitBreaker {
  private failures = 0;
  private halfOpenAttempts = 0;
  private state: CircuitBreakerState = "closed";
  private lastFailureTime = 0;

  constructor(private readonly options: CircuitBreakerOptions) {
    this.options = options;
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === "open") {
      if (Date.now() - this.lastFailureTime < this.options.cooldownMs) {
        const cooldownRemaining =
          this.options.cooldownMs - (Date.now() - this.lastFailureTime);
        throw new Error(
          `Circuit breaker is open. Cooldown remaining: ${Math.round(cooldownRemaining / 1000)}s`
        );
      }
      this.transitionToHalfOpen();
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failures = 0;

    if (this.state === "half-open") {
      this.halfOpenAttempts++;

      if (this.halfOpenAttempts >= this.options.halfOpenAttempts) {
        this.transitionToClosed();
        logger.info("Circuit breaker reset to closed state");
      }
    }
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();
    this.halfOpenAttempts = 0;

    if (this.state !== "open") {
      if (
        this.state === "half-open" ||
        this.failures >= this.options.maxFailures
      ) {
        this.transitionToOpen();
      }
    }
  }

  private transitionToClosed(): void {
    this.state = "closed";
    this.failures = 0;
    this.halfOpenAttempts = 0;
  }

  private transitionToOpen(): void {
    if (this.state !== "open") {
      this.state = "open";
      logger.warn(
        `Circuit breaker opened after ${this.failures} failures. Cooldown: ${this.options.cooldownMs}ms`
      );
    }
  }

  private transitionToHalfOpen(): void {
    this.state = "half-open";
    this.halfOpenAttempts = 0;
    logger.info("Circuit breaker moved to half-open state");
  }

  getState(): CircuitBreakerState {
    return this.state;
  }

  getFailures(): number {
    return this.failures;
  }
}
