/**
 * @openfarm/plan-review
 *
 * Interactive plan review and annotation system for OpenFarm agents.
 * Provides visual UI for reviewing, annotating, and approving/rejecting agent plans.
 */

export { PlanReviewer } from './ui/plan-reviewer';
export { PlanDisplay } from './ui/plan-display';
export { AnnotationPanel } from './ui/annotation-panel';
export { AnnotationControls } from './ui/annotation-controls';
export { AnnotationManager } from './annotations/annotation-manager';
export { AnnotationStorage } from './annotations/annotation-storage';

export type {
  Plan,
  PlanStep,
  PlanStatus,
  Annotation,
  AnnotationType,
  PlanReview,
  PlanReviewerProps,
  PlanDisplayProps,
  AnnotationPanelProps,
  AnnotationControlsProps,
  TextSelection,
  AnnotationPosition,
  CreateAnnotationRequest,
  UpdateAnnotationRequest,
  AnnotationFilter,
  AnnotationContext,
} from './types';

export {
  PlanSchema,
  PlanStepSchema,
  AnnotationSchema,
  PlanReviewSchema,
} from './types';
