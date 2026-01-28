// @openfarm/queues - Inngest Queue Adapter
// Version: 1.0.0
// License: MIT

import { err, ok, type Result } from "@openfarm/result";
import type { Inngest } from "inngest";
import type { QueueAdapter, QueueJobOptions, QueueJobResult } from "../types";

/**
 * Inngest-based queue adapter
 */
export class InngestQueueAdapter implements QueueAdapter {
  constructor(private readonly inngest: Inngest) {}

  getName(): string {
    return "inngest";
  }

  async send<T = unknown>(
    name: string,
    data: T,
    options?: QueueJobOptions
  ): Promise<Result<string>> {
    try {
      const eventData: Record<string, unknown> =
        typeof data === "object" && data !== null && !Array.isArray(data)
          ? (data as Record<string, unknown>)
          : { payload: data };

      // Add metadata
      if (options?.tags) {
        eventData._tags = options.tags;
      }
      if (options?.idempotencyKey) {
        eventData._idempotencyKey = options.idempotencyKey;
      }

      const sendOptions: {
        name: string;
        data: Record<string, unknown>;
        ts?: number;
        id?: string;
      } = {
        name,
        data: eventData,
      };

      // Handle scheduled/delayed jobs
      if (options?.scheduledFor) {
        sendOptions.ts = options.scheduledFor.getTime();
      } else if (options?.delay) {
        sendOptions.ts = Date.now() + options.delay;
      }

      // Use idempotency key as event ID if provided
      if (options?.idempotencyKey) {
        sendOptions.id = options.idempotencyKey;
      }

      const result = await this.inngest.send(sendOptions);

      // Inngest returns { ids: string[] }
      const jobId =
        Array.isArray(result.ids) && result.ids.length > 0
          ? result.ids[0]
          : String(result.ids);

      if (!jobId) {
        return err(new Error("Inngest returned empty job ID"));
      }

      return ok(jobId);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return err(new Error(`Failed to send job to Inngest: ${message}`));
    }
  }

  async sendBatch<T = unknown>(
    jobs: Array<{ name: string; data: T; options?: QueueJobOptions }>
  ): Promise<Result<string[]>> {
    try {
      const events = jobs.map((job) => {
        const eventData: Record<string, unknown> =
          typeof job.data === "object" &&
          job.data !== null &&
          !Array.isArray(job.data)
            ? (job.data as Record<string, unknown>)
            : { payload: job.data };

        if (job.options?.tags) {
          eventData._tags = job.options.tags;
        }
        if (job.options?.idempotencyKey) {
          eventData._idempotencyKey = job.options.idempotencyKey;
        }

        const event: {
          name: string;
          data: Record<string, unknown>;
          ts?: number;
          id?: string;
        } = {
          name: job.name,
          data: eventData,
        };

        if (job.options?.scheduledFor) {
          event.ts = job.options.scheduledFor.getTime();
        } else if (job.options?.delay) {
          event.ts = Date.now() + job.options.delay;
        }

        if (job.options?.idempotencyKey) {
          event.id = job.options.idempotencyKey;
        }

        return event;
      });

      const result = await this.inngest.send(events);

      // Inngest returns { ids: string[] }
      const jobIds = Array.isArray(result.ids)
        ? result.ids.filter((id): id is string => !!id)
        : result.ids
          ? [String(result.ids)]
          : [];

      if (jobIds.length === 0) {
        return err(new Error("Inngest returned no job IDs"));
      }

      return ok(jobIds);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return err(new Error(`Failed to send batch jobs to Inngest: ${message}`));
    }
  }

  async cancel(jobId: string): Promise<Result<void>> {
    // Inngest doesn't have a direct cancel API via the client
    // Cancellation is typically handled via run context in the function itself
    // We can send a cancellation event that the function can listen to
    try {
      await this.inngest.send({
        name: "job.cancel",
        data: { jobId },
      });
      return ok(undefined);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return err(new Error(`Failed to cancel job in Inngest: ${message}`));
    }
  }

  async getStatus(jobId: string): Promise<Result<QueueJobResult>> {
    // Inngest client doesn't expose a way to query job status
    // This would require using the Inngest API directly or storing state externally
    return err(
      new Error(
        "Job status querying not supported in Inngest adapter. Use Inngest dashboard or API."
      )
    );
  }
}
