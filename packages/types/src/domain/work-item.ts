// Work item types
import type { Entity, Timestamps } from "../common";

// Work item status
export type WorkItemStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "failed"
  | "cancelled";

// Work item types
export type WorkItemType =
  | "issue"
  | "pr"
  | "task"
  | "bug"
  | "feature"
  | "refactor";

// Work item interface
export interface WorkItem extends Timestamps, Entity {
  title: string;
  description: string;
  status: WorkItemStatus;
  type: WorkItemType;
  priority: "low" | "medium" | "high" | "critical";
  assignee?: string;
  labels: string[];
  metadata: Record<string, unknown>;
  missionId?: string;
}
