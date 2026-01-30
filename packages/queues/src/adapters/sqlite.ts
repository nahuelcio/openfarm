// @openfarm/queues - SQLite Queue Adapter
// Version: 1.0.0
// License: MIT

import Database from "better-sqlite3";
import { err, ok, type Result } from "@openfarm/result";
import type { QueueAdapter, QueueJobOptions, QueueJobResult } from "../types";

// SQLite configuration constants
const SQLITE_PAGE_SIZE = 4096; // Modern default page size

interface SqliteJobRow {
  id: string;
  name: string;
  data: string;
  status: "pending" | "running" | "success" | "failed" | "cancelled";
  priority: number;
  scheduled_for: number | null;
  max_attempts: number;
  attempts: number;
  tags: string | null;
  error: string | null;
  result: string | null;
  created_at: number;
  started_at: number | null;
  completed_at: number | null;
  execution_time: number | null;
}

/**
 * SQLite-based queue adapter for local execution using better-sqlite3
 * Perfect for TUI/SDK local usage without external dependencies
 */
export class SqliteQueueAdapter implements QueueAdapter {
  private readonly db: Database.Database;
  private processInterval: ReturnType<typeof setInterval> | null = null;

  constructor(
    dbPath = ":memory:",
    private readonly processor?: (
      jobId: string,
      name: string,
      data: unknown
    ) => Promise<unknown>
  ) {
    this.db = new Database(dbPath);
    this.configureSqlite();
    this.initSchema();
    this.startProcessing();
  }

  getName(): string {
    return "sqlite";
  }

  /**
   * Configure SQLite for optimal performance and concurrency
   */
  private configureSqlite(): void {
    // Enable WAL mode for better concurrency
    // WAL allows readers and writers to not block each other
    // NOTE: WAL mode only works with file-based databases.
    // :memory: databases will automatically use 'memory' journal mode instead.
    this.db.exec("PRAGMA journal_mode = WAL;");

    // Set synchronous mode to NORMAL for better performance
    // NORMAL is safe in WAL mode and provides good balance
    this.db.exec("PRAGMA synchronous = NORMAL;");

    // Increase cache size (default is 2MB, we use 64MB)
    // Negative value means size in KB (64MB = 64 * 1024 KB)
    this.db.exec("PRAGMA cache_size = -64000;");

    // Enable foreign keys (good practice)
    this.db.exec("PRAGMA foreign_keys = ON;");

    // Set busy timeout to 5 seconds (instead of immediate fail)
    this.db.exec("PRAGMA busy_timeout = 5000;");

    // Use memory-mapped I/O for better performance (256MB)
    // Only effective for file-based databases
    this.db.exec("PRAGMA mmap_size = 268435456;");

    // Optimize page size (modern default)
    this.db.exec(`PRAGMA page_size = ${SQLITE_PAGE_SIZE};`);
  }

  /**
   * Initialize database schema
   */
  private initSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS jobs (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        data TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        priority INTEGER NOT NULL DEFAULT 0,
        scheduled_for INTEGER,
        max_attempts INTEGER NOT NULL DEFAULT 3,
        attempts INTEGER NOT NULL DEFAULT 0,
        tags TEXT,
        error TEXT,
        result TEXT,
        created_at INTEGER NOT NULL,
        started_at INTEGER,
        completed_at INTEGER,
        execution_time INTEGER,
        CHECK (status IN ('pending', 'running', 'success', 'failed', 'cancelled'))
      );

      CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
      CREATE INDEX IF NOT EXISTS idx_jobs_scheduled ON jobs(scheduled_for);
      CREATE INDEX IF NOT EXISTS idx_jobs_priority ON jobs(priority DESC);
      CREATE INDEX IF NOT EXISTS idx_jobs_created ON jobs(created_at);
    `);
  }

  /**
   * Generate unique job ID
   */
  private generateJobId(): string {
    return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async send<T = unknown>(
    name: string,
    data: T,
    options?: QueueJobOptions
  ): Promise<Result<string>> {
    try {
      const jobId = this.generateJobId();
      const now = Date.now();
      const scheduledFor =
        options?.scheduledFor?.getTime() ??
        (options?.delay ? now + options.delay : null);

      const stmt = this.db.prepare(`
        INSERT INTO jobs (
          id, name, data, priority, scheduled_for, 
          max_attempts, tags, created_at, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        jobId,
        name,
        JSON.stringify(data),
        options?.priority ?? 0,
        scheduledFor,
        options?.maxAttempts ?? 3,
        options?.tags ? JSON.stringify(options.tags) : null,
        now,
        scheduledFor ? "pending" : "pending"
      );

