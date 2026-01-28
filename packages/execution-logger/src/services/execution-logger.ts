import type {
  ExecutionLog,
  ExecutionMetrics,
  ExecutionReport,
  LogLevel,
} from "../types";

// TODO: Move to @openfarm/execution-logger when splitting repos
export class ExecutionLogger {
  private logs: ExecutionLog[] = [];
  private metrics: Map<string, ExecutionMetrics> = new Map();

  log(
    jobId: string,
    tenantId: string,
    level: LogLevel,
    message: string,
    metadata?: Record<string, unknown>
  ): void {
    const logEntry: ExecutionLog = {
      jobId,
      tenantId,
      timestamp: new Date(),
      level,
      message,
      metadata,
    };

    this.logs.push(logEntry);

    // Also log to console with structured format
    const logData = {
      jobId,
      tenantId,
      level,
      message,
      timestamp: logEntry.timestamp.toISOString(),
      ...metadata,
    };

    switch (level) {
      case "error":
        console.error(JSON.stringify(logData));
        break;
      case "warn":
        console.warn(JSON.stringify(logData));
        break;
      case "debug":
        console.debug(JSON.stringify(logData));
        break;
      default:
        console.log(JSON.stringify(logData));
    }
  }

  startExecution(jobId: string, tenantId: string, podName?: string): void {
    const metrics: ExecutionMetrics = {
      jobId,
      tenantId,
      startTime: new Date(),
      status: "running",
      podName,
    };

    this.metrics.set(jobId, metrics);
    this.log(jobId, tenantId, "info", "Execution started", { podName });
  }

  updateExecution(jobId: string, updates: Partial<ExecutionMetrics>): void {
    const existing = this.metrics.get(jobId);
    if (!existing) {
      console.warn(`No execution found for jobId: ${jobId}`);
      return;
    }

    const updated = { ...existing, ...updates };
    this.metrics.set(jobId, updated);
  }

  completeExecution(
    jobId: string,
    result: {
      tokensUsed?: number;
      costUsd?: number;
      filesModified?: string[];
      sessionId?: string;
    }
  ): void {
    const metrics = this.metrics.get(jobId);
    if (!metrics) {
      console.warn(`No execution found for jobId: ${jobId}`);
      return;
    }

    const endTime = new Date();
    const duration = endTime.getTime() - metrics.startTime.getTime();

    this.updateExecution(jobId, {
      endTime,
      duration,
      status: "completed",
      ...result,
    });

    this.log(
      metrics.jobId,
      metrics.tenantId,
      "info",
      "Execution completed successfully",
      {
        duration,
        tokensUsed: result.tokensUsed,
        costUsd: result.costUsd,
        filesModified: result.filesModified?.length || 0,
      }
    );
  }

  failExecution(jobId: string, error: string): void {
    const metrics = this.metrics.get(jobId);
    if (!metrics) {
      console.warn(`No execution found for jobId: ${jobId}`);
      return;
    }

    const endTime = new Date();
    const duration = endTime.getTime() - metrics.startTime.getTime();

    this.updateExecution(jobId, {
      endTime,
      duration,
      status: "failed",
      error,
    });

    this.log(metrics.jobId, metrics.tenantId, "error", "Execution failed", {
      duration,
      error,
    });
  }

  getExecutionLogs(jobId: string): ExecutionLog[] {
    return this.logs.filter((log) => log.jobId === jobId);
  }

  getExecutionMetrics(jobId: string): ExecutionMetrics | undefined {
    return this.metrics.get(jobId);
  }

  getTenantLogs(
    tenantId: string,
    fromDate?: Date,
    toDate?: Date
  ): ExecutionLog[] {
    return this.logs.filter((log) => {
      if (log.tenantId !== tenantId) return false;
      if (fromDate && log.timestamp < fromDate) return false;
      if (toDate && log.timestamp > toDate) return false;
      return true;
    });
  }

  getRecentLogs(limit = 100): ExecutionLog[] {
    return this.logs
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  generateExecutionReport(jobId: string): ExecutionReport | null {
    const metrics = this.getExecutionMetrics(jobId);
    const logs = this.getExecutionLogs(jobId);

    if (!metrics) {
      return null;
    }

    return {
      jobId,
      tenantId: metrics.tenantId,
      status: metrics.status,
      duration: metrics.duration,
      startTime: metrics.startTime,
      endTime: metrics.endTime,
      podName: metrics.podName,
      sessionId: metrics.sessionId,
      tokensUsed: metrics.tokensUsed,
      costUsd: metrics.costUsd,
      filesModified: metrics.filesModified,
      error: metrics.error,
      logCount: logs.length,
      errorCount: logs.filter((log) => log.level === "error").length,
      warnCount: logs.filter((log) => log.level === "warn").length,
    };
  }

  cleanup(maxAgeHours = 24): number {
    const cutoffTime = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);

    const initialLogCount = this.logs.length;
    this.logs = this.logs.filter((log) => log.timestamp > cutoffTime);

    // Clean up metrics for old executions
    for (const [jobId, metrics] of this.metrics.entries()) {
      if (metrics.startTime < cutoffTime) {
        this.metrics.delete(jobId);
      }
    }

    return initialLogCount - this.logs.length;
  }

