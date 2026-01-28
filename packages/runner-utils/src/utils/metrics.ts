interface MetricsEvent {
  name: string;
  timestamp: number;
  value: number;
  tags?: Record<string, string>;
}

interface MetricsEventInput {
  name: string;
  value: number;
  tags?: Record<string, string>;
}

class MetricsCollector {
  private metrics: MetricsEvent[] = [];
  private readonly maxEvents = 1000;

  increment(name: string, tags?: Record<string, string>): void {
    this.record({
      name: `${name}.count`,
      value: 1,
      tags,
    });
  }

  histogram(name: string, value: number, tags?: Record<string, string>): void {
    this.record({
      name,
      value,
      tags,
    });
  }

  private record(event: MetricsEventInput): void {
    this.metrics.push({
      ...event,
      timestamp: Date.now(),
    });

    if (this.metrics.length > this.maxEvents) {
      this.metrics.shift();
    }
  }

  getMetrics(): MetricsEvent[] {
    return [...this.metrics];
  }

  clear(): void {
    this.metrics = [];
  }
}

export const metrics = new MetricsCollector();
