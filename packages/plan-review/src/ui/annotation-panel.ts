import type { Annotation, AnnotationType } from '../types';
import type { AnnotationPanelProps } from './types';

export class AnnotationPanel {
  private container: HTMLElement;
  private annotations: Annotation[];
  private selectedStepId?: string;
  private onAnnotationSelect: (annotationId: string) => void;
  private onAnnotationCreate: (type: AnnotationType, content: string, position?: any) => void;
  private onAnnotationUpdate: (id: string, updates: Partial<Annotation>) => void;
  private onAnnotationDelete: (id: string) => void;
  private onAnnotationResolve: (id: string) => void;

  constructor(
    container: HTMLElement,
    props: AnnotationPanelProps
  ) {
    this.container = container;
    this.annotations = props.annotations;
    this.selectedStepId = props.selectedStepId;
    this.onAnnotationSelect = props.onAnnotationSelect;
    this.onAnnotationCreate = props.onAnnotationCreate;
    this.onAnnotationUpdate = props.onAnnotationUpdate;
    this.onAnnotationDelete = props.onAnnotationDelete;
    this.onAnnotationResolve = props.onAnnotationResolve;
    
    this.render();
    this.setupEventListeners();
  }

  updateProps(props: Partial<AnnotationPanelProps>): void {
    if (props.annotations) this.annotations = props.annotations;
    if (props.selectedStepId !== undefined) this.selectedStepId = props.selectedStepId;
    if (props.onAnnotationSelect) this.onAnnotationSelect = props.onAnnotationSelect;
    if (props.onAnnotationCreate) this.onAnnotationCreate = props.onAnnotationCreate;
    if (props.onAnnotationUpdate) this.onAnnotationUpdate = props.onAnnotationUpdate;
    if (props.onAnnotationDelete) this.onAnnotationDelete = props.onAnnotationDelete;
    if (props.onAnnotationResolve) this.onAnnotationResolve = props.onAnnotationResolve;
    
    this.render();
  }

  private render(): void {
    this.container.innerHTML = '';
    
    const header = this.createHeader();
    const filters = this.createFilters();
    const annotationsList = this.createAnnotationsList();
    
    this.container.appendChild(header);
    this.container.appendChild(filters);
    this.container.appendChild(annotationsList);
  }

  private createHeader(): HTMLElement {
    const header = document.createElement('div');
    header.className = 'annotation-panel-header';
    
    const title = document.createElement('h2');
    title.textContent = 'Annotations';
    title.className = 'panel-title';
    
    const stats = this.createStats();
    
    header.appendChild(title);
    header.appendChild(stats);
    
    return header;
  }

  private createStats(): HTMLElement {
    const stats = document.createElement('div');
    stats.className = 'annotation-stats';
    
    const total = this.annotations.length;
    const unresolved = this.annotations.filter(a => !a.resolved).length;
    const byType = this.groupAnnotationsByType();
    
    stats.innerHTML = `
      <div class="stat">
        <span class="stat-label">Total:</span>
        <span class="stat-value">${total}</span>
      </div>
      <div class="stat">
        <span class="stat-label">Unresolved:</span>
        <span class="stat-value unresolved">${unresolved}</span>
      </div>
      <div class="stat">
        <span class="stat-label">Comments:</span>
        <span class="stat-value">${byType.comment?.length || 0}</span>
      </div>
      <div class="stat">
        <span class="stat-label">Changes:</span>
        <span class="stat-value">${(byType.delete?.length || 0) + (byType.insert?.length || 0) + (byType.replace?.length || 0)}</span>
      </div>
    `;
    
    return stats;
  }

  private createFilters(): HTMLElement {
    const filters = document.createElement('div');
    filters.className = 'annotation-filters';
    
    const filterButtons = [
      { key: 'all', label: 'All', count: this.annotations.length },
      { key: 'unresolved', label: 'Unresolved', count: this.annotations.filter(a => !a.resolved).length },
      { key: 'comments', label: 'Comments', count: this.groupAnnotationsByType().comment?.length || 0 },
      { key: 'changes', label: 'Changes', count: this.getChangeAnnotations().length },
    ];
    
    filterButtons.forEach(filter => {
      const button = document.createElement('button');
      button.className = 'filter-btn';
      button.dataset.filter = filter.key;
      button.innerHTML = `${filter.label} (${filter.count})`;
      
      button.addEventListener('click', () => {
        this.filterAnnotations(filter.key);
      });
      
      filters.appendChild(button);
    });
    
    return filters;
  }

