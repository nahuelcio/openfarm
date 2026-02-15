import type { Annotation, AnnotationType, Plan, PlanStep } from "../types";

export interface PlanReviewerProps {
	plan: Plan;
	annotations: Annotation[];
	onAnnotationCreate: (annotation: Partial<Annotation>) => void;
	onAnnotationUpdate: (id: string, updates: Partial<Annotation>) => void;
	onAnnotationDelete: (id: string) => void;
	onPlanApprove: () => void;
	onPlanReject: (feedback: string) => void;
	readonly?: boolean;
}

export interface PlanDisplayProps {
	plan: Plan;
	annotations: Annotation[];
	selectedStepId?: string;
	onStepSelect: (stepId: string) => void;
	onTextSelect: (selection: TextSelection) => void;
}

export interface AnnotationPanelProps {
	annotations: Annotation[];
	selectedStepId?: string;
	onAnnotationSelect: (annotationId: string) => void;
	onAnnotationCreate: (
		type: AnnotationType,
		content: string,
		position?: AnnotationPosition,
	) => void;
	onAnnotationUpdate: (id: string, updates: Partial<Annotation>) => void;
	onAnnotationDelete: (id: string) => void;
	onAnnotationResolve: (id: string) => void;
}

export interface AnnotationControlsProps {
	selectedText: string;
	position: AnnotationPosition;
	onAnnotationCreate: (type: AnnotationType, content: string) => void;
	onCancel: () => void;
}

export interface TextSelection {
	text: string;
	start: number;
	end: number;
	line?: number;
}

export interface AnnotationPosition {
	start: number;
	end: number;
	line?: number;
}

export interface StepRendererProps {
	step: PlanStep;
	annotations: Annotation[];
	isSelected: boolean;
	onSelect: () => void;
	onTextSelect: (selection: TextSelection) => void;
}

export interface AnnotationRendererProps {
	annotation: Annotation;
	isSelected: boolean;
	onSelect: () => void;
	onUpdate: (updates: Partial<Annotation>) => void;
	onDelete: () => void;
	onResolve: () => void;
}
