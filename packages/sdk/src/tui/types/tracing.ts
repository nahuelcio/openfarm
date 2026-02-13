/**
 * Subagent Tracing Types
 *
 * Types for tracking and visualizing nested agent calls.
 */

/**
 * Status of a trace node
 */
export type TraceStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

/**
 * A single trace node representing one subagent call
 */
export interface TraceNode {
  /** Unique identifier */
  id: string;

  /** Parent trace ID (undefined for root) */
  parentId?: string;

  /** Display name */
  name: string;

  /** Icon emoji or symbol */
  icon: string;

  /** Current status */
  status: TraceStatus;

  /** Input/prompt sent to subagent */
  input?: string;

  /** Output/result from subagent */
  output?: string;

  /** Error message if failed */
  error?: string;

  /** Start timestamp */
  startedAt: string;

  /** End timestamp (undefined if running) */
  completedAt?: string;

  /** Duration in milliseconds */
  durationMs?: number;

  /** Child traces */
  children: TraceNode[];

  /** Additional metadata */
  metadata: TraceMetadata;
}

/**
 * Metadata for a trace
 */
export interface TraceMetadata {
  /** Model used */
  model?: string;

  /** Provider type */
  provider?: string;

  /** Tokens used (input) */
  tokensIn?: number;

  /** Tokens used (output) */
  tokensOut?: number;

  /** Estimated cost in USD */
  cost?: number;

  /** Number of files modified */
  filesModified?: number;

  /** Number of files created */
  filesCreated?: number;

  /** Custom metadata */
  [key: string]: unknown;
}

/**
 * A complete trace tree for a session
 */
export interface TraceTree {
  /** Session identifier */
  sessionId: string;

  /** Root trace nodes */
  roots: TraceNode[];

  /** All nodes by ID for quick lookup */
  nodes: Map<string, TraceNode>;

  /** When the trace started */
  startedAt: string;

  /** Last update timestamp */
  updatedAt: string;
}

/**
 * Events emitted by the tracing system
 */
export type TraceEvent =
  | { type: "trace.started"; node: TraceNode }
  | { type: "trace.completed"; node: TraceNode }
  | { type: "trace.failed"; node: TraceNode; error: string }
  | { type: "trace.updated"; node: TraceNode }
  | { type: "tree.cleared"; sessionId: string };

/**
 * Configuration for tracing
 */
export interface TracingConfig {
  /** Maximum depth to trace */
  maxDepth: number;

  /** Whether to capture input/output */
  captureIO: boolean;

  /** Whether to calculate costs */
  trackCosts: boolean;

  /** Filter which agents to trace */
  agentFilter?: string[];
}

/**
 * Options for starting a trace
 */
export interface StartTraceOptions {
  /** Parent trace ID (undefined for root) */
  parentId?: string;

  /** Display name */
  name: string;

  /** Icon */
  icon?: string;

  /** Initial input */
  input?: string;

  /** Metadata */
  metadata?: Partial<TraceMetadata>;
}

/**
 * Tree view state for UI
 */
export interface TreeViewState {
  /** Expanded node IDs */
  expanded: Set<string>;

  /** Selected node ID */
  selected?: string;

  /** Whether to follow new traces */
  followNew: boolean;

  /** Filter query */
  filter?: string;
}