  // Advanced querying methods
  getLogsByLevel(level: LogLevel, limit?: number): ExecutionLog[] {
    const filtered = this.logs.filter((log) => log.level === level);
    return limit ? filtered.slice(-limit) : filtered;
  }

  getExecutionsByStatus(
    status: ExecutionMetrics["status"]
  ): ExecutionMetrics[] {
    return Array.from(this.metrics.values()).filter((m) => m.status === status);
  }

  getExecutionsByTenant(tenantId: string): ExecutionMetrics[] {
    return Array.from(this.metrics.values()).filter(
      (m) => m.tenantId === tenantId
    );
  }

  getAverageExecutionTime(tenantId?: string): number {
    let executions = Array.from(this.metrics.values()).filter(
      (m) => m.duration !== undefined
    );

    if (tenantId) {
      executions = executions.filter((m) => m.tenantId === tenantId);
    }

    if (executions.length === 0) return 0;

    const totalDuration = executions.reduce(
      (sum, m) => sum + (m.duration || 0),
      0
    );
    return totalDuration / executions.length;
  }

  getSuccessRate(tenantId?: string): number {
    let executions = Array.from(this.metrics.values()).filter(
      (m) => m.status !== "running"
    );

    if (tenantId) {
      executions = executions.filter((m) => m.tenantId === tenantId);
    }

    if (executions.length === 0) return 0;

    const successful = executions.filter(
      (m) => m.status === "completed"
    ).length;
    return (successful / executions.length) * 100;
  }

  getExecutionStats(tenantId?: string): {
    total: number;
    running: number;
    completed: number;
    failed: number;
    averageDuration: number;
    successRate: number;
  } {
    let executions = Array.from(this.metrics.values());

    if (tenantId) {
      executions = executions.filter((m) => m.tenantId === tenantId);
    }

    const stats = {
      total: executions.length,
      running: executions.filter((m) => m.status === "running").length,
      completed: executions.filter((m) => m.status === "completed").length,
      failed: executions.filter((m) => m.status === "failed").length,
      averageDuration: this.getAverageExecutionTime(tenantId),
      successRate: this.getSuccessRate(tenantId),
    };

    return stats;
  }

  // Search and filtering
  searchLogs(query: string, tenantId?: string): ExecutionLog[] {
    const searchTerm = query.toLowerCase();

    return this.logs.filter((log) => {
      if (tenantId && log.tenantId !== tenantId) return false;

      return (
        log.message.toLowerCase().includes(searchTerm) ||
        log.jobId.toLowerCase().includes(searchTerm) ||
        (log.metadata &&
          JSON.stringify(log.metadata).toLowerCase().includes(searchTerm))
      );
    });
  }

  getLogsWithMetadata(key: string, value?: unknown): ExecutionLog[] {
    return this.logs.filter((log) => {
      if (!(log.metadata && key in log.metadata)) return false;
      if (value !== undefined) {
        return log.metadata[key] === value;
      }
      return true;
    });
  }

  // Export functionality
  exportLogs(tenantId?: string, format: "json" | "csv" = "json"): string {
    let logs = this.logs;

    if (tenantId) {
      logs = logs.filter((log) => log.tenantId === tenantId);
    }

    if (format === "csv") {
      const headers = ["timestamp", "jobId", "tenantId", "level", "message"];
      const csvRows = [
        headers.join(","),
        ...logs.map((log) =>
          [
            log.timestamp.toISOString(),
            log.jobId,
            log.tenantId,
            log.level,
            `"${log.message.replace(/"/g, '""')}"`,
          ].join(",")
        ),
      ];
      return csvRows.join("\n");
    }

    return JSON.stringify(logs, null, 2);
  }

  exportMetrics(tenantId?: string): string {
    let metrics = Array.from(this.metrics.values());

    if (tenantId) {
      metrics = metrics.filter((m) => m.tenantId === tenantId);
    }

    return JSON.stringify(metrics, null, 2);
  }
}
