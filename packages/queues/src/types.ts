import type { Result } from "@openfarm/result";

/**
 * Generic queue job data
 */
export interface QueueJob<T = unknown> {
  /** Unique job identifier */
  id: string;
  /** Job name/type */
  name: string;
  /** Job payload data */
  data: T;
  /** Job metadata */
  metadata?: {
    /** Job creation timestamp */
    createdAt?: string;
    /** Scheduled execution time */
    scheduledFor?: string;
    /** Number of retry attempts */
    attempts?: number;
    /** Maximum retry attempts */
    maxAttempts?: number;
    /** Job priority */
    priority?: number;
    /** Custom tags */
    tags?: string[];
  };
}

/**
 * Queue job options
 */
export interface QueueJobOptions {
  /** Delay before executing the job (ms) */
  delay?: number;
  /** Schedule job for specific time */
  scheduledFor?: Date;
  /** Maximum retry attempts */
  maxAttempts?: number;
  /** Job priority (higher = more priority) */
  priority?: number;
  /** Unique idempotency key */
  idempotencyKey?: string;
  /** Custom tags for filtering */
  tags?: string[];
  /** Timeout for job execution (ms) */
  timeout?: number;
}

/**
 * Queue job result
 */
export interface QueueJobResult<T = unknown> {
  /** Job ID */
  jobId: string;
  /** Execution status */
  status: "success" | "failed" | "cancelled";
  /** Result data */
  data?: T;
  /** Error message if failed */
  error?: string;
  /** Execution time (ms) */
  executionTime?: number;
}

/**
 * Queue adapter interface - to be implemented by different queue systems
 */
export interface QueueAdapter {
  /**
   * Send a job to the queue
   */
  send<T = unknown>(
    name: string,
    data: T,
    options?: QueueJobOptions
  ): Promise<Result<string>>;

  /**
   * Send multiple jobs to the queue
   */
  sendBatch<T = unknown>(
    jobs: Array<{ name: string; data: T; options?: QueueJobOptions }>
  ): Promise<Result<string[]>>;

  /**
   * Cancel a job by ID
   */
  cancel(jobId: string): Promise<Result<void>>;

  /**
   * Get job status
   */
  getStatus(jobId: string): Promise<Result<QueueJobResult>>;

  /**
   * Get adapter name
   */
  getName(): string;
}

/**
 * Queue configuration
 */
export interface QueueConfig {
  /** Adapter implementation */
  adapter: QueueAdapter;
  /** Default job options */
  defaultOptions?: QueueJobOptions;
}
