import type { Annotation, Plan, PlanStep } from "../types";
import type { PlanDisplayProps, TextSelection } from "./types";

export class PlanDisplay {
	private container: HTMLElement;
	private plan: Plan;
	private annotations: Annotation[];
	private onStepSelect: (stepId: string) => void;
	private onTextSelect: (selection: TextSelection) => void;
	private selectedStepId?: string;

	constructor(container: HTMLElement, props: PlanDisplayProps) {
		this.container = container;
		this.plan = props.plan;
		this.annotations = props.annotations;
		this.onStepSelect = props.onStepSelect;
		this.onTextSelect = props.onTextSelect;
		this.selectedStepId = props.selectedStepId;

		this.render();
		this.setupEventListeners();
	}

	updateProps(props: Partial<PlanDisplayProps>): void {
		if (props.plan) this.plan = props.plan;
		if (props.annotations) this.annotations = props.annotations;
		if (props.selectedStepId !== undefined)
			this.selectedStepId = props.selectedStepId;
		if (props.onStepSelect) this.onStepSelect = props.onStepSelect;
		if (props.onTextSelect) this.onTextSelect = props.onTextSelect;

		this.render();
	}

	private render(): void {
		this.container.innerHTML = "";

		const header = this.createHeader();
		const stepsContainer = this.createStepsContainer();

		this.container.appendChild(header);
		this.container.appendChild(stepsContainer);
	}

	private createHeader(): HTMLElement {
		const header = document.createElement("div");
		header.className = "plan-review-header";

		const title = document.createElement("h1");
		title.textContent = this.plan.title;
		title.className = "plan-title";

		const description = document.createElement("p");
		description.textContent = this.plan.description;
		description.className = "plan-description";

		const metadata = document.createElement("div");
		metadata.className = "plan-metadata";
		metadata.innerHTML = `
      <span class="status status-${this.plan.status}">${this.plan.status}</span>
      <span class="step-count">${this.plan.steps.length} steps</span>
      <span class="created-date">Created ${this.plan.createdAt.toLocaleDateString()}</span>
    `;

		header.appendChild(title);
		header.appendChild(description);
		header.appendChild(metadata);

		return header;
	}

	private createStepsContainer(): HTMLElement {
		const container = document.createElement("div");
		container.className = "plan-steps-container";

		this.plan.steps.forEach((step) => {
			const stepElement = this.createStepElement(step);
			container.appendChild(stepElement);
		});

		return container;
	}

	private createStepElement(step: PlanStep): HTMLElement {
		const stepElement = document.createElement("div");
		stepElement.className = `plan-step ${step.status} ${this.selectedStepId === step.id ? "selected" : ""}`;
		stepElement.dataset.stepId = step.id;

		const stepHeader = this.createStepHeader(step);
		const stepContent = this.createStepContent(step);
		const stepAnnotations = this.createStepAnnotations(step);

		stepElement.appendChild(stepHeader);
		stepElement.appendChild(stepContent);
		stepElement.appendChild(stepAnnotations);

		stepElement.addEventListener("click", () => {
			this.onStepSelect(step.id);
		});

		return stepElement;
	}

	private createStepHeader(step: PlanStep): HTMLElement {
		const header = document.createElement("div");
		header.className = "step-header";

		const stepNumber = document.createElement("span");
		stepNumber.className = "step-number";
		stepNumber.textContent = `${step.order}.`;

		const stepTitle = document.createElement("h3");
		stepTitle.className = "step-title";
		stepTitle.textContent = step.title;

		const stepStatus = document.createElement("span");
		stepStatus.className = `step-status status-${step.status}`;
		stepStatus.textContent = step.status;

		header.appendChild(stepNumber);
		header.appendChild(stepTitle);
		header.appendChild(stepStatus);

		return header;
	}

	private createStepContent(step: PlanStep): HTMLElement {
		const content = document.createElement("div");
		content.className = "step-content";

		const description = document.createElement("p");
		description.className = "step-description";
		description.textContent = step.description;

		content.appendChild(description);

		if (step.dependencies && step.dependencies.length > 0) {
			const deps = document.createElement("div");
			deps.className = "step-dependencies";
			deps.innerHTML = `
        <strong>Dependencies:</strong> ${step.dependencies.join(", ")}
      `;
			content.appendChild(deps);
		}

		this.setupTextSelection(content, step.id);

		return content;
	}

	private createStepAnnotations(step: PlanStep): HTMLElement {
		const stepAnnotations = this.annotations.filter(
			(a) => a.stepId === step.id,
		);

		if (stepAnnotations.length === 0) {
			const empty = document.createElement("div");
			empty.className = "step-annotations empty";
			empty.textContent = "No annotations";
			return empty;
		}

		const container = document.createElement("div");
		container.className = "step-annotations";

		stepAnnotations.forEach((annotation) => {
			const annotationElement = this.createAnnotationElement(annotation);
			container.appendChild(annotationElement);
		});

		return container;
	}

	private createAnnotationElement(annotation: Annotation): HTMLElement {
		const element = document.createElement("div");
		element.className = `annotation annotation-${annotation.type} ${annotation.resolved ? "resolved" : ""}`;
		element.dataset.annotationId = annotation.id;

		const header = document.createElement("div");
		header.className = "annotation-header";

		const type = document.createElement("span");
		type.className = `annotation-type type-${annotation.type}`;
		type.textContent = annotation.type;

		const author = document.createElement("span");
		author.className = "annotation-author";
		author.textContent = annotation.author;

		const date = document.createElement("span");
		date.className = "annotation-date";
		date.textContent = annotation.createdAt.toLocaleDateString();

		header.appendChild(type);
		header.appendChild(author);
		header.appendChild(date);

		const content = document.createElement("div");
		content.className = "annotation-content";
		content.textContent = annotation.content;

		element.appendChild(header);
		element.appendChild(content);

		return element;
	}

	private setupTextSelection(element: HTMLElement, stepId: string): void {
		element.addEventListener("mouseup", () => {
			const selection = window.getSelection();
			if (selection?.toString().trim()) {
				const range = selection.getRangeAt(0);
				const text = selection.toString();

				const textSelection: TextSelection = {
					text,
					start: range.startOffset,
					end: range.endOffset,
					line: this.getLineNumber(range.startContainer),
				};

				this.onTextSelect(textSelection);
			}
		});
	}

	private getLineNumber(node: Node): number | undefined {
		let line = 0;
		let current: Node | ParentNode | null = node;

		while (current && current !== this.container) {
			if (current.nodeType === Node.ELEMENT_NODE) {
				const element = current as Element;
				if (element.tagName === "P" || element.tagName === "DIV") {
					line++;
				}
			}
			current = current.parentNode;
		}

		return line > 0 ? line : undefined;
	}

	private setupEventListeners(): void {
		// Additional event listeners for keyboard shortcuts, etc.
		document.addEventListener("keydown", (e) => {
			if (e.key === "Escape") {
				window.getSelection()?.removeAllRanges();
			}
		});
	}

	destroy(): void {
		this.container.innerHTML = "";
	}
}
