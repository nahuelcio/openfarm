#!/usr/bin/env node
/**
 * Task Loop CLI
 *
 * CLI for running autonomous task loops inspired by Ralph TUI.
 */

import { getDb } from "@openfarm/core/db";
import {
  deleteSession,
  getActiveSessions,
  getRecentSessions,
  getSession,
  resumeTaskLoop,
  runTaskLoop,
  type TaskExecutor,
  type TaskLoopConfig,
  type TaskLoopEvent,
  type TaskLoopLogger,
} from "../src";

interface CLIOptions {
  workflow?: string;
  provider?: string;
  model?: string;
  project?: string;
  priority?: "low" | "medium" | "high" | "critical";
  tags?: string[];
  iterations?: number;
  dryRun?: boolean;
  autoCommit?: boolean;
  createPR?: boolean;
  stopOnFailure?: boolean;
  retries?: number;
  delay?: number;
  workspace?: string;
}

// Simple task executor that just logs (user should provide their own)
const defaultTaskExecutor: TaskExecutor = async (
  task,
  prompt,
  config,
  options
) => {
  const startTime = Date.now();
  await options.logger?.info(`Would execute task: ${task.title}`);
  await options.logger?.info(`Prompt: ${prompt.slice(0, 200)}...`);
  return {
    success: true,
    taskId: task.id,
    output:
      "Task execution not implemented. Provide a taskExecutor to runTaskLoop().",
    durationMs: Date.now() - startTime,
  };
};

const consoleLogger: TaskLoopLogger = {
  debug: (msg: string) => {
    if (process.env.DEBUG) console.log(`\x1b[90m[DEBUG] ${msg}\x1b[0m`);
  },
  info: (msg: string) => console.log(`\x1b[36m[INFO]\x1b[0m ${msg}`),
  warn: (msg: string) => console.log(`\x1b[33m[WARN]\x1b[0m ${msg}`),
  error: (msg: string) => console.error(`\x1b[31m[ERROR]\x1b[0m ${msg}`),
};

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  const mins = Math.floor(ms / 60_000);
  const secs = ((ms % 60_000) / 1000).toFixed(0);
  return `${mins}m ${secs}s`;
}

function createEventHandler(): (event: TaskLoopEvent) => void {
  return (event) => {
    switch (event.type) {
      case "session.started":
        console.log(`\n🚀 Session \x1b[36m${event.sessionId}\x1b[0m started`);
        break;
      case "session.completed": {
        const data = event.data as {
          completed: number;
          failed: number;
          skipped: number;
        };
        console.log(
          `\n✅ Session completed: ${data.completed} done, ${data.failed} failed, ${data.skipped} skipped`
        );
        break;
      }
      case "session.failed":
        console.log(
          `\n❌ Session failed: ${(event.data as { error: string }).error}`
        );
        break;
      case "session.paused":
        console.log(
          `\n⏸️  Session paused (use 'task-loop resume ${event.sessionId}' to continue)`
        );
        break;
      case "task.started": {
        const taskData = event.data as { title: string; priority: string };
        const priorityColor: Record<string, string> = {
          critical: "\x1b[31m",
          high: "\x1b[33m",
          medium: "\x1b[36m",
          low: "\x1b[90m",
        };
        console.log(
          `\n📋 [${priorityColor[taskData.priority] || ""}${taskData.priority.toUpperCase()}\x1b[0m] ${taskData.title}`
        );
        break;
      }
      case "task.completed": {
        const completedData = event.data as { durationMs: number };
        console.log(`   ✅ Done (${formatDuration(completedData.durationMs)})`);
        break;
      }
      case "task.failed": {
        const failedData = event.data as { reason: string };
        console.log(`   ❌ Failed: ${failedData.reason}`);
        break;
      }
      case "task.retry": {
        const retryData = event.data as { attempt: number };
        console.log(`   🔄 Retry attempt ${retryData.attempt}`);
        break;
      }
    }
  };
}

