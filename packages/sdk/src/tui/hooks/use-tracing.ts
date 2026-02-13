/**
 * UseTracing Hook
 *
 * Simplified API for using the tracing system in components.
 */

import { useCallback, useEffect, useRef } from "react";
import { useTracingStore } from "../store/tracing-store";
import type { TraceMetadata } from "../types/tracing";

interface UseTracingOptions {
  /** Session ID to initialize tracing for */
  sessionId?: string;

  /** Auto-initialize on mount */
  autoInit?: boolean;
}

interface TraceHandle {
  /** Complete the trace with output */
  complete: (output?: string) => void;

  /** Fail the trace with error */
  fail: (error: string) => void;

  /** Update trace metadata */
  update: (metadata: TraceMetadata) => void;
}

/**
 * Hook for subagent tracing
 *
 * Usage:
 * ```typescript
 * const { startTrace, initTree } = useTracing({ sessionId: "session-123" });
 *
 * // Start a trace
 * const traceId = startTrace(undefined, "analyze-codebase", "🔍");
 *
 * // In subagent:
 * const childId = startTrace(traceId, "search-files", "📁");
 * // ... do work ...
 * completeTrace(childId);
 *
 * completeTrace(traceId);
 * ```
 */
export function useTracing(options: UseTracingOptions = {}) {
  const { sessionId, autoInit = true } = options;

  const store = useTracingStore();
  const traceIds = useRef<Set<string>>(new Set());

  // Auto-initialize tree
  useEffect(() => {
    if (autoInit && sessionId && !store.tree) {
      store.initTree(sessionId);
    }
  }, [autoInit, sessionId, store]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Mark all running traces as cancelled
      traceIds.current.forEach((id) => {
        const node = store.tree?.nodes.get(id);
        if (node && node.status === "running") {
          store.updateTrace(id, { status: "cancelled" });
        }
      });
    };
  }, [store]);

  /**
   * Start a new trace
   */
  const startTrace = useCallback(
    (
      parentId: string | undefined,
      name: string,
      icon?: string,
      input?: string
    ): string => {
      const id = store.startTrace(parentId, name, icon, input);
      traceIds.current.add(id);
      return id;
    },
    [store]
  );

  /**
   * Complete a trace
   */
  const completeTrace = useCallback(
    (id: string, output?: string) => {
      store.completeTrace(id, output);
      traceIds.current.delete(id);
    },
    [store]
  );

  /**
   * Fail a trace
   */
  const failTrace = useCallback(
    (id: string, error: string) => {
      store.failTrace(id, error);
      traceIds.current.delete(id);
    },
    [store]
  );

  /**
   * Update trace metadata
   */
  const updateTrace = useCallback(
    (id: string, metadata: TraceMetadata) => {
      store.updateTrace(id, { metadata });
    },
    [store]
  );

  /**
   * Create a scoped tracer for a parent trace
   */
  const createScopedTracer = useCallback(
    (parentId: string) => {
      return {
        start: (name: string, icon?: string, input?: string): string => {
          return startTrace(parentId, name, icon, input);
        },
      };
    },
    [startTrace]
  );

  /**
   * Wrap a function with tracing
   */
  const wrapWithTrace = useCallback(
    <T extends (...args: unknown[]) => Promise<unknown>>(
      fn: T,
      name: string,
      icon?: string
    ): ((...args: Parameters<T>) => Promise<unknown>) => {
      return async (...args: Parameters<T>): Promise<unknown> => {
        const id = startTrace(undefined, name, icon);
        try {
          const result = await fn(...args);
          completeTrace(id, String(result));
          return result;
        } catch (error) {
          failTrace(id, error instanceof Error ? error.message : String(error));
          throw error;
        }
      };
    },
    [startTrace, completeTrace, failTrace]
  );

  return {
    // Tree management
    initTree: store.initTree,
    clearTree: store.clearTree,
    tree: store.tree,

    // Trace operations
    startTrace,
    completeTrace,
    failTrace,
    updateTrace,

    // Utilities
    createScopedTracer,
    wrapWithTrace,

    // UI state
    isVisible: store.isVisible,
    toggleVisibility: store.toggleVisibility,
    viewState: store.viewState,
    toggleExpanded: store.toggleExpanded,
    expandAll: store.expandAll,
    collapseAll: store.collapseAll,
  };
}

export type { TraceHandle, UseTracingOptions };
