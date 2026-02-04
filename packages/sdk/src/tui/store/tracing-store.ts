/**
 * Tracing Store
 *
 * Manages trace tree state and provides actions for updating traces.
 */

import { create } from "zustand";
import type {
  TraceEvent,
  TraceNode,
  TraceTree,
  TreeViewState,
} from "../types/tracing";

interface TracingState {
  /** Current trace tree */
  tree: TraceTree | null;

  /** UI state for tree view */
  viewState: TreeViewState;

  /** Whether tracing panel is visible */
  isVisible: boolean;

  /** Toggle panel visibility */
  toggleVisibility: () => void;

  /** Initialize a new trace tree */
  initTree: (sessionId: string) => void;

  /** Start a new trace node */
  startTrace: (
    parentId: string | undefined,
    name: string,
    icon?: string,
    input?: string
  ) => string;

  /** Complete a trace node */
  completeTrace: (id: string, output?: string) => void;

  /** Fail a trace node */
  failTrace: (id: string, error: string) => void;

  /** Update trace metadata */
  updateTrace: (id: string, updates: Partial<TraceNode>) => void;

  /** Toggle expanded state of a node */
  toggleExpanded: (id: string) => void;

  /** Select a node */
  selectNode: (id: string | undefined) => void;

  /** Clear the tree */
  clearTree: () => void;

  /** Expand all nodes */
  expandAll: () => void;

  /** Collapse all nodes */
  collapseAll: () => void;

  /** Subscribe to trace events */
  subscribe: (callback: (event: TraceEvent) => void) => () => void;
}

let eventSubscribers: ((event: TraceEvent) => void)[] = [];

function emitEvent(event: TraceEvent) {
  eventSubscribers.forEach((cb) => cb(event));
}

function generateId(): string {
  return `trace-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function createNode(
  id: string,
  parentId: string | undefined,
  name: string,
  icon: string,
  input?: string
): TraceNode {
  return {
    id,
    parentId,
    name,
    icon,
    status: "running",
    input,
    startedAt: new Date().toISOString(),
    children: [],
    metadata: {},
  };
}

export const useTracingStore = create<TracingState>((set, get) => ({
  tree: null,
  viewState: {
    expanded: new Set(),
    followNew: true,
  },
  isVisible: false,

  toggleVisibility: () => set((state) => ({ isVisible: !state.isVisible })),

  initTree: (sessionId) => {
    const tree: TraceTree = {
      sessionId,
      roots: [],
      nodes: new Map(),
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    set({ tree, viewState: { expanded: new Set(), followNew: true } });
  },

  startTrace: (parentId, name, icon, input) => {
    const id = generateId();
    const node = createNode(id, parentId, name, icon, input);

    set((state) => {
      if (!state.tree) {
        return state;
      }

      const tree = { ...state.tree };
      tree.nodes = new Map(tree.nodes);
      tree.nodes.set(id, node);

      if (parentId) {
        const parent = tree.nodes.get(parentId);
        if (parent) {
          parent.children = [...parent.children, node];
        }
      } else {
        tree.roots = [...tree.roots, node];
      }

      tree.updatedAt = new Date().toISOString();

      // Auto-expand if followNew is enabled
      const viewState = { ...state.viewState };
      if (viewState.followNew && parentId) {
        viewState.expanded = new Set(viewState.expanded);
        viewState.expanded.add(parentId);
      }

      return { tree, viewState };
    });

    emitEvent({ type: "trace.started", node });
    return id;
  },

  completeTrace: (id, output) => {
    set((state) => {
      if (!state.tree) {
        return state;
      }

      const node = state.tree.nodes.get(id);
      if (!node) {
        return state;
      }

      const completedAt = new Date().toISOString();
      const durationMs =
        completedAt && node.startedAt
          ? new Date(completedAt).getTime() - new Date(node.startedAt).getTime()
          : undefined;

      const updatedNode: TraceNode = {
        ...node,
        status: "completed",
        output,
        completedAt,
        durationMs,
      };

      const tree = { ...state.tree };
      tree.nodes = new Map(tree.nodes);
      tree.nodes.set(id, updatedNode);
      tree.updatedAt = completedAt;

      return { tree };
    });

    const node = get().tree?.nodes.get(id);
    if (node) {
      emitEvent({ type: "trace.completed", node });
    }
  },

  failTrace: (id, error) => {
    set((state) => {
      if (!state.tree) {
        return state;
      }

      const node = state.tree.nodes.get(id);
      if (!node) {
        return state;
      }

      const completedAt = new Date().toISOString();
      const durationMs =
        completedAt && node.startedAt
          ? new Date(completedAt).getTime() - new Date(node.startedAt).getTime()
          : undefined;

      const updatedNode: TraceNode = {
        ...node,
        status: "failed",
        error,
        completedAt,
        durationMs,
      };

      const tree = { ...state.tree };
      tree.nodes = new Map(tree.nodes);
      tree.nodes.set(id, updatedNode);
      tree.updatedAt = completedAt;

      return { tree };
    });

    const node = get().tree?.nodes.get(id);
    if (node) {
      emitEvent({ type: "trace.failed", node, error });
    }
  },

  updateTrace: (id, updates) => {
    set((state) => {
      if (!state.tree) {
        return state;
      }

      const node = state.tree.nodes.get(id);
      if (!node) {
        return state;
      }

      const updatedNode = { ...node, ...updates };

      const tree = { ...state.tree };
      tree.nodes = new Map(tree.nodes);
      tree.nodes.set(id, updatedNode);
      tree.updatedAt = new Date().toISOString();

      return { tree };
    });

    const node = get().tree?.nodes.get(id);
    if (node) {
      emitEvent({ type: "trace.updated", node });
    }
  },

  toggleExpanded: (id) =>
    set((state) => {
      const expanded = new Set(state.viewState.expanded);
      if (expanded.has(id)) {
        expanded.delete(id);
      } else {
        expanded.add(id);
      }
      return { viewState: { ...state.viewState, expanded } };
    }),

  selectNode: (id) =>
    set((state) => ({
      viewState: { ...state.viewState, selected: id },
    })),

  clearTree: () => {
    const sessionId = get().tree?.sessionId;
    set({ tree: null, viewState: { expanded: new Set(), followNew: true } });
    if (sessionId) {
      emitEvent({ type: "tree.cleared", sessionId });
    }
  },

  expandAll: () => {
    const { tree } = get();
    if (!tree) {
      return;
    }

    const allIds = Array.from(tree.nodes.keys());
    set((state) => ({
      viewState: { ...state.viewState, expanded: new Set(allIds) },
    }));
  },

  collapseAll: () =>
    set((state) => ({
      viewState: { ...state.viewState, expanded: new Set() },
    })),

  subscribe: (callback) => {
    eventSubscribers.push(callback);
    return () => {
      eventSubscribers = eventSubscribers.filter((cb) => cb !== callback);
    };
  },
}));
