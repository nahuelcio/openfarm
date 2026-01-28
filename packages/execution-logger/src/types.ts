// Execution Logger Types
// Future: Part of @openfarm/execution-logger

export type LogLevel = "info" | "warn" | "error" | "debug";

export interface ExecutionLog {
  jobId: string;
  tenantId: string;
  timestamp: Date;
  level: LogLevel;
  message: string;
  metadata?: Record<string, unknown>;
}

export interface ExecutionMetrics {
  jobId: string;
  tenantId: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  status: "running" | "completed" | "failed";
  podName?: string;
  sessionId?: string;
  tokensUsed?: number;
  costUsd?: number;
  filesModified?: string[];
  error?: string;
}

export interface ExecutionReport {
  jobId: string;
  tenantId: string;
  status: "running" | "completed" | "failed";
  duration?: number;
  startTime: Date;
  endTime?: Date;
  podName?: string;
  sessionId?: string;
  tokensUsed?: number;
  costUsd?: number;
  filesModified?: string[];
  error?: string;
  logCount: number;
  errorCount: number;
  warnCount: number;
}

export interface MetricPoint {
  timestamp: Date;
  value: number;
  labels?: Record<string, string>;
}

export interface MetricSeries {
  name: string;
  points: MetricPoint[];
  aggregation?: "sum" | "avg" | "max" | "min" | "count";
}
