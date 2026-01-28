// Job types
import type { Entity, Timestamps } from "../common";

// Job status
export type JobStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "cancelled"
  | "timeout";

// Job interface
export interface Job extends Timestamps, Entity {
  workItemId: string;
  missionId?: string;
  status: JobStatus;
  priority: number;
  startedAt?: Date;
  completedAt?: Date;
  result?: unknown;
  error?: string;
  retryCount: number;
  maxRetries: number;
}
