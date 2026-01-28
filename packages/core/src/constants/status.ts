/**
 * Status of a workflow execution
 */
export enum WorkflowStatus {
  PENDING = "pending",
  RUNNING = "running",
  COMPLETED = "completed",
  FAILED = "failed",
  PAUSED = "paused",
  CANCELLED = "cancelled",
}

/**
 * Status of a single workflow step
 */
export enum StepStatus {
  PENDING = "pending",
  RUNNING = "running",
  COMPLETED = "completed",
  FAILED = "failed",
  SKIPPED = "skipped",
  PAUSED = "paused",
}

/**
 * Status of a workflow plan
 */
export enum WorkflowPlanStatus {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
  MODIFIED = "modified",
}

/**
 * Job status mappings
 */
export enum JobStatus {
  PENDING = "pending",
  RUNNING = "running",
  WAITING_FOR_USER = "waiting_for_user",
  COMPLETED = "completed",
  FAILED = "failed",
  CANCELLED = "cancelled",
}
