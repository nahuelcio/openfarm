import type { MetricPoint, MetricSeries } from "../types";

// TODO: Move to @openfarm/execution-logger when splitting repos
export class MetricsCollector {
  private readonly metrics: Map<string, MetricSeries> = new Map();

  recordMetric(
    name: string,
    value: number,
    labels?: Record<string, string>
  ): void {
    const point: MetricPoint = {
      timestamp: new Date(),
      value,
      labels,
    };

    const existing = this.metrics.get(name);
    if (existing) {
      existing.points.push(point);
    } else {
      this.metrics.set(name, {
        name,
        points: [point],
      });
    }
  }

  incrementCounter(name: string, labels?: Record<string, string>): void {
    this.recordMetric(name, 1, labels);
  }

  recordDuration(
    name: string,
    startTime: Date,
    endTime?: Date,
    labels?: Record<string, string>
  ): void {
    const end = endTime || new Date();
    const duration = end.getTime() - startTime.getTime();
    this.recordMetric(name, duration, labels);
  }

  recordGauge(
    name: string,
    value: number,
    labels?: Record<string, string>
  ): void {
    this.recordMetric(name, value, labels);
  }

  getMetric(name: string): MetricSeries | undefined {
    return this.metrics.get(name);
  }

  getAllMetrics(): MetricSeries[] {
    return Array.from(this.metrics.values());
  }

  getMetricsByLabel(labelKey: string, labelValue: string): MetricSeries[] {
    return Array.from(this.metrics.values()).filter((series) =>
      series.points.some(
        (point) => point.labels && point.labels[labelKey] === labelValue
      )
    );
  }

  aggregateMetric(
    name: string,
    aggregation: "sum" | "avg" | "max" | "min" | "count",
    timeWindow?: {
      start: Date;
      end: Date;
    }
  ): number {
    const metric = this.metrics.get(name);
    if (!metric) {
      return 0;
    }

    let points = metric.points;

    // Filter by time window if provided
    if (timeWindow) {
      points = points.filter(
        (point) =>
          point.timestamp >= timeWindow.start &&
          point.timestamp <= timeWindow.end
      );
    }

    if (points.length === 0) {
      return 0;
    }

    const values = points.map((p) => p.value);

    switch (aggregation) {
      case "sum":
        return values.reduce((sum, val) => sum + val, 0);
      case "avg":
        return values.reduce((sum, val) => sum + val, 0) / values.length;
      case "max":
        return Math.max(...values);
      case "min":
        return Math.min(...values);
      case "count":
        return values.length;
      default:
        return 0;
    }
  }

  getTimeSeriesData(
    name: string,
    bucketSize = 60_000
  ): Array<{
    timestamp: Date;
    value: number;
  }> {
    const metric = this.metrics.get(name);
    if (!metric) {
      return [];
    }

    // Group points into time buckets
    const buckets = new Map<number, number[]>();

    for (const point of metric.points) {
      const bucketKey =
        Math.floor(point.timestamp.getTime() / bucketSize) * bucketSize;

      if (!buckets.has(bucketKey)) {
        buckets.set(bucketKey, []);
      }
      buckets.get(bucketKey)!.push(point.value);
    }

    // Convert to time series with averages
    return Array.from(buckets.entries())
      .map(([timestamp, values]) => ({
        timestamp: new Date(timestamp),
        value: values.reduce((sum, val) => sum + val, 0) / values.length,
      }))
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  cleanup(maxAgeHours = 24): number {
    const cutoffTime = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);
    let removedPoints = 0;

    for (const [name, series] of this.metrics.entries()) {
      const initialCount = series.points.length;
      series.points = series.points.filter(
        (point) => point.timestamp > cutoffTime
      );
      removedPoints += initialCount - series.points.length;

      // Remove empty series
      if (series.points.length === 0) {
        this.metrics.delete(name);
      }
    }

    return removedPoints;
  }

  // Utility methods for common metrics
  recordExecutionStart(jobId: string, tenantId: string): void {
    this.incrementCounter("executions_started", { tenantId });
    this.recordGauge("active_executions", this.getActiveExecutions());
  }

