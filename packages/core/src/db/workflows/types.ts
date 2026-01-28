// Internal types for workflow database operations

// Type for database row results
export interface WorkflowRow {
  id: string;
  name: string;
  description: string | null;
  steps: string | null;
  variables: string | null;
  parameters: string | null;
  extends: string | null;
  abstract: number | null;
  reusable: number | null;
  metadata: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkflowExecutionRow {
  id: string;
  workflow_id: string;
  work_item_id: string;
  job_id: string;
  status: string;
  current_step_id: string | null;
  step_results: string | null;
  plan: string | null;
  waiting_message: string | null;
  worktree_path: string | null;
  branch_name: string | null;
  resume_job_id: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}
