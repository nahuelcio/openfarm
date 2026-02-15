import type { Annotation, AnnotationType } from '../types';

export interface AnnotationPosition {
  start: number;
  end: number;
  line?: number;
}

export interface CreateAnnotationRequest {
  type: AnnotationType;
  planId: string;
  stepId?: string;
  content: string;
  position?: AnnotationPosition;
  author: string;
}

export interface UpdateAnnotationRequest {
  content?: string;
  resolved?: boolean;
}

export interface AnnotationFilter {
  planId?: string;
  stepId?: string;
  type?: AnnotationType;
  resolved?: boolean;
  author?: string;
}

export interface AnnotationContext {
  planTitle: string;
  stepTitle?: string;
  surroundingText?: string;
}