      return ok(jobId);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return err(new Error(`Failed to send job to SQLite queue: ${message}`));
    }
  }

  async sendBatch<T = unknown>(
    jobs: Array<{ name: string; data: T; options?: QueueJobOptions }>
  ): Promise<Result<string[]>> {
    try {
      const jobIds: string[] = [];
      const now = Date.now();

      const stmt = this.db.prepare(`
        INSERT INTO jobs (
          id, name, data, priority, scheduled_for,
          max_attempts, tags, created_at, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const transaction = this.db.transaction((jobsData: typeof jobs) => {
        for (const job of jobsData) {
          const jobId = this.generateJobId();
          const scheduledFor =
            job.options?.scheduledFor?.getTime() ??
            (job.options?.delay ? now + job.options.delay : null);

          stmt.run(
            jobId,
            job.name,
            JSON.stringify(job.data),
            job.options?.priority ?? 0,
            scheduledFor,
            job.options?.maxAttempts ?? 3,
            job.options?.tags ? JSON.stringify(job.options.tags) : null,
            now,
            "pending"
          );

          jobIds.push(jobId);
        }
      });

      transaction(jobs);

      return ok(jobIds);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return err(
        new Error(`Failed to send batch jobs to SQLite queue: ${message}`)
      );
    }
  }

  async cancel(jobId: string): Promise<Result<void>> {
    try {
      const stmt = this.db.prepare(`
        UPDATE jobs 
        SET status = 'cancelled', completed_at = ?
        WHERE id = ? AND status IN ('pending', 'running')
      `);

      const result = stmt.run(Date.now(), jobId);

      if (result.changes === 0) {
        return err(new Error(`Job ${jobId} not found or already completed`));
      }

      return ok(undefined);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return err(new Error(`Failed to cancel job: ${message}`));
    }
  }

  async getStatus(jobId: string): Promise<Result<QueueJobResult>> {
    try {
      const stmt = this.db.prepare(`
        SELECT id, status, result, error, execution_time
        FROM jobs
        WHERE id = ?
      `);

      const row = stmt.get(jobId) as
        | Pick<
            SqliteJobRow,
            "id" | "status" | "result" | "error" | "execution_time"
          >
        | undefined;

      if (!row) {
        return err(new Error(`Job ${jobId} not found`));
      }

      return ok({
        jobId: row.id,
        status: row.status as "success" | "failed" | "cancelled",
        data: row.result ? JSON.parse(row.result) : undefined,
        error: row.error ?? undefined,
        executionTime: row.execution_time ?? undefined,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return err(new Error(`Failed to get job status: ${message}`));
    }
  }

  /**
   * Start background processing of jobs
   */
  private startProcessing(): void {
    // Process jobs every 100ms
    this.processInterval = setInterval(() => {
      this.processNextJob();
    }, 100);
  }

  /**
   * Process the next available job
   */
  private processNextJob(): void {
    try {
      const now = Date.now();

      // Find next job to process (highest priority, oldest first)
      const stmt = this.db.prepare(`
        SELECT id, name, data, max_attempts, attempts
        FROM jobs
        WHERE status = 'pending'
          AND (scheduled_for IS NULL OR scheduled_for <= ?)
        ORDER BY priority DESC, created_at ASC
        LIMIT 1
      `);

      const job = stmt.get(now) as
        | Pick<
            SqliteJobRow,
            "id" | "name" | "data" | "max_attempts" | "attempts"
          >
        | undefined;

      if (!job) {
        return;
      }

      // Mark as running
      const updateStmt = this.db.prepare(`
        UPDATE jobs
        SET status = 'running', started_at = ?, attempts = attempts + 1
        WHERE id = ?
      `);
      updateStmt.run(now, job.id);

      // Execute job
      this.executeJob(
        job.id,
        job.name,
        job.data,
        job.max_attempts,
        job.attempts + 1
      );
    } catch (error) {
      console.error("[SqliteQueue] Error processing job:", error);
    }
  }

  /**
   * Execute a job
   */
  private async executeJob(
    jobId: string,
    name: string,
    dataJson: string,
    maxAttempts: number,
    currentAttempt: number
  ): Promise<void> {
    const startTime = Date.now();

    try {
      const data = JSON.parse(dataJson);

      // If processor is provided, use it; otherwise just mark as success
      let result: unknown = { message: "Job processed successfully" };

      if (this.processor) {
        result = await this.processor(jobId, name, data);
      }

      const executionTime = Date.now() - startTime;

      // Mark as success
      const stmt = this.db.prepare(`
        UPDATE jobs
        SET status = 'success',
            result = ?,
            completed_at = ?,
            execution_time = ?
        WHERE id = ?
      `);

      stmt.run(JSON.stringify(result), Date.now(), executionTime, jobId);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const executionTime = Date.now() - startTime;

      // Check if we should retry
      if (currentAttempt < maxAttempts) {
        // Mark as pending for retry
        const stmt = this.db.prepare(`
          UPDATE jobs
          SET status = 'pending',
              error = ?,
              execution_time = ?
          WHERE id = ?
        `);
        stmt.run(errorMessage, executionTime, jobId);
      } else {
        // Mark as failed
        const stmt = this.db.prepare(`
          UPDATE jobs
          SET status = 'failed',
              error = ?,
              completed_at = ?,
              execution_time = ?
          WHERE id = ?
        `);
        stmt.run(errorMessage, Date.now(), executionTime, jobId);
      }
    }
  }

  /**
   * Get all jobs (for debugging/monitoring)
   */
  getAllJobs(): Array<{
    id: string;
    name: string;
    status: string;
    priority: number;
    createdAt: Date;
  }> {
    const stmt = this.db.prepare(`
      SELECT id, name, status, priority, created_at
      FROM jobs
      ORDER BY created_at DESC
    `);

    const rows = stmt.all() as Array<{
      id: string;
      name: string;
      status: string;
      priority: number;
      created_at: number;
    }>;

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      status: row.status,
      priority: row.priority,
      createdAt: new Date(row.created_at),
    }));
  }

  /**
   * Get pending jobs count
   */
  getPendingCount(): number {
    const stmt = this.db.prepare(`
      SELECT COUNT(*) as count FROM jobs WHERE status = 'pending'
    `);
    const result = stmt.get() as { count: number };
    return result.count;
  }

  /**
   * Get running jobs count
   */
  getRunningCount(): number {
    const stmt = this.db.prepare(`
      SELECT COUNT(*) as count FROM jobs WHERE status = 'running'
    `);
    const result = stmt.get() as { count: number };
    return result.count;
  }

  /**
   * Clear all jobs (for testing)
   */
  clear(): void {
    this.db.prepare("DELETE FROM jobs").run();
  }

  /**
   * Close database connection and stop processing
   */
  close(): void {
    if (this.processInterval) {
      clearInterval(this.processInterval);
      this.processInterval = null;
    }
    this.db.close();
  }
}
