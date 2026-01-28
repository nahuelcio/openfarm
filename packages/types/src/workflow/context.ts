// Workflow context
export interface WorkflowContext {
  workflowId: string;
  executionId: string;
  input: Record<string, unknown>;
  variables: Record<string, unknown>;
  artifacts: Record<string, unknown>;
  secrets: Record<string, string>;
  state: Record<string, unknown>;
  metadata: {
    startedAt: Date;
    triggeredBy: string;
    triggerType: string;
  };
}
