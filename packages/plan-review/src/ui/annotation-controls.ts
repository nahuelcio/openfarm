import type { AnnotationType } from "../types";
import type { AnnotationControlsProps, AnnotationPosition } from "./types";

export class AnnotationControls {
	private container: HTMLElement;
	private selectedText: string;
	private position: AnnotationPosition;
	private onAnnotationCreate: (type: AnnotationType, content: string) => void;
	private onCancel: () => void;
	private isVisible: boolean = false;

	constructor(container: HTMLElement, props: AnnotationControlsProps) {
		this.container = container;
		this.selectedText = props.selectedText;
		this.position = props.position;
		this.onAnnotationCreate = props.onAnnotationCreate;
		this.onCancel = props.onCancel;

		this.render();
		this.setupEventListeners();
	}

	show(selectedText: string, position: AnnotationPosition): void {
		this.selectedText = selectedText;
		this.position = position;
		this.isVisible = true;
		this.render();
		this.positionControls();
	}

	hide(): void {
		this.isVisible = false;
		this.render();
	}

	private render(): void {
		if (!this.isVisible) {
			this.container.innerHTML = "";
			return;
		}

		this.container.innerHTML = `
      <div class="annotation-controls">
        <div class="selected-text-preview">
          <strong>Selected:</strong> "${this.selectedText.substring(0, 100)}${this.selectedText.length > 100 ? "..." : ""}"
        </div>
        <div class="annotation-types">
          <button class="annotation-btn comment-btn" data-type="comment" title="Add comment">
            💬 Comment
          </button>
          <button class="annotation-btn delete-btn" data-type="delete" title="Mark for deletion">
            ❌ Delete
          </button>
          <button class="annotation-btn insert-btn" data-type="insert" title="Insert before">
            ➕ Insert
          </button>
          <button class="annotation-btn replace-btn" data-type="replace" title="Replace with">
            🔄 Replace
          </button>
        </div>
        <div class="annotation-actions">
          <button class="cancel-btn" title="Cancel">Cancel</button>
        </div>
      </div>
    `;
	}

	private positionControls(): void {
		if (!this.isVisible) return;

		const controls = this.container.querySelector(
			".annotation-controls",
		) as HTMLElement;
		if (!controls) return;

		// Position near the selected text
		const selection = window.getSelection();
		if (selection && selection.rangeCount > 0) {
			const range = selection.getRangeAt(0);
			const rect = range.getBoundingClientRect();

			controls.style.position = "fixed";
			controls.style.top = `${rect.bottom + window.scrollY + 5}px`;
			controls.style.left = `${rect.left + window.scrollX}px`;
			controls.style.zIndex = "1000";
		}
	}

	private setupEventListeners(): void {
		this.container.addEventListener("click", (e) => {
			const target = e.target as HTMLElement;

			if (target.classList.contains("annotation-btn")) {
				const type = target.dataset.type as AnnotationType;
				this.handleAnnotationType(type);
			} else if (target.classList.contains("cancel-btn")) {
				this.hide();
				this.onCancel();
			}
		});

		// Close on escape key
		document.addEventListener("keydown", (e) => {
			if (e.key === "Escape" && this.isVisible) {
				this.hide();
				this.onCancel();
			}
		});

		// Close when clicking outside
		document.addEventListener("click", (e) => {
			if (this.isVisible && !this.container.contains(e.target as Node)) {
				this.hide();
				this.onCancel();
			}
		});
	}

	private handleAnnotationType(type: AnnotationType): void {
		switch (type) {
			case "comment":
				this.showCommentDialog();
				break;
			case "delete":
				this.onAnnotationCreate("delete", `Delete: "${this.selectedText}"`);
				this.hide();
				break;
			case "insert":
				this.showInsertDialog();
				break;
			case "replace":
				this.showReplaceDialog();
				break;
		}
	}

	private showCommentDialog(): void {
		const content = prompt("Add your comment:");
		if (content) {
			this.onAnnotationCreate("comment", content);
			this.hide();
		}
	}

	private showInsertDialog(): void {
		const content = prompt("Insert before this text:");
		if (content) {
			this.onAnnotationCreate("insert", content);
			this.hide();
		}
	}

	private showReplaceDialog(): void {
		const content = prompt(`Replace "${this.selectedText}" with:`);
		if (content) {
			this.onAnnotationCreate("replace", content);
			this.hide();
		}
	}

	destroy(): void {
		this.container.innerHTML = "";
	}
}
