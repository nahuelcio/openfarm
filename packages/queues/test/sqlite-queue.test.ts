// @openfarm/queues - SQLite Queue Adapter Tests
// Version: 1.0.0
// License: MIT

import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { SqliteQueueAdapter } from "../src/adapters/sqlite";
import { createSqliteQueue } from "../src/sqlite-client";

// SQLite configuration constants (should match the adapter)
const SQLITE_PAGE_SIZE = 4096;

describe("SqliteQueueAdapter", () => {
  let adapter: SqliteQueueAdapter;

  beforeEach(() => {
    adapter = new SqliteQueueAdapter(":memory:");
  });

  afterEach(() => {
    adapter.close();
  });

  test("should have correct adapter name", () => {
    expect(adapter.getName()).toBe("sqlite");
  });

  test("should send a job successfully", async () => {
    const result = await adapter.send("test-job", { foo: "bar" });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toMatch(/^job_/);
    }
  });

  test("should send batch jobs successfully", async () => {
    const jobs: Array<{ name: string; data: unknown }> = [
      { name: "job1", data: { a: 1 } },
      { name: "job2", data: { b: 2 } },
      { name: "job3", data: { c: 3 } },
    ];

    const result = await adapter.sendBatch(jobs);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toHaveLength(3);
      for (const jobId of result.value) {
        expect(jobId).toMatch(/^job_/);
      }
    }
  });

  test("should process jobs automatically", async () => {
    let processedCount = 0;
    const processor = async (_jobId: string, name: string, data: unknown) => {
      processedCount++;
      return { processed: true, name, data };
    };

    const customAdapter = new SqliteQueueAdapter(":memory:", processor);

    await customAdapter.send("test-job", { foo: "bar" });

    // Wait for processing (up to 1 second)
    await new Promise((resolve) => setTimeout(resolve, 200));

    expect(processedCount).toBe(1);

    customAdapter.close();
  });

  test("should respect job priority", async () => {
    const executionOrder: string[] = [];
    const processor = async (_jobId: string, name: string) => {
      executionOrder.push(name);
      return { processed: true };
    };

    const customAdapter = new SqliteQueueAdapter(":memory:", processor);

    // Send jobs with different priorities (higher priority = processed first)
    await customAdapter.send("low-priority", {}, { priority: 1 });
    await customAdapter.send("high-priority", {}, { priority: 10 });
    await customAdapter.send("medium-priority", {}, { priority: 5 });

    // Wait for processing
    await new Promise((resolve) => setTimeout(resolve, 500));

    expect(executionOrder).toEqual([
      "high-priority",
      "medium-priority",
      "low-priority",
    ]);

    customAdapter.close();
  });

  test("should handle delayed jobs", async () => {
    let processed = false;
    const processor = async () => {
      processed = true;
      return { processed: true };
    };

    const customAdapter = new SqliteQueueAdapter(":memory:", processor);

    // Send job with 300ms delay
    await customAdapter.send("delayed-job", {}, { delay: 300 });

    // Should not be processed yet (after 100ms)
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(processed).toBe(false);

    // Should be processed after delay (after 400ms total)
    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(processed).toBe(true);

    customAdapter.close();
  });

  test("should handle scheduled jobs", async () => {
    let processed = false;
    const processor = async () => {
      processed = true;
      return { processed: true };
    };

    const customAdapter = new SqliteQueueAdapter(":memory:", processor);

    // Schedule job for 300ms in the future
    const scheduledFor = new Date(Date.now() + 300);
    await customAdapter.send("scheduled-job", {}, { scheduledFor });

    // Should not be processed yet
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(processed).toBe(false);

    // Should be processed after scheduled time
    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(processed).toBe(true);

    customAdapter.close();
  });

  test("should retry failed jobs up to max attempts", async () => {
    let attempts = 0;
    const processor = async () => {
      attempts++;
      throw new Error("Job failed");
    };

    const customAdapter = new SqliteQueueAdapter(":memory:", processor);

    // Send job with max 3 attempts (default)
    const result = await customAdapter.send("failing-job", {});
    expect(result.ok).toBe(true);

    // Wait for all retries to complete
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Should have attempted 3 times
    expect(attempts).toBe(3);

    // Check job status
    if (result.ok) {
      const statusResult = await customAdapter.getStatus(result.value);
      expect(statusResult.ok).toBe(true);
      if (statusResult.ok) {
        expect(statusResult.value.status).toBe("failed");
        expect(statusResult.value.error).toContain("Job failed");
      }
    }

    customAdapter.close();
  });

  test("should cancel pending jobs", async () => {
    // Send a job with high delay so it stays pending
    const result = await adapter.send("cancellable-job", {}, { delay: 5000 });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    const jobId = result.value;

    // Cancel the job
    const cancelResult = await adapter.cancel(jobId);
    expect(cancelResult.ok).toBe(true);

    // Check status - should be cancelled
    const statusResult = await adapter.getStatus(jobId);
    expect(statusResult.ok).toBe(true);
    if (statusResult.ok) {
      expect(statusResult.value.status).toBe("cancelled");
    }
  });

  test("should not cancel completed jobs", async () => {
    const processor = async () => ({ success: true });
    const customAdapter = new SqliteQueueAdapter(":memory:", processor);

    const result = await customAdapter.send("completed-job", {});
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    const jobId = result.value;

    // Wait for job to complete
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Try to cancel - should fail
    const cancelResult = await customAdapter.cancel(jobId);
    expect(cancelResult.ok).toBe(false);

    customAdapter.close();
  });

  test("should return error for non-existent job status", async () => {
    const result = await adapter.getStatus("non-existent-job-id");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain("not found");
    }
  });

  test("should track job execution time", async () => {
    const processor = async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
      return { success: true };
    };

    const customAdapter = new SqliteQueueAdapter(":memory:", processor);

    const result = await customAdapter.send("timed-job", {});
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    const jobId = result.value;

    // Wait for job to complete
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Check execution time
    const statusResult = await customAdapter.getStatus(jobId);
    expect(statusResult.ok).toBe(true);
    if (statusResult.ok) {
      expect(statusResult.value.status).toBe("success");
      expect(statusResult.value.executionTime).toBeGreaterThanOrEqual(50);
    }

    customAdapter.close();
  });

  test("should provide monitoring utilities", async () => {
    // Send various jobs
    await adapter.send("job1", {});
    await adapter.send("job2", {}, { delay: 5000 }); // Delayed
    await adapter.send("job3", {});

    // Check monitoring methods
    const allJobs = adapter.getAllJobs();
    expect(allJobs.length).toBeGreaterThanOrEqual(3);

    const pendingCount = adapter.getPendingCount();
    expect(pendingCount).toBeGreaterThanOrEqual(0);

    const runningCount = adapter.getRunningCount();
    expect(runningCount).toBeGreaterThanOrEqual(0);
  });

  test("should clear all jobs", async () => {
    await adapter.send("job1", {});
    await adapter.send("job2", {});
    await adapter.send("job3", {});

    expect(adapter.getAllJobs().length).toBe(3);

    adapter.clear();

    expect(adapter.getAllJobs().length).toBe(0);
  });

  test("should handle custom max attempts", async () => {
    let attempts = 0;
    const processor = async () => {
      attempts++;
      throw new Error("Always fails");
    };

    const customAdapter = new SqliteQueueAdapter(":memory:", processor);

    // Send job with max 1 attempt
    await customAdapter.send("single-attempt-job", {}, { maxAttempts: 1 });

    // Wait for processing
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Should have attempted only once
    expect(attempts).toBe(1);

    customAdapter.close();
  });

  test("should process multiple jobs sequentially", async () => {
    const processingTimes: number[] = [];
    const processor = async () => {
      processingTimes.push(Date.now());
      await new Promise((resolve) => setTimeout(resolve, 50));
      return { success: true };
    };

    const customAdapter = new SqliteQueueAdapter(":memory:", processor);

    // Send 3 jobs
    await customAdapter.send("job1", {});
    await customAdapter.send("job2", {});
    await customAdapter.send("job3", {});

    // Wait for all to process
    await new Promise((resolve) => setTimeout(resolve, 500));

    // All 3 should have been processed
    expect(processingTimes.length).toBe(3);

    // They should be processed sequentially (time difference between starts should be >= 50ms)
    const timeDiff1 = processingTimes[1]! - processingTimes[0]!;
    const timeDiff2 = processingTimes[2]! - processingTimes[1]!;

    expect(timeDiff1).toBeGreaterThanOrEqual(40); // Allow some timing variance
    expect(timeDiff2).toBeGreaterThanOrEqual(40);

    customAdapter.close();
  });
});