function parseArgs(args: string[]): {
  command: string;
  options: CLIOptions;
  positional: string[];
} {
  const options: CLIOptions = {};
  const positional: string[] = [];

  const requireValue = (flag: string, index: number): string => {
    if (index + 1 >= args.length) {
      throw new Error(`Missing value for ${flag}`);
    }
    return args[index + 1];
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === "--workflow" || arg === "-w") {
      options.workflow = requireValue(arg, i);
      i++;
    } else if (arg === "--provider" || arg === "-p") {
      options.provider = requireValue(arg, i);
      i++;
    } else if (arg === "--model" || arg === "-m") {
      options.model = requireValue(arg, i);
      i++;
    } else if (arg === "--project") {
      options.project = requireValue(arg, i);
      i++;
    } else if (arg === "--priority") {
      options.priority = requireValue(arg, i) as CLIOptions["priority"];
      i++;
    } else if (arg === "--tags") {
      options.tags = requireValue(arg, i)
        .split(",")
        .map((t) => t.trim());
      i++;
    } else if (arg === "--iterations" || arg === "-i") {
      options.iterations = Number.parseInt(requireValue(arg, i), 10);
      i++;
    } else if (arg === "--delay") {
      options.delay = Number.parseInt(requireValue(arg, i), 10);
      i++;
    } else if (arg === "--retries" || arg === "-r") {
      options.retries = Number.parseInt(requireValue(arg, i), 10);
      i++;
    } else if (arg === "--dry-run" || arg === "-n") options.dryRun = true;
    else if (arg === "--auto-commit") options.autoCommit = true;
    else if (arg === "--create-pr") options.createPR = true;
    else if (arg === "--stop-on-failure") options.stopOnFailure = true;
    else if (arg === "--workspace") {
      options.workspace = requireValue(arg, i);
      i++;
    } else if (arg === "--help" || arg === "-h") {
      showHelp();
      process.exit(0);
    } else if (!arg.startsWith("-")) positional.push(arg);
  }

  return {
    command: positional[0] || "run",
    options,
    positional: positional.slice(1),
  };
}

function showHelp(): void {
  console.log(`
${"=".repeat(60)}
  OpenFarm Task Loop CLI
${"=".repeat(60)}

Commands:
  run [options]          Start a new task loop session
  resume <session-id>    Resume a paused session
  status [session-id]    Show session status
  list                   List recent sessions
  logs <session-id>      Show session logs
  delete <session-id>    Delete a session

Options:
  -w, --workflow <id>       Workflow to use (default: task_runner)
  -p, --provider <name>     Provider: opencode, claude, aider
  -m, --model <model>       Model to use
  --project <name>          Filter by project
  --priority <level>        Minimum priority: low, medium, high, critical
  --tags <tag1,tag2>        Filter by tags (comma-separated)
  -i, --iterations <n>      Maximum tasks to process
  -r, --retries <n>         Max retries per task
  --delay <ms>              Delay between tasks in ms
  --dry-run, -n             Run in dry-run mode
  --auto-commit             Auto-commit changes
  --create-pr               Create PR on completion
  --stop-on-failure         Stop loop on first failure
  -h, --help                Show this help
`);
}

async function runCommand(options: CLIOptions): Promise<void> {
  const config: TaskLoopConfig = {
    workflowId: options.workflow || "task_runner",
    provider: options.provider || "opencode",
    model: options.model,
    projectFilter: options.project,
    minPriority: options.priority,
    tags: options.tags,
    maxIterations: options.iterations,
    delayBetweenTasks: options.delay,
    maxRetries: options.retries,
    dryRun: options.dryRun,
    autoCommit: options.autoCommit,
    createPR: options.createPR,
    stopOnFailure: options.stopOnFailure,
  };

  const abortController = new AbortController();
  process.once("SIGINT", () => {
    console.log("\n\n⚠️  Interrupted, pausing...");
    abortController.abort();
  });

  try {
    const session = await runTaskLoop(config, {
      logger: consoleLogger,
      onEvent: createEventHandler(),
      signal: abortController.signal,
      taskExecutor: defaultTaskExecutor,
    });

    console.log(`\n${"=".repeat(60)}`);
    console.log(`Session ID: ${session.id}`);
    console.log(`Status: ${session.status}`);
    console.log(`Completed: ${session.completedTasks}`);
    console.log(`Failed: ${session.failedTasks}`);
    console.log(`Skipped: ${session.skippedTasks}`);
    console.log(`${"=".repeat(60)}`);

    process.exit(session.status === "completed" ? 0 : 1);
  } catch (error) {
    console.error("\n❌ Fatal error:", error);
    process.exit(1);
  }
}