  recordExecutionComplete(
    jobId: string,
    tenantId: string,
    duration: number,
    tokensUsed: number
  ): void {
    this.incrementCounter("executions_completed", { tenantId });
    this.recordDuration(
      "execution_duration",
      new Date(Date.now() - duration),
      new Date(),
      { tenantId }
    );
    this.recordMetric("tokens_used", tokensUsed, { tenantId });
    this.recordGauge("active_executions", this.getActiveExecutions());
  }

  recordExecutionFailed(jobId: string, tenantId: string, error: string): void {
    this.incrementCounter("executions_failed", {
      tenantId,
      error_type: this.categorizeError(error),
    });
    this.recordGauge("active_executions", this.getActiveExecutions());
  }

  recordQuotaCheck(tenantId: string, allowed: boolean, reason?: string): void {
    this.incrementCounter("quota_checks", {
      tenantId,
      result: allowed ? "allowed" : "denied",
      reason: reason || "unknown",
    });
  }

  recordApiKeyValidation(tenantId: string, success: boolean): void {
    this.incrementCounter("api_key_validations", {
      tenantId,
      result: success ? "success" : "failure",
    });
  }

  // Dashboard metrics
  getDashboardMetrics(tenantId?: string): {
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    averageDuration: number;
    totalTokensUsed: number;
    activeExecutions: number;
  } {
    const labelFilter = tenantId ? { tenantId } : undefined;

    const totalExecutions = this.getMetricSum(
      "executions_started",
      labelFilter
    );
    const successfulExecutions = this.getMetricSum(
      "executions_completed",
      labelFilter
    );
    const failedExecutions = this.getMetricSum(
      "executions_failed",
      labelFilter
    );

    const avgDuration = this.aggregateMetric("execution_duration", "avg");
    const totalTokens = this.getMetricSum("tokens_used", labelFilter);
    const activeExecutions = this.getActiveExecutions();

    return {
      totalExecutions,
      successfulExecutions,
      failedExecutions,
      averageDuration: avgDuration,
      totalTokensUsed: totalTokens,
      activeExecutions,
    };
  }

  private getMetricSum(
    name: string,
    labelFilter?: Record<string, string>
  ): number {
    const metric = this.metrics.get(name);
    if (!metric) {
      return 0;
    }

    let points = metric.points;

    if (labelFilter) {
      points = points.filter((point) => {
        if (!point.labels) {
          return false;
        }
        return Object.entries(labelFilter).every(
          ([key, value]) => point.labels![key] === value
        );
      });
    }

    return points.reduce((sum, point) => sum + point.value, 0);
  }

  private getActiveExecutions(): number {
    // This would typically come from the execution logger
    // For now, return a placeholder
    return 0;
  }

  private categorizeError(error: string): string {
    const errorLower = error.toLowerCase();

    if (errorLower.includes("quota")) {
      return "quota_exceeded";
    }
    if (errorLower.includes("timeout")) {
      return "timeout";
    }
    if (errorLower.includes("auth")) {
      return "authentication";
    }
    if (errorLower.includes("permission")) {
      return "authorization";
    }
    if (errorLower.includes("network")) {
      return "network";
    }
    if (errorLower.includes("pod")) {
      return "infrastructure";
    }

    return "unknown";
  }

  // Export functionality
  exportMetrics(format: "json" | "prometheus" = "json"): string {
    if (format === "prometheus") {
      return this.toPrometheusFormat();
    }

    return JSON.stringify(Array.from(this.metrics.values()), null, 2);
  }

  private toPrometheusFormat(): string {
    const lines: string[] = [];

    for (const series of this.metrics.values()) {
      // Add metric help and type
      lines.push(`# HELP ${series.name} Generated metric`);
      lines.push(`# TYPE ${series.name} gauge`);

      // Add data points
      for (const point of series.points) {
        let metricLine = series.name;

        if (point.labels && Object.keys(point.labels).length > 0) {
          const labelPairs = Object.entries(point.labels)
            .map(([key, value]) => `${key}="${value}"`)
            .join(",");
          metricLine += `{${labelPairs}}`;
        }

        metricLine += ` ${point.value} ${point.timestamp.getTime()}`;
        lines.push(metricLine);
      }
    }

    return lines.join("\n");
  }
}
