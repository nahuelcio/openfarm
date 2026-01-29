import { useState, useCallback, useRef } from "react";
import { useAppStore } from "../store";
import { OpenFarm } from "../../open-farm";
import type { ExecutionOptions } from "../../types";

type ExecutionStatus = "idle" | "pending" | "running" | "completed" | "failed" | "cancelled";

interface ExecutionState {
  status: ExecutionStatus;
  logs: string[];
  error: Error | null;
  progress: {
    current: number;
    total: number;
  };
}

interface UseExecutionReturn extends ExecutionState {
  execute: (options: ExecutionOptions) => Promise<void>;
  cancel: () => void;
  isExecuting: boolean;
}

export function useExecution(): UseExecutionReturn {
  const { config, updateExecution } = useAppStore();
  const [state, setState] = useState<ExecutionState>({
    status: "idle",
    logs: [],
    error: null,
    progress: { current: 0, total: 0 },
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const executionIdRef = useRef<string | null>(null);

  const execute = useCallback(
    async (options: ExecutionOptions) => {
      setState({
        status: "pending",
        logs: [],
        error: null,
        progress: { current: 0, total: 0 },
      });

      abortControllerRef.current = new AbortController();
      const client = new OpenFarm(config);

      try {
        setState((s) => ({ ...s, status: "running" }));

        const result = await client.execute({
          ...options,
          stream: true,
          onProgress: (chunk) => {
            setState((s) => ({
              ...s,
              logs: [...s.logs, chunk],
            }));

            // Parse progress if available [current/total]
            const progressMatch = chunk.match(/\[(\d+)\/(\d+)\]/);
            if (progressMatch) {
              setState((s) => ({
                ...s,
                progress: {
                  current: parseInt(progressMatch[1], 10),
                  total: parseInt(progressMatch[2], 10),
                },
              }));
            }
          },
        });

        // Update execution in store
        if (executionIdRef.current) {
          updateExecution(executionIdRef.current, {
            status: result.success ? "completed" : "failed",
            result,
            completedAt: new Date(),
          });
        }

        setState((s) => ({
          ...s,
          status: result.success ? "completed" : "failed",
        }));
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        
        if (executionIdRef.current) {
          updateExecution(executionIdRef.current, {
            status: "failed",
            completedAt: new Date(),
          });
        }

        setState((s) => ({
          ...s,
          status: "failed",
          error,
        }));
      }
    },
    [config, updateExecution]
  );

  const cancel = useCallback(() => {
    abortControllerRef.current?.abort();
    
    if (executionIdRef.current) {
      updateExecution(executionIdRef.current, {
        status: "failed",
        completedAt: new Date(),
      });
    }

    setState((s) => ({
      ...s,
      status: "cancelled",
    }));
  }, [updateExecution]);

  return {
    ...state,
    execute,
    cancel,
    isExecuting: state.status === "running" || state.status === "pending",
  };
}
