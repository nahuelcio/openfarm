import type { Annotation } from "../types";
import { AnnotationSchema } from "../types";
import { AnnotationStorage } from "./annotation-storage";
import type {
	AnnotationFilter,
	CreateAnnotationRequest,
	UpdateAnnotationRequest,
} from "./annotation-types";

export class AnnotationManager {
	private storage: AnnotationStorage;

	constructor(dbPath?: string) {
		this.storage = new AnnotationStorage(dbPath);
	}

	createAnnotation(request: CreateAnnotationRequest): Annotation {
		const annotation = this.storage.create(request);
		const validated = AnnotationSchema.parse(annotation);
		return validated;
	}

	updateAnnotation(
		id: string,
		request: UpdateAnnotationRequest,
	): Annotation | null {
		const annotation = this.storage.update(id, request);
		return annotation ? AnnotationSchema.parse(annotation) : null;
	}

	getAnnotation(id: string): Annotation | null {
		const annotation = this.storage.findById(id);
		return annotation ? AnnotationSchema.parse(annotation) : null;
	}

	getAnnotations(filter: AnnotationFilter): Annotation[] {
		const annotations = this.storage.findByFilter(filter);
		return annotations.map((annotation) => AnnotationSchema.parse(annotation));
	}

	getAnnotationsForPlan(planId: string): Annotation[] {
		return this.getAnnotations({ planId });
	}

	getAnnotationsForStep(planId: string, stepId: string): Annotation[] {
		return this.getAnnotations({ planId, stepId });
	}

	resolveAnnotation(id: string): Annotation | null {
		return this.updateAnnotation(id, { resolved: true });
	}

	unresolveAnnotation(id: string): Annotation | null {
		return this.updateAnnotation(id, { resolved: false });
	}

	deleteAnnotation(id: string): boolean {
		return this.storage.delete(id);
	}

	deleteAnnotationsForPlan(planId: string): number {
		return this.storage.deleteByPlanId(planId);
	}

	getUnresolvedCount(planId: string): number {
		const annotations = this.getAnnotations({ planId, resolved: false });
		return annotations.length;
	}

	getAnnotationsByType(planId: string): Record<string, Annotation[]> {
		const annotations = this.getAnnotationsForPlan(planId);
		return annotations.reduce(
			(acc, annotation) => {
				if (!acc[annotation.type]) {
					acc[annotation.type] = [];
				}
				acc[annotation.type].push(annotation);
				return acc;
			},
			{} as Record<string, Annotation[]>,
		);
	}

	close(): void {
		this.storage.close();
	}
}
