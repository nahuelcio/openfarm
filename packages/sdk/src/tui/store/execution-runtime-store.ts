/**
 * Execution Runtime Store
 *
 * Holds ephemeral runtime state for active executions (logs, abort controllers,
 * step progress) that must survive component mount/unmount cycles.
 * This is separate from the main store because runtime state is not persisted
 * to the database - it only lives in memory while an execution is active.
 */

import { execSync } from "node:child_process";
import { appendFileSync } from "node:fs";
import { create } from "zustand";
import type { CategorizedError } from "../utils/error-handler";

const MAX_LOG_ENTRIES = 500;

export interface ExecutionRuntimeSession {
  executionId: string;
  logs: string[];
  isDone: boolean;
  success: boolean | null;
  currentStep: string;
  stepProgress: { current: number; total: number };
  stats: { tokens: number; files: number };
  abortController: AbortController | null;
  externalAgentSession: string | null;
  startTime: number;
  categorizedError: CategorizedError | null;
  lastLogRef: string;
  logFilePath: string | null;
}

interface ExecutionRuntimeState {
  sessions: Record<string, ExecutionRuntimeSession>;

  createSession: (
    executionId: string,
    startTime: number
  ) => ExecutionRuntimeSession;
  getSession: (executionId: string) => ExecutionRuntimeSession | undefined;
  hasActiveSession: () => boolean;
  getActiveSessionId: () => string | null;

  addLog: (executionId: string, msg: string) => void;
  updateSession: (
    executionId: string,
    updates: Partial<ExecutionRuntimeSession>
  ) => void;

  cancelExecution: (executionId: string) => void;
  removeSession: (executionId: string) => void;
}

function createEmptySession(
  executionId: string,
  startTime: number
): ExecutionRuntimeSession {
  return {
    executionId,
    logs: [],
    isDone: false,
    success: null,
    currentStep: "",
    stepProgress: { current: 0, total: 0 },
    stats: { tokens: 0, files: 0 },
    abortController: null,
    externalAgentSession: null,
    startTime,
    categorizedError: null,
    lastLogRef: "",
    logFilePath: null,
  };
}

// Transform raw log messages for cleaner TUI display
function transformLogMessage(msg: string): string | null {
  if (msg.startsWith("[INFO] Starting step:")) {
    return null;
  }
  const completedMatch = msg.match(
    /\[INFO\] Completed step: (\S+) \(([^)]+)\) in (\d+)ms/
  );
  if (completedMatch) {
    const duration = Number.parseInt(completedMatch[3], 10);
    const formatted =
      duration >= 1000 ? `${(duration / 1000).toFixed(1)}s` : `${duration}ms`;
    return `\u2713 ${completedMatch[2]} completed in ${formatted}`;
  }
  if (msg.trim() === "done" || msg.trim() === "\u2502 done") {
    return null;
  }
  if (msg.startsWith("\u2502 ")) {
    return `  ${msg.slice(2)}`;
  }
  if (msg.startsWith("[ERROR] ")) {
    return `\u2717 ${msg.slice(8)}`;
  }
  if (msg.includes("Executing agent code with")) {
    return null;
  }
  return msg;
}

function updateStats(
  stats: { tokens: number; files: number },
  msg: string
): { tokens: number; files: number } {
  let { tokens, files } = stats;
  if (msg.includes("Tokens:") || msg.includes("tokens")) {
    const match = msg.match(/(\d+)\s*tokens?/i);
    if (match) {
      tokens = Number.parseInt(match[1], 10);
    }
  }
  if (msg.includes("Created:") || msg.includes("Edited:")) {
    files += 1;
  }
  return { tokens, files };
}

export const useExecutionRuntimeStore = create<ExecutionRuntimeState>(
  (set, get) => ({
    sessions: {},

    createSession: (executionId, startTime) => {
      const session = createEmptySession(executionId, startTime);
      set((state) => ({
        sessions: { ...state.sessions, [executionId]: session },
      }));
      return session;
    },

    getSession: (executionId) => {
      return get().sessions[executionId];
    },

    hasActiveSession: () => {
      return Object.values(get().sessions).some((s) => !s.isDone);
    },

    getActiveSessionId: () => {
      const active = Object.values(get().sessions).find((s) => !s.isDone);
      return active?.executionId ?? null;
    },

    addLog: (executionId, msg) => {
      if (!msg || msg.trim() === "") {
        return;
      }

      const session = get().sessions[executionId];
      if (!session) {
        return;
      }

      // Always write raw message to log file
      if (session.logFilePath) {
        try {
          const timestamp = new Date().toISOString();
          appendFileSync(session.logFilePath, `[${timestamp}] ${msg}\n`);
        } catch {
          // Ignore file write errors
        }
      }

      // Track stats from raw message
      const newStats = updateStats(session.stats, msg);

      // Transform for TUI display
      const transformed = transformLogMessage(msg);
      if (transformed === null) {
        // Still update stats even if we don't display the message
        if (
          newStats.tokens !== session.stats.tokens ||
          newStats.files !== session.stats.files
        ) {
          set((state) => ({
            sessions: {
              ...state.sessions,
              [executionId]: {
                ...state.sessions[executionId],
                stats: newStats,
              },
            },
          }));
        }
        return;
      }

      // Skip duplicates
      if (transformed === session.lastLogRef) {
        return;
      }

      set((state) => {
        const s = state.sessions[executionId];
        if (!s) {
          return state;
        }
        const logs = [...s.logs, transformed];
        return {
          sessions: {
            ...state.sessions,
            [executionId]: {
              ...s,
              logs:
                logs.length > MAX_LOG_ENTRIES
                  ? logs.slice(-MAX_LOG_ENTRIES)
                  : logs,
              lastLogRef: transformed,
              stats: newStats,
            },
          },
        };
      });
    },

    updateSession: (executionId, updates) => {
      set((state) => {
        const s = state.sessions[executionId];
        if (!s) {
          return state;
        }
        return {
          sessions: {
            ...state.sessions,
            [executionId]: { ...s, ...updates },
          },
        };
      });
    },

    cancelExecution: (executionId) => {
      const session = get().sessions[executionId];
      if (!session || session.isDone) {
        return;
      }

      // Abort the execution
      session.abortController?.abort();

      // Kill tmux session if running
      if (session.externalAgentSession) {
        try {
          execSync(
            `tmux kill-session -t ${session.externalAgentSession} 2>/dev/null || true`
          );
        } catch {
          // Ignore
        }
      }

      // Update session state
      set((state) => {
        const s = state.sessions[executionId];
        if (!s) {
          return state;
        }
        return {
          sessions: {
            ...state.sessions,
            [executionId]: {
              ...s,
              isDone: true,
              success: false,
              abortController: null,
              externalAgentSession: null,
            },
          },
        };
      });
    },

    removeSession: (executionId) => {
      set((state) => {
        const { [executionId]: _removed, ...rest } = state.sessions;
        return { sessions: rest };
      });
    },
  })
);