  private createAnnotationsList(): HTMLElement {
    const list = document.createElement('div');
    list.className = 'annotations-list';
    
    const filteredAnnotations = this.getFilteredAnnotations();
    
    if (filteredAnnotations.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'empty-annotations';
      empty.textContent = 'No annotations found';
      list.appendChild(empty);
      return list;
    }
    
    filteredAnnotations.forEach(annotation => {
      const annotationElement = this.createAnnotationElement(annotation);
      list.appendChild(annotationElement);
    });
    
    return list;
  }

  private createAnnotationElement(annotation: Annotation): HTMLElement {
    const element = document.createElement('div');
    element.className = `annotation-item ${annotation.type} ${annotation.resolved ? 'resolved' : ''}`;
    element.dataset.annotationId = annotation.id;
    
    const header = this.createAnnotationHeader(annotation);
    const content = this.createAnnotationContent(annotation);
    const actions = this.createAnnotationActions(annotation);
    
    element.appendChild(header);
    element.appendChild(content);
    element.appendChild(actions);
    
    element.addEventListener('click', () => {
      this.onAnnotationSelect(annotation.id);
    });
    
    return element;
  }

  private createAnnotationHeader(annotation: Annotation): HTMLElement {
    const header = document.createElement('div');
    header.className = 'annotation-item-header';
    
    const type = document.createElement('span');
    type.className = `annotation-type ${annotation.type}`;
    type.textContent = this.getTypeLabel(annotation.type);
    
    const author = document.createElement('span');
    author.className = 'annotation-author';
    author.textContent = annotation.author;
    
    const date = document.createElement('span');
    date.className = 'annotation-date';
    date.textContent = this.formatDate(annotation.createdAt);
    
    const status = document.createElement('span');
    status.className = `annotation-status ${annotation.resolved ? 'resolved' : 'unresolved'}`;
    status.textContent = annotation.resolved ? '✓ Resolved' : '○ Pending';
    
    header.appendChild(type);
    header.appendChild(author);
    header.appendChild(date);
    header.appendChild(status);
    
    return header;
  }

  private createAnnotationContent(annotation: Annotation): HTMLElement {
    const content = document.createElement('div');
    content.className = 'annotation-item-content';
    
    const text = document.createElement('p');
    text.textContent = annotation.content;
    
    content.appendChild(text);
    
    if (annotation.position) {
      const position = document.createElement('div');
      position.className = 'annotation-position';
      position.innerHTML = `
        <small>Position: Line ${annotation.position.line || 'N/A'}, ${annotation.position.start}-${annotation.position.end}</small>
      `;
      content.appendChild(position);
    }
    
    return content;
  }

  private createAnnotationActions(annotation: Annotation): HTMLElement {
    const actions = document.createElement('div');
    actions.className = 'annotation-item-actions';
    
    if (!annotation.resolved) {
      const resolveBtn = document.createElement('button');
      resolveBtn.className = 'action-btn resolve-btn';
      resolveBtn.textContent = 'Resolve';
      resolveBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.onAnnotationResolve(annotation.id);
      });
      actions.appendChild(resolveBtn);
    } else {
      const unresolveBtn = document.createElement('button');
      unresolveBtn.className = 'action-btn unresolve-btn';
      unresolveBtn.textContent = 'Reopen';
      unresolveBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.onAnnotationResolve(annotation.id);
      });
      actions.appendChild(unresolveBtn);
    }
    
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'action-btn delete-btn';
    deleteBtn.textContent = 'Delete';
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (confirm('Delete this annotation?')) {
        this.onAnnotationDelete(annotation.id);
      }
    });
    actions.appendChild(deleteBtn);
    
    return actions;
  }

  private groupAnnotationsByType(): Record<string, Annotation[]> {
    return this.annotations.reduce((acc, annotation) => {
      if (!acc[annotation.type]) {
        acc[annotation.type] = [];
      }
      acc[annotation.type].push(annotation);
      return acc;
    }, {} as Record<string, Annotation[]>);
  }

  private getChangeAnnotations(): Annotation[] {
    return this.annotations.filter(a => ['delete', 'insert', 'replace'].includes(a.type));
  }

  private getFilteredAnnotations(): Annotation[] {
    // For now, return all annotations. In a real implementation, this would respect active filters
    return this.annotations;
  }

  private filterAnnotations(filter: string): void {
    // Update active filter and re-render
    const buttons = this.container.querySelectorAll('.filter-btn');
    buttons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.filter === filter);
    });
    
    this.render();
  }

  private getTypeLabel(type: AnnotationType): string {
    const labels = {
      comment: '💬 Comment',
      delete: '❌ Delete',
      insert: '➕ Insert',
      replace: '🔄 Replace',
    };
    return labels[type] || type;
  }

  private formatDate(date: Date): string {
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  private setupEventListeners(): void {
    // Additional event listeners for keyboard shortcuts, etc.
  }

  destroy(): void {
    this.container.innerHTML = '';
  }
}
