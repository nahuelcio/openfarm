import type { Plan, Annotation } from './types';

export class SimplePlanReview {
  private container: HTMLElement;
  private plan: Plan;
  private annotations: Annotation[];
  private onApprove: () => void;
  private onReject: (feedback: string) => void;

  constructor(
    container: HTMLElement,
    plan: Plan,
    annotations: Annotation[] = [],
    options: {
      onApprove?: () => void;
      onReject?: (feedback: string) => void;
    } = {}
  ) {
    this.container = container;
    this.plan = plan;
    this.annotations = annotations;
    this.onApprove = options.onApprove || (() => {});
    this.onReject = options.onReject || (() => {});
    
    this.render();
  }

  private render(): void {
    this.container.innerHTML = `
      <div style="
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        max-width: 800px;
        margin: 0 auto;
        padding: 20px;
        background: white;
        border-radius: 8px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      ">
        <div style="
          border-bottom: 1px solid #e0e0e0;
          padding-bottom: 20px;
          margin-bottom: 20px;
        ">
          <h1 style="margin: 0; color: #333; font-size: 24px;">${this.plan.title}</h1>
          <p style="margin: 10px 0; color: #666;">${this.plan.description}</p>
          <span style="
            background: #fff3cd;
            color: #856404;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 600;
          ">${this.plan.status}</span>
        </div>

        <div style="margin-bottom: 20px;">
          <h2 style="margin: 0 0 15px 0; color: #333;">📋 Pasos del Plan</h2>
          ${this.plan.steps.map((step, index) => `
            <div style="
              margin-bottom: 15px;
              padding: 15px;
              border: 1px solid #e0e0e0;
              border-radius: 6px;
              background: #fafafa;
            ">
              <div style="font-weight: 600; margin-bottom: 8px; color: #333;">
                ${index + 1}. ${step.title}
              </div>
              <div style="color: #666; font-size: 14px; margin-bottom: 8px;">
                ${step.description}
              </div>
              ${step.dependencies ? `
                <div style="font-size: 12px; color: #999;">
                  <strong>Dependencias:</strong> ${step.dependencies.join(', ')}
                </div>
              ` : ''}
            </div>
          `).join('')}
        </div>

        ${this.annotations.length > 0 ? `
          <div style="margin-bottom: 20px;">
            <h2 style="margin: 0 0 15px 0; color: #333;">💬 Anotaciones</h2>
            ${this.annotations.map(ann => `
              <div style="
                margin-bottom: 10px;
                padding: 10px;
                border-left: 4px solid #007bff;
                background: #f8f9ff;
                border-radius: 4px;
              ">
                <div style="font-size: 11px; text-transform: uppercase; font-weight: 600; margin-bottom: 4px; color: #007bff;">
                  ${ann.type}
                </div>
                <div style="font-size: 14px; color: #333;">
                  ${ann.content}
                </div>
                <div style="font-size: 11px; color: #999; margin-top: 4px;">
                  ${ann.author} • ${new Date(ann.createdAt).toLocaleString()}
                </div>
              </div>
            `).join('')}
          </div>
        ` : ''}

        <div style="
          display: flex;
          gap: 10px;
          padding-top: 20px;
          border-top: 1px solid #e0e0e0;
        ">
          <button id="approve-btn" style="
            background: #28a745;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 4px;
            cursor: pointer;
            font-weight: 600;
          ">✅ Aprobar Plan</button>
          
          <button id="reject-btn" style="
            background: #dc3545;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 4px;
            cursor: pointer;
            font-weight: 600;
          ">❌ Rechazar Plan</button>
          
          <button id="export-btn" style="
            background: #6c757d;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 4px;
            cursor: pointer;
            font-weight: 600;
          ">📤 Exportar</button>
        </div>
      </div>
    `;

    this.attachEventListeners();
  }

  private attachEventListeners(): void {
    const approveBtn = this.container.querySelector('#approve-btn') as HTMLButtonElement;
    const rejectBtn = this.container.querySelector('#reject-btn') as HTMLButtonElement;
    const exportBtn = this.container.querySelector('#export-btn') as HTMLButtonElement;

    approveBtn?.addEventListener('click', () => {
      if (confirm('✅ ¿Aprobar este plan? El agente podrá continuar con la implementación.')) {
        this.onApprove();
        this.showNotification('✅ Plan aprobado!', 'success');
      }
    });

    rejectBtn?.addEventListener('click', () => {
      const feedback = prompt('❌ Razón del rechazo:');
      if (feedback) {
        this.onReject(feedback);
        this.showNotification('❌ Plan rechazado. Feedback enviado al agente.', 'error');
      }
    });

    exportBtn?.addEventListener('click', () => {
      this.exportPlan();
    });
  }

  private showNotification(message: string, type: 'success' | 'error'): void {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === 'success' ? '#28a745' : '#dc3545'};
      color: white;
      padding: 15px 20px;
      border-radius: 4px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.2);
      z-index: 1000;
      font-weight: 600;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.remove();
    }, 3000);
  }

  private exportPlan(): void {
    const data = {
      plan: this.plan,
      annotations: this.annotations,
      exportedAt: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `plan-${this.plan.id}.json`;
    a.click();
    URL.revokeObjectURL(url);

    this.showNotification('📤 Plan exportado!', 'success');
  }

  updatePlan(plan: Plan): void {
    this.plan = plan;
    this.render();
  }

  updateAnnotations(annotations: Annotation[]): void {
    this.annotations = annotations;
    this.render();
  }
}
