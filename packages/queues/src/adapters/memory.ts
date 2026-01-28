// @openfarm/queues - Memory Queue Adapter (for testing)
// Version: 1.0.0
// License: MIT

import { err, ok, type Result } from "@openfarm/result";
import type {
  QueueAdapter,
  QueueJob,
  QueueJobOptions,
  QueueJobResult,
} from "../types";

/**
 * In-memory queue adapter for testing
 */
export class MemoryQueueAdapter implements QueueAdapter {
  private jobs: Map<string, QueueJob> = new Map();
  private results: Map<string, QueueJobResult> = new Map();
  private jobCounter = 0;

  getName(): string {
    return "memory";
  }

  async send<T = unknown>(
    name: string,
    data: T,
    options?: QueueJobOptions
  ): Promise<Result<string>> {
    try {
      const jobId = `job_${++this.jobCounter}`;
      const now = new Date().toISOString();

      const job: QueueJob<T> = {
        id: jobId,
        name,
        data,
        metadata: {
          createdAt: now,
          scheduledFor: options?.scheduledFor?.toISOString(),
          attempts: 0,
          maxAttempts: options?.maxAttempts ?? 3,
          priority: options?.priority ?? 0,
          tags: options?.tags,
        },
      };

      this.jobs.set(jobId, job);

      // Simulate async execution
      if (options?.delay || options?.scheduledFor) {
        const delay = options.delay ?? 0;
        setTimeout(() => {
          this.processJob(jobId);
        }, delay);
      } else {
        // Execute immediately (but async)
        setTimeout(() => this.processJob(jobId), 0);
      }

      return ok(jobId);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return err(new Error(`Failed to send job to memory queue: ${message}`));
    }
  }

  async sendBatch<T = unknown>(
    jobs: Array<{ name: string; data: T; options?: QueueJobOptions }>
  ): Promise<Result<string[]>> {
    try {
      const jobIds: string[] = [];

      for (const job of jobs) {
        const result = await this.send(job.name, job.data, job.options);
        if (!result.ok) {
          return result as Result<string[]>;
        }
        jobIds.push(result.value);
      }

      return ok(jobIds);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return err(
        new Error(`Failed to send batch jobs to memory queue: ${message}`)
      );
    }
  }

  async cancel(jobId: string): Promise<Result<void>> {
    try {
      const job = this.jobs.get(jobId);
      if (!job) {
        return err(new Error(`Job ${jobId} not found`));
      }

      this.results.set(jobId, {
        jobId,
        status: "cancelled",
      });

      this.jobs.delete(jobId);
      return ok(undefined);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return err(new Error(`Failed to cancel job: ${message}`));
    }
  }

  async getStatus(jobId: string): Promise<Result<QueueJobResult>> {
    try {
      const result = this.results.get(jobId);
      if (!result) {
        const job = this.jobs.get(jobId);
        if (!job) {
          return err(new Error(`Job ${jobId} not found`));
        }
        // Job exists but not processed yet
        return ok({
          jobId,
          status: "success", // Assume pending
        });
      }
      return ok(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return err(new Error(`Failed to get job status: ${message}`));
    }
  }

  /**
   * Get all jobs (for testing)
   */
  getAllJobs(): QueueJob[] {
    return Array.from(this.jobs.values());
  }

  /**
   * Get all results (for testing)
   */
  getAllResults(): QueueJobResult[] {
    return Array.from(this.results.values());
  }

  /**
   * Clear all jobs and results (for testing)
   */
  clear(): void {
    this.jobs.clear();
    this.results.clear();
    this.jobCounter = 0;
  }

  /**
   * Simulate job processing
   */
  private processJob(jobId: string): void {
    const job = this.jobs.get(jobId);
    if (!job) return;

    // Simulate successful execution
    this.results.set(jobId, {
      jobId,
      status: "success",
      data: job.data,
      executionTime: Math.random() * 1000, // Random execution time
    });

    this.jobs.delete(jobId);
  }
}
