import { v4 as uuidv4 } from 'uuid';
import type { Plan, PlanStatus, PlanReview } from './types';
import { PlanSchema, PlanReviewSchema } from './types';
import { PlanParser } from './plan-parser';
import { AnnotationManager } from './annotations/annotation-manager';

export interface PlanManagerOptions {
  storagePath?: string;
  autoSave?: boolean;
}

export class PlanManager {
  private annotationManager: AnnotationManager;
  private plans: Map<string, Plan> = new Map();
  private reviews: Map<string, PlanReview> = new Map();
  private options: PlanManagerOptions;

  constructor(options: PlanManagerOptions = {}) {
    this.options = { autoSave: true, ...options };
    this.annotationManager = new AnnotationManager(options.storagePath);
  }

  createPlanFromText(text: string, agentId?: string): Plan {
    const plan = PlanParser.parseText(text);
    plan.id = uuidv4();
    plan.agentId = agentId;
    plan.createdAt = new Date();
    plan.updatedAt = new Date();
    
    this.plans.set(plan.id, plan);
    return plan;
  }

  createPlanFromMarkdown(markdown: string, agentId?: string): Plan {
    const plan = PlanParser.parseMarkdown(markdown);
    plan.id = uuidv4();
    plan.agentId = agentId;
    plan.createdAt = new Date();
    plan.updatedAt = new Date();
    
    this.plans.set(plan.id, plan);
    return plan;
  }

  getPlan(id: string): Plan | null {
    return this.plans.get(id) || null;
  }

  getAllPlans(): Plan[] {
    return Array.from(this.plans.values());
  }

  getPlansByAgent(agentId: string): Plan[] {
    return Array.from(this.plans.values()).filter(plan => plan.agentId === agentId);
  }

  getPlansByStatus(status: PlanStatus): Plan[] {
    return Array.from(this.plans.values()).filter(plan => plan.status === status);
  }

  updatePlan(id: string, updates: Partial<Plan>): Plan | null {
    const plan = this.plans.get(id);
    if (!plan) return null;

    const updatedPlan = { ...plan, ...updates, updatedAt: new Date() };
    const validated = PlanSchema.parse(updatedPlan);
    
    this.plans.set(id, validated);
    return validated;
  }

  updatePlanStatus(id: string, status: PlanStatus): Plan | null {
    return this.updatePlan(id, { status });
  }

  deletePlan(id: string): boolean {
    const deleted = this.plans.delete(id);
    if (deleted) {
      this.annotationManager.deleteAnnotationsForPlan(id);
      this.reviews.delete(id);
    }
    return deleted;
  }

  createReview(planId: string, reviewer: string, feedback?: string): PlanReview {
    const plan = this.plans.get(planId);
    if (!plan) {
      throw new Error(`Plan not found: ${planId}`);
    }

    const review: PlanReview = {
      id: uuidv4(),
      planId,
      reviewer,
      status: 'in-review',
      annotations: this.annotationManager.getAnnotationsForPlan(planId),
      feedback,
      reviewedAt: new Date(),
    };

    const validated = PlanReviewSchema.parse(review);
    this.reviews.set(planId, validated);
    
    // Update plan status
    this.updatePlanStatus(planId, 'in-review');
    
    return validated;
  }

  getReview(planId: string): PlanReview | null {
    return this.reviews.get(planId) || null;
  }

  getAllReviews(): PlanReview[] {
    return Array.from(this.reviews.values());
  }

  approvePlan(planId: string, reviewer: string): Plan | null {
    const review = this.reviews.get(planId);
    if (!review) {
      throw new Error(`No review found for plan: ${planId}`);
    }

    review.status = 'approved';
    review.reviewedAt = new Date();
    
    return this.updatePlanStatus(planId, 'approved');
  }

  rejectPlan(planId: string, reviewer: string, feedback: string): Plan | null {
    const review = this.reviews.get(planId);
    if (!review) {
      throw new Error(`No review found for plan: ${planId}`);
    }

    review.status = 'rejected';
    review.feedback = feedback;
    review.reviewedAt = new Date();
    
    return this.updatePlanStatus(planId, 'rejected');
  }

  getAnnotationManager(): AnnotationManager {
    return this.annotationManager;
  }

  exportPlan(planId: string): string | null {
    const plan = this.plans.get(planId);
    if (!plan) return null;

    const review = this.reviews.get(planId);
    const annotations = this.annotationManager.getAnnotationsForPlan(planId);

    const exportData = {
      plan,
      review,
      annotations,
      exportedAt: new Date().toISOString(),
    };

    return JSON.stringify(exportData, null, 2);
  }

  importPlan(data: string): Plan | null {
    try {
      const importData = JSON.parse(data);
      
      if (importData.plan) {
        const plan = PlanSchema.parse(importData.plan);
        this.plans.set(plan.id, plan);
        
        if (importData.annotations) {
          importData.annotations.forEach((annotation: any) => {
            this.annotationManager.createAnnotation(annotation);
          });
        }
        
        if (importData.review) {
          const review = PlanReviewSchema.parse(importData.review);
          this.reviews.set(review.planId, review);
        }
        
        return plan;
      }
    } catch (error) {
      console.error('Failed to import plan:', error);
    }
    
    return null;
  }

  getPlanStatistics(): {
    total: number;
    byStatus: Record<PlanStatus, number>;
    withReviews: number;
    totalAnnotations: number;
  } {
    const plans = Array.from(this.plans.values());
    const byStatus = plans.reduce((acc, plan) => {
      acc[plan.status] = (acc[plan.status] || 0) + 1;
      return acc;
    }, {} as Record<PlanStatus, number>);

    const totalAnnotations = plans.reduce((total, plan) => {
      return total + this.annotationManager.getAnnotationsForPlan(plan.id).length;
    }, 0);

    return {
      total: plans.length,
      byStatus,
      withReviews: this.reviews.size,
      totalAnnotations,
    };
  }

  searchPlans(query: string): Plan[] {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.plans.values()).filter(plan => 
      plan.title.toLowerCase().includes(lowerQuery) ||
      plan.description.toLowerCase().includes(lowerQuery) ||
      plan.steps.some(step => 
        step.title.toLowerCase().includes(lowerQuery) ||
        step.description.toLowerCase().includes(lowerQuery)
      )
    );
  }

  close(): void {
    this.annotationManager.close();
  }
}
