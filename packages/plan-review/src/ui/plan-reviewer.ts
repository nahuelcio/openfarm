import type { Annotation, AnnotationType, Plan } from "../types";
import { AnnotationControls } from "./annotation-controls";
import { AnnotationPanel } from "./annotation-panel";
import { PlanDisplay } from "./plan-display";
import type { PlanReviewerProps, TextSelection } from "./types";

export class PlanReviewer {
	private container: HTMLElement;
	private plan: Plan;
	private annotations: Annotation[];
	private onAnnotationCreate: (annotation: Partial<Annotation>) => void;
	private onAnnotationUpdate: (
		id: string,
		updates: Partial<Annotation>,
	) => void;
	private onAnnotationDelete: (id: string) => void;
	private onPlanApprove: () => void;
	private onPlanReject: (feedback: string) => void;
	private readonly: boolean;

	private planDisplay?: PlanDisplay;
	private annotationPanel?: AnnotationPanel;
	private annotationControls?: AnnotationControls;
	private selectedStepId?: string;

	constructor(container: HTMLElement, props: PlanReviewerProps) {
		this.container = container;
		this.plan = props.plan;
		this.annotations = props.annotations;
		this.onAnnotationCreate = props.onAnnotationCreate;
		this.onAnnotationUpdate = props.onAnnotationUpdate;
		this.onAnnotationDelete = props.onAnnotationDelete;
		this.onPlanApprove = props.onPlanApprove;
		this.onPlanReject = props.onPlanReject;
		this.readonly = props.readonly || false;

		this.render();
	}

	updatePlan(plan: Plan): void {
		this.plan = plan;
		this.planDisplay?.updateProps({ plan, annotations: this.annotations });
	}

	updateAnnotations(annotations: Annotation[]): void {
		this.annotations = annotations;
		this.planDisplay?.updateProps({ plan: this.plan, annotations });
		this.annotationPanel?.updateProps({ annotations });
	}

	private render(): void {
		this.container.innerHTML = "";
		this.container.className = "plan-reviewer";

		this.setupLayout();
		this.createComponents();
		this.setupActionButtons();
	}

	private setupLayout(): void {
		// Create main layout structure
		const layout = document.createElement("div");
		layout.className = "plan-reviewer-layout";

		const header = this.createHeader();
		const mainContent = document.createElement("div");
		mainContent.className = "main-content";

		const planContainer = document.createElement("div");
		planContainer.className = "plan-container";

		const sidebar = document.createElement("div");
		sidebar.className = "annotation-sidebar";

		mainContent.appendChild(planContainer);
		mainContent.appendChild(sidebar);

		layout.appendChild(header);
		layout.appendChild(mainContent);

		this.container.appendChild(layout);

		// Store references to containers
		(this.container as any).planContainer = planContainer;
		(this.container as any).sidebarContainer = sidebar;
	}

	private createHeader(): HTMLElement {
		const header = document.createElement("header");
		header.className = "plan-reviewer-header";

		const title = document.createElement("h1");
		title.textContent = "Plan Review";
		title.className = "reviewer-title";

		const planInfo = document.createElement("div");
		planInfo.className = "plan-info";
		planInfo.innerHTML = `
      <span class="plan-name">${this.plan.title}</span>
      <span class="plan-status status-${this.plan.status}">${this.plan.status}</span>
      <span class="annotation-count">${this.annotations.length} annotations</span>
    `;

		header.appendChild(title);
		header.appendChild(planInfo);

		return header;
	}

	private createComponents(): void {
		const planContainer = (this.container as any).planContainer;
		const sidebarContainer = (this.container as any).sidebarContainer;

		// Create plan display
		this.planDisplay = new PlanDisplay(planContainer, {
			plan: this.plan,
			annotations: this.annotations,
			selectedStepId: this.selectedStepId,
			onStepSelect: (stepId: string) => this.handleStepSelect(stepId),
			onTextSelect: (selection: TextSelection) =>
				this.handleTextSelect(selection),
		});

		// Create annotation panel
		this.annotationPanel = new AnnotationPanel(sidebarContainer, {
			annotations: this.annotations,
			selectedStepId: this.selectedStepId,
			onAnnotationSelect: (id: string) => this.handleAnnotationSelect(id),
			onAnnotationCreate: (
				type: AnnotationType,
				content: string,
				position?: any,
			) => this.handleAnnotationCreate(type, content, position),
			onAnnotationUpdate: (id: string, updates: Partial<Annotation>) =>
				this.handleAnnotationUpdate(id, updates),
			onAnnotationDelete: (id: string) => this.handleAnnotationDelete(id),
			onAnnotationResolve: (id: string) => this.handleAnnotationResolve(id),
		});

		// Create annotation controls (hidden by default)
		const controlsContainer = document.createElement("div");
		controlsContainer.className = "annotation-controls-container";
		this.container.appendChild(controlsContainer);

		this.annotationControls = new AnnotationControls(controlsContainer, {
			selectedText: "",
			position: { start: 0, end: 0 },
			onAnnotationCreate: (type: AnnotationType, content: string) =>
				this.handleAnnotationCreate(type, content),
			onCancel: () => this.handleAnnotationControlsCancel(),
		});
	}

