// Mission types
import type { Entity, Timestamps } from "../common";

// Mission status
export type MissionStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

// Mission interface
export interface Mission extends Timestamps, Entity {
  task: string;
  context: string;
  status: MissionStatus;
  workItemIds: string[];
  startedAt?: Date;
  completedAt?: Date;
  result?: unknown;
  error?: string;
  model?: string;
  temperature?: number;
}