async function resumeCommand(sessionId: string): Promise<void> {
  if (!sessionId) {
    console.error("Error: Session ID required");
    process.exit(1);
  }

  const abortController = new AbortController();
  process.once("SIGINT", () => {
    console.log("\n\n⚠️  Interrupted, pausing...");
    abortController.abort();
  });

  try {
    const session = await resumeTaskLoop(sessionId, {
      logger: consoleLogger,
      onEvent: createEventHandler(),
      signal: abortController.signal,
      taskExecutor: defaultTaskExecutor,
    });

    console.log(`\n${"=".repeat(60)}`);
    console.log(`Session ID: ${session.id}`);
    console.log(`Status: ${session.status}`);
    console.log(`${"=".repeat(60)}`);

    process.exit(session.status === "completed" ? 0 : 1);
  } catch (error) {
    console.error("\n❌ Error:", error);
    process.exit(1);
  }
}

async function statusCommand(sessionId?: string): Promise<void> {
  const db = await getDb();

  if (sessionId) {
    const session = await getSession(db, sessionId);
    if (!session) {
      console.error(`Session not found: ${sessionId}`);
      process.exit(1);
    }

    console.log(`\nSession: ${session.id}`);
    console.log(`Status: ${session.status}`);
    console.log(
      `Progress: ${session.completedTasks + session.failedTasks + session.skippedTasks}/${session.tasks.length}`
    );
  } else {
    const active = await getActiveSessions(db);
    if (active.length === 0) {
      console.log("No active sessions");
      return;
    }
    console.log(`\nActive Sessions: ${active.length}`);
    for (const s of active) {
      console.log(`  ${s.id} - ${s.status}`);
    }
  }
}

async function listCommand(): Promise<void> {
  const db = await getDb();
  const sessions = await getRecentSessions(db, 20);

  console.log(`\n${"=".repeat(80)}`);
  console.log("Recent Sessions:");
  console.log(`${"=".repeat(80)}`);

  for (const session of sessions) {
    const progress =
      session.completedTasks + session.failedTasks + session.skippedTasks;
    const total = session.tasks.length;
    console.log(`${session.id} - ${session.status} (${progress}/${total})`);
  }
}

async function logsCommand(sessionId: string): Promise<void> {
  if (!sessionId) {
    console.error("Error: Session ID required");
    process.exit(1);
  }

  const db = await getDb();
  const session = await getSession(db, sessionId);

  if (!session) {
    console.error(`Session not found: ${sessionId}`);
    process.exit(1);
  }

  for (const log of session.logs) {
    console.log(log);
  }
}

async function deleteCommand(sessionId: string): Promise<void> {
  if (!sessionId) {
    console.error("Error: Session ID required");
    process.exit(1);
  }

  const db = await getDb();
  await deleteSession(db, sessionId);
  console.log(`Deleted session: ${sessionId}`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  let command: string;
  let options: CLIOptions;
  let positional: string[];

  try {
    ({ command, options, positional } = parseArgs(args));
  } catch (error) {
    console.error(`Error: ${(error as Error).message}`);
    showHelp();
    process.exit(1);
  }

  switch (command) {
    case "run":
      await runCommand(options);
      break;
    case "resume":
      await resumeCommand(positional[0]);
      break;
    case "status":
      await statusCommand(positional[0]);
      break;
    case "list":
      await listCommand();
      break;
    case "logs":
      await logsCommand(positional[0]);
      break;
    case "delete":
      await deleteCommand(positional[0]);
      break;
    default:
      console.error(`Unknown command: ${command}`);
      showHelp();
      process.exit(1);
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
