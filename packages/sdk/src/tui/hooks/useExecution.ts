import { useState, useCallback, useRef } from "react";
import { useAppStore } from "../store";
import { OpenFarm } from "../../open-farm";
import type { ExecutionOptions, ExecutionResult } from "../../types";

type ExecutionStatus = "idle" | "pending" | "running" | "completed" | "failed" | "cancelled";

interface ExecutionError {
  message: string;
  code?: string;
  retryable: boolean;
}

interface ExecutionState {
  status: ExecutionStatus;
  logs: string[];
  error: ExecutionError | null;
  progress: {
    current: number;
    total: number;
    message?: string;
  };
  startTime: number | null;
  endTime: number | null;
  tokens: number;
}

interface UseExecutionReturn extends ExecutionState {
  execute: (options: ExecutionOptions) => Promise<ExecutionResult | null>;
  cancel: () => void;
  retry: () => Promise<ExecutionResult | null>;
  reset: () => void;
  isExecuting: boolean;
  duration: number;
}

export function useExecution(): UseExecutionReturn {
  const { config } = useAppStore();
  const [state, setState] = useState<ExecutionState>({
    status: "idle",
    logs: [],
    error: null,
    progress: { current: 0, total: 0 },
    startTime: null,
    endTime: null,
    tokens: 0,
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const lastOptionsRef = useRef<ExecutionOptions | null>(null);
  const executionIdRef = useRef<string | null>(null);

  const reset = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    lastOptionsRef.current = null;
    executionIdRef.current = null;
    
    setState({
      status: "idle",
      logs: [],
      error: null,
      progress: { current: 0, total: 0 },
      startTime: null,
      endTime: null,
      tokens: 0,
    });
  }, []);

  const execute = useCallback(
    async (options: ExecutionOptions): Promise<ExecutionResult | null> => {
      // Cancel any existing execution
      abortControllerRef.current?.abort();
      
      // Store options for potential retry
      lastOptionsRef.current = options;
      
      const startTime = Date.now();
      setState({
        status: "pending",
        logs: [],
        error: null,
        progress: { current: 0, total: 0 },
        startTime,
        endTime: null,
        tokens: 0,
      });

      abortControllerRef.current = new AbortController();
      const client = new OpenFarm(config);

      try {
        setState((s) => ({ ...s, status: "running" }));

        const result = await client.execute({
          ...options,
          stream: true,
          onProgress: (chunk) => {
            setState((s) => {
              const newLogs = [...s.logs, chunk];
              
              // Parse progress from various formats
              let progress = s.progress;
              
              // Format: [current/total]
              const bracketMatch = chunk.match(/\[(\d+)\/(\d+)\]/);
              if (bracketMatch) {
                progress = {
                  current: parseInt(bracketMatch[1], 10),
                  total: parseInt(bracketMatch[2], 10),
                };
              }
              
              // Format: Progress: X%
              const percentMatch = chunk.match(/Progress:\s*(\d+)%/i);
              if (percentMatch) {
                const percent = parseInt(percentMatch[1], 10);
                progress = {
                  current: percent,
                  total: 100,
                };
              }
              
              // Format: Step X of Y
              const stepMatch = chunk.match(/Step\s+(\d+)\s+of\s+(\d+)/i);
              if (stepMatch) {
                progress = {
                  current: parseInt(stepMatch[1], 10),
                  total: parseInt(stepMatch[2], 10),
                };
              }

              // Extract progress message
              if (chunk.includes(":") && !chunk.includes("http")) {
                const message = chunk.split(":")[0].trim();
                if (message && message.length < 50) {
                  progress = { ...progress, message };
                }
              }

              return {
                ...s,
                logs: newLogs,
                progress,
              };
            });
          },
        });

        const endTime = Date.now();
        
        setState((s) => ({
          ...s,
          status: result.success ? "completed" : "failed",
          endTime,
          tokens: result.tokens || 0,
          error: result.success
            ? null
            : {
                message: result.error || "Execution failed",
                retryable: true,
              },
        }));

        return result;
      } catch (err) {
        const endTime = Date.now();
        
        // Check if this was a cancellation
        if (abortControllerRef.current?.signal.aborted) {
          setState((s) => ({
            ...s,
            status: "cancelled",
            endTime,
            error: {
              message: "Execution cancelled by user",
              retryable: true,
            },
          }));
          return null;
        }

        // Handle different error types
        let error: ExecutionError;
        
        if (err instanceof Error) {
          // Network errors
          if (err.message.includes("ECONNREFUSED") || err.message.includes("connection")) {
            error = {
              message: "Connection failed. Is the AI provider running?",
              code: "CONNECTION_ERROR",
              retryable: true,
            };
          } else if (err.message.includes("timeout") || err.message.includes("TIMEOUT")) {
            error = {
              message: "Request timed out. Try again or reduce task complexity.",
              code: "TIMEOUT",
              retryable: true,
            };
          } else if (err.message.includes("auth") || err.message.includes("unauthorized")) {
            error = {
              message: "Authentication failed. Check your API key.",
              code: "AUTH_ERROR",
              retryable: false,
            };
          } else {
            error = {
              message: err.message,
              retryable: true,
            };
          }
        } else {
          error = {
            message: String(err),
            retryable: true,
          };
        }

        setState((s) => ({
          ...s,
          status: "failed",
          endTime,
          error,
        }));

        return null;
      }
    },
    [config]
  );

  const cancel = useCallback(() => {
    abortControllerRef.current?.abort();
    setState((s) => ({
      ...s,
      status: "cancelled",
      endTime: Date.now(),
    }));
  }, []);

  const retry = useCallback(async (): Promise<ExecutionResult | null> => {
    if (lastOptionsRef.current) {
      return execute(lastOptionsRef.current);
    }
    return null;
  }, [execute]);

  // Calculate duration
  const duration =
    state.startTime && state.endTime
      ? state.endTime - state.startTime
      : state.startTime
      ? Date.now() - state.startTime
      : 0;

  return {
    ...state,
    execute,
    cancel,
    retry,
    reset,
    isExecuting: state.status === "running" || state.status === "pending",
    duration,
  };
}

// Hook for managing multiple executions with history
export function useExecutionHistory() {
  const { executions, addExecution, updateExecution } = useAppStore();

  const createExecution = useCallback(
    async (
      task: string,
      provider: string,
      executeFn: () => Promise<ExecutionResult>
    ) => {
      const execution = {
        id: `exec_${Date.now()}`,
        task,
        provider,
        status: "pending" as const,
        startedAt: new Date(),
      };

      addExecution(execution);

      try {
        updateExecution(execution.id, { status: "running" });
        const result = await executeFn();

        updateExecution(execution.id, {
          status: result.success ? "completed" : "failed",
          result,
          completedAt: new Date(),
        });

        return result;
      } catch (error) {
        updateExecution(execution.id, {
          status: "failed",
          completedAt: new Date(),
        });
        throw error;
      }
    },
    [addExecution, updateExecution]
  );

  return {
    executions,
    createExecution,
  };
}