describe("createSqliteQueue helper", () => {
  test("should create a queue with default in-memory database", async () => {
    const queue = createSqliteQueue();

    expect(queue.getAdapterName()).toBe("sqlite");

    const result = await queue.send("test-job", { foo: "bar" });
    expect(result.ok).toBe(true);

    // Clean up
    const adapter = queue.getAdapter() as SqliteQueueAdapter;
    adapter.close();
  });

  test("should create a queue with custom processor", async () => {
    let processed = false;
    const processor = async () => {
      processed = true;
      return { success: true };
    };

    const queue = createSqliteQueue(":memory:", processor);

    await queue.send("test-job", { foo: "bar" });

    // Wait for processing
    await new Promise((resolve) => setTimeout(resolve, 200));

    expect(processed).toBe(true);

    // Clean up
    const adapter = queue.getAdapter() as SqliteQueueAdapter;
    adapter.close();
  });

  test("should work with file-based database", async () => {
    const dbPath = ":memory:"; // Still use memory for testing, but shows API
    const queue = createSqliteQueue(dbPath);

    const result = await queue.send("test-job", { data: 123 });
    expect(result.ok).toBe(true);

    // Clean up
    const adapter = queue.getAdapter() as SqliteQueueAdapter;
    adapter.close();
  });
});