	private setupActionButtons(): void {
		if (this.readonly) return;

		const footer = document.createElement("footer");
		footer.className = "plan-reviewer-footer";

		const approveBtn = document.createElement("button");
		approveBtn.className = "action-btn approve-btn";
		approveBtn.textContent = "✓ Approve Plan";
		approveBtn.addEventListener("click", () => this.handleApprove());

		const rejectBtn = document.createElement("button");
		rejectBtn.className = "action-btn reject-btn";
		rejectBtn.textContent = "✗ Reject Plan";
		rejectBtn.addEventListener("click", () => this.handleReject());

		const exportBtn = document.createElement("button");
		exportBtn.className = "action-btn export-btn";
		exportBtn.textContent = "📤 Export";
		exportBtn.addEventListener("click", () => this.handleExport());

		footer.appendChild(approveBtn);
		footer.appendChild(rejectBtn);
		footer.appendChild(exportBtn);

		this.container.appendChild(footer);
	}

	private handleStepSelect(stepId: string): void {
		this.selectedStepId = stepId;
		this.annotationPanel?.updateProps({ selectedStepId: stepId });
	}

	private handleTextSelect(selection: TextSelection): void {
		if (this.readonly || !this.annotationControls) return;

		this.annotationControls.show(selection.text, {
			start: selection.start,
			end: selection.end,
			line: selection.line,
		});
	}

	private handleAnnotationSelect(id: string): void {
		// Highlight annotation in plan display
		const annotation = this.annotations.find((a) => a.id === id);
		if (annotation?.stepId) {
			this.handleStepSelect(annotation.stepId);
		}
	}

	private handleAnnotationCreate(
		type: AnnotationType,
		content: string,
		position?: any,
	): void {
		const annotation: Partial<Annotation> = {
			type,
			planId: this.plan.id,
			stepId: this.selectedStepId,
			content,
			position,
			author: "Reviewer", // In real implementation, get from auth context
			createdAt: new Date(),
			resolved: false,
		};

		this.onAnnotationCreate(annotation);
	}

	private handleAnnotationUpdate(
		id: string,
		updates: Partial<Annotation>,
	): void {
		this.onAnnotationUpdate(id, updates);
	}

	private handleAnnotationDelete(id: string): void {
		this.onAnnotationDelete(id);
	}

	private handleAnnotationResolve(id: string): void {
		const annotation = this.annotations.find((a) => a.id === id);
		if (annotation) {
			this.onAnnotationUpdate(id, { resolved: !annotation.resolved });
		}
	}

	private handleAnnotationControlsCancel(): void {
		this.annotationControls?.hide();
	}

	private handleApprove(): void {
		if (
			confirm("Approve this plan? The agent will proceed with implementation.")
		) {
			this.onPlanApprove();
		}
	}

	private handleReject(): void {
		const feedback = prompt("Reason for rejection (optional):");
		if (feedback !== null) {
			this.onPlanReject(feedback);
		}
	}

	private handleExport(): void {
		const exportData = {
			plan: this.plan,
			annotations: this.annotations,
			exportedAt: new Date().toISOString(),
		};

		const blob = new Blob([JSON.stringify(exportData, null, 2)], {
			type: "application/json",
		});

		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `${this.plan.title.replace(/\s+/g, "-").toLowerCase()}-review.json`;
		a.click();
		URL.revokeObjectURL(url);
	}

	destroy(): void {
		this.planDisplay?.destroy();
		this.annotationPanel?.destroy();
		this.annotationControls?.destroy();
		this.container.innerHTML = "";
	}
}
