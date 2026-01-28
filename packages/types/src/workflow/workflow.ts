// Workflow definition
import type { Entity } from "../common";
import type { Step } from "./step";

// Workflow interface
export interface Workflow extends Entity {
  name: string;
  description: string;
  version: string;
  steps: Step[];
  enabled: boolean;
  triggers: WorkflowTrigger[];
  timeout?: number;
  retryPolicy?: RetryPolicy;
}

export type WorkflowTrigger =
  | { type: "webhook"; event: string }
  | { type: "schedule"; cron: string }
  | { type: "manual" }
  | { type: "event"; eventName: string };

export interface RetryPolicy {
  maxRetries: number;
  delayMs: number;
  backoffMultiplier: number;
}
