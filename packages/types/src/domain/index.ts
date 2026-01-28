// Domain types stub
export interface Timestamps {
  createdAt: Date;
  updatedAt: Date;
}

export interface Entity {
  id: string;
}

export interface WorkItem extends Timestamps, Entity {
  title: string;
  description: string;
  status: "pending" | "in_progress" | "completed" | "failed";
  type: "issue" | "pr" | "task";
  metadata: Record<string, unknown>;
}

export interface Job extends Timestamps, Entity {
  workItemId: string;
  status: "pending" | "running" | "completed" | "failed";
  result?: unknown;
}

export interface Execution extends Timestamps, Entity {
  jobId: string;
  workflowId: string;
  status: "pending" | "running" | "completed" | "failed";
  result?: unknown;
}

export interface Mission extends Timestamps, Entity {
  status: "pending" | "running" | "completed" | "failed";
  task: string;
  result?: unknown;
}
