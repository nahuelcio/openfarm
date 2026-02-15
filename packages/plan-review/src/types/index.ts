import { z } from 'zod';

export type PlanStatus = 'pending' | 'approved' | 'rejected' | 'in-review';

export type AnnotationType = 'delete' | 'insert' | 'replace' | 'comment';

export interface PlanStep {
  id: string;
  order: number;
  title: string;
  description: string;
  status: 'pending' | 'completed' | 'skipped';
  dependencies?: string[];
}

export interface Plan {
  id: string;
  title: string;
  description: string;
  steps: PlanStep[];
  status: PlanStatus;
  createdAt: Date;
  updatedAt: Date;
  agentId?: string;
  metadata?: Record<string, unknown>;
}

export interface Annotation {
  id: string;
  type: AnnotationType;
  planId: string;
  stepId?: string;
  content: string;
  position?: {
    start: number;
    end: number;
    line?: number;
  };
  author: string;
  createdAt: Date;
  resolved: boolean;
}

export interface PlanReview {
  id: string;
  planId: string;
  reviewer: string;
  status: PlanStatus;
  annotations: Annotation[];
  feedback?: string;
  reviewedAt: Date;
}

export const PlanStepSchema = z.object({
  id: z.string(),
  order: z.number(),
  title: z.string(),
  description: z.string(),
  status: z.enum(['pending', 'completed', 'skipped']),
  dependencies: z.array(z.string()).optional(),
});

export const PlanSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  steps: z.array(PlanStepSchema),
  status: z.enum(['pending', 'approved', 'rejected', 'in-review']),
  createdAt: z.date(),
  updatedAt: z.date(),
  agentId: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const AnnotationSchema = z.object({
  id: z.string(),
  type: z.enum(['delete', 'insert', 'replace', 'comment']),
  planId: z.string(),
  stepId: z.string().optional(),
  content: z.string(),
  position: z.object({
    start: z.number(),
    end: z.number(),
    line: z.number().optional(),
  }).optional(),
  author: z.string(),
  createdAt: z.date(),
  resolved: z.boolean(),
});

export const PlanReviewSchema = z.object({
  id: z.string(),
  planId: z.string(),
  reviewer: z.string(),
  status: z.enum(['pending', 'approved', 'rejected', 'in-review']),
  annotations: z.array(AnnotationSchema),
  feedback: z.string().optional(),
  reviewedAt: z.date(),
});
