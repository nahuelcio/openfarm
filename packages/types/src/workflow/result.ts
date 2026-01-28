// Workflow result
export interface WorkflowResult {
  success: boolean;
  output: Record<string, unknown>;
  artifacts: Record<string, unknown>;
  duration: number;
  stepsExecuted: number;
  stepsFailed: number;
  error?: string;
}
