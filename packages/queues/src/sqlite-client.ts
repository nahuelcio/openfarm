// @openfarm/queues - SQLite Queue Client
// Version: 1.0.0
// License: MIT

import { SqliteQueueAdapter } from "./adapters/sqlite";
import { Queue } from "./queue";

/**
 * Create a SQLite-backed queue for local execution
 *
 * Perfect for:
 * - TUI/CLI tools (local execution)
 * - SDK local mode (no Inngest needed)
 * - Development/testing
 * - Single-machine deployments
 *
 * NOT suitable for:
 * - Distributed systems
 * - High-throughput production (use Inngest instead)
 * - Jobs requiring horizontal scaling
 *
 * @param dbPath - Path to SQLite database file, or ":memory:" for in-memory (default)
 * @param processor - Optional function to execute jobs. If not provided, jobs are just marked as successful.
 * @returns Queue instance backed by SQLite
 *
 * @example
 * ```typescript
 * // In-memory queue (default)
 * const queue = createSqliteQueue();
 *
 * // File-based queue
 * const queue = createSqliteQueue("./jobs.db");
 *
 * // With custom processor
 * const queue = createSqliteQueue(":memory:", async (jobId, name, data) => {
 *   console.log(`Processing ${name}:`, data);
 *   // Your job logic here
 *   return { success: true };
 * });
 *
 * // Send a job
 * await queue.send("my-task", { foo: "bar" });
 *
 * // Send with priority and delay
 * await queue.send("urgent-task", { baz: 123 }, {
 *   priority: 10,
 *   delay: 5000 // 5 seconds
 * });
 *
 * // Clean up when done
 * queue.close();
 * ```
 */
export function createSqliteQueue(
  dbPath = ":memory:",
  processor?: (jobId: string, name: string, data: unknown) => Promise<unknown>
): Queue {
  const adapter = new SqliteQueueAdapter(dbPath, processor);
  return new Queue({ adapter });
}
