/**
 * @openfarm/plan-review
 * 
 * Interactive plan review and annotation system for OpenFarm agents.
 * Provides visual UI for reviewing, annotating, and approving/rejecting agent plans.
 */

// Core exports
export { PlanManager } from './plan-manager';
export { PlanParser } from './plan-parser';
export { PlanReviewWorkflow } from './workflow';

// UI exports
export { PlanReviewer } from './ui/plan-reviewer';
export { SimplePlanReview } from './simple-ui';

// Annotation exports
export { AnnotationManager } from './annotations/annotation-manager';
export { AnnotationStorage } from './annotations/annotation-storage';

// Agent integration
export { AgentPlanReviewHook, createPlanReviewHook, integratePlanReviewHook } from './agent-hooks';

// CLI
export { PlanOpenfarmCLI } from './cli';

// Types
export type { Plan, PlanStep, PlanStatus, Annotation, AnnotationType } from './types';
export type { PlanReview } from './types';
export type { 
  AnnotationPosition,
  TextSelection
} from './ui/types';

export type {
  AgentExecuteOptions,
  AgentExecutionResult,
  PlanReviewHookOptions
} from './agent-hooks';

export type {
  WorkflowOptions,
  WorkflowResult
} from './workflow';

// Schemas
export { PlanSchema, PlanStepSchema, AnnotationSchema, PlanReviewSchema } from './types';
