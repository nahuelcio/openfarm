// @openfarm/queues - Main Queue class
// Version: 1.0.0
// License: MIT

import type { Result } from "@openfarm/result";
import type {
  QueueAdapter,
  QueueConfig,
  QueueJobOptions,
  QueueJobResult,
} from "./types";

/**
 * Queue client - provides a unified interface for different queue adapters
 */
export class Queue {
  private readonly adapter: QueueAdapter;
  private readonly defaultOptions?: QueueJobOptions;

  constructor(config: QueueConfig) {
    this.adapter = config.adapter;
    this.defaultOptions = config.defaultOptions;
  }

  /**
   * Send a job to the queue
   */
  async send<T = unknown>(
    name: string,
    data: T,
    options?: QueueJobOptions
  ): Promise<Result<string>> {
    const mergedOptions = { ...this.defaultOptions, ...options };
    return this.adapter.send(name, data, mergedOptions);
  }

  /**
   * Send multiple jobs to the queue
   */
  async sendBatch<T = unknown>(
    jobs: Array<{ name: string; data: T; options?: QueueJobOptions }>
  ): Promise<Result<string[]>> {
    const jobsWithDefaults = jobs.map((job) => ({
      ...job,
      options: { ...this.defaultOptions, ...job.options },
    }));
    return this.adapter.sendBatch(jobsWithDefaults);
  }

  /**
   * Cancel a job by ID
   */
  async cancel(jobId: string): Promise<Result<void>> {
    return this.adapter.cancel(jobId);
  }

  /**
   * Get job status
   */
  async getStatus(jobId: string): Promise<Result<QueueJobResult>> {
    return this.adapter.getStatus(jobId);
  }

  /**
   * Get the adapter name
   */
  getAdapterName(): string {
    return this.adapter.getName();
  }

  /**
   * Get the underlying adapter (for advanced use cases)
   */
  getAdapter(): QueueAdapter {
    return this.adapter;
  }
}