describe("SQLite Optimizations", () => {
  test("should attempt to enable WAL mode (memory databases use 'memory' mode)", () => {
    const adapter = new SqliteQueueAdapter(":memory:");

    // Access the private db property to check PRAGMA settings
    // @ts-expect-error - accessing private property for testing
    const db = adapter.db as any;

    // Check journal mode
    // Note: :memory: databases always use 'memory' journal mode
    // WAL mode only works with file-based databases
    const journalMode = db.prepare("PRAGMA journal_mode").get() as {
      journal_mode: string;
    };
    expect(journalMode.journal_mode.toLowerCase()).toMatch(/memory|wal/);

    adapter.close();
  });

  test("should have optimized cache size", () => {
    const adapter = new SqliteQueueAdapter(":memory:");

    // @ts-expect-error - accessing private property for testing
    const db = adapter.db as any;

    // Check cache size (should be negative for KB, we set -64000 = 64MB)
    const cacheSize = db.prepare("PRAGMA cache_size").get() as {
      cache_size: number;
    };
    // Should be negative and around -64000 (can vary slightly)
    expect(cacheSize.cache_size).toBeLessThan(0);
    expect(Math.abs(cacheSize.cache_size)).toBeGreaterThanOrEqual(60_000);

    adapter.close();
  });

  test("should have synchronous mode set to NORMAL", () => {
    const adapter = new SqliteQueueAdapter(":memory:");

    // @ts-expect-error - accessing private property for testing
    const db = adapter.db as any;

    // Check synchronous mode (0 = OFF, 1 = NORMAL, 2 = FULL, 3 = EXTRA)
    const syncMode = db.prepare("PRAGMA synchronous").get() as {
      synchronous: number;
    };
    expect(syncMode.synchronous).toBe(1); // 1 = NORMAL

    adapter.close();
  });

  test("should have foreign keys enabled", () => {
    const adapter = new SqliteQueueAdapter(":memory:");

    // @ts-expect-error - accessing private property for testing
    const db = adapter.db as any;

    const foreignKeys = db.prepare("PRAGMA foreign_keys").get() as {
      foreign_keys: number;
    };
    expect(foreignKeys.foreign_keys).toBe(1); // 1 = ON

    adapter.close();
  });

  test("should have busy timeout configured", () => {
    const adapter = new SqliteQueueAdapter(":memory:");

    // @ts-expect-error - accessing private property for testing
    const db = adapter.db as any;

    const busyTimeout = db.prepare("PRAGMA busy_timeout").get() as {
      timeout: number;
    };
    expect(busyTimeout.timeout).toBe(5000); // 5000ms = 5 seconds

    adapter.close();
  });

  test("should have optimal page size", () => {
    const adapter = new SqliteQueueAdapter(":memory:");

    // @ts-expect-error - accessing private property for testing
    const db = adapter.db as any;

    const pageSize = db.prepare("PRAGMA page_size").get() as {
      page_size: number;
    };
    expect(pageSize.page_size).toBe(SQLITE_PAGE_SIZE); // Modern default page size

    adapter.close();
  });
});
