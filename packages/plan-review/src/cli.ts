#!/usr/bin/env bun

import { PlanManager, PlanReviewWorkflow, PlanParser } from './index';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

interface PlanOpenfarmOptions {
  port?: number;
  auto?: boolean;
  agent?: string;
  output?: string;
}

export class PlanOpenfarmCLI {
  private planManager: PlanManager;
  private workflow: PlanReviewWorkflow;
  private options: PlanOpenfarmOptions;

  constructor(options: PlanOpenfarmOptions = {}) {
    this.options = {
      port: 3001,
      auto: false,
      agent: 'claude-code',
      output: './plan-review.html',
      ...options,
    };

    this.planManager = new PlanManager({
      storagePath: path.join(process.cwd(), '.openfarm', 'plans.db'),
      autoSave: true,
    });

    this.workflow = new PlanReviewWorkflow(this.planManager, {
      autoApprove: this.options.auto,
      requireAllResolved: !this.options.auto,
      maxUnresolvedAnnotations: this.options.auto ? 2 : 0,
    });
  }

  async execute(): Promise<void> {
    console.log('🚀 PlanOpenfarm - Revisión Visual de Planes');
    console.log('=====================================');

    // 1. Extraer plan del output más reciente del agente
    const plan = await this.extractLatestPlan();
    if (!plan) {
      console.log('❌ No se encontró ningún plan en el output reciente');
      console.log('💡 Asegúrate de que el agente haya generado un plan');
      return;
    }

    console.log(`📋 Plan encontrado: ${plan.title}`);
    console.log(`📝 ${plan.steps.length} pasos detectados`);

    // 2. Guardar plan y crear revisión
    const savedPlan = this.planManager.createPlanFromText(
      PlanParser.planToMarkdown(plan),
      this.options.agent
    );

    const reviewResult = await this.workflow.reviewPlan(savedPlan.id, 'auto-reviewer');
    console.log(`🔍 Revisión creada: ${reviewResult.status}`);

    // 3. Generar HTML para revisión visual
    const htmlPath = await this.generateReviewHTML(savedPlan);
    console.log(`🌐 HTML generado: ${htmlPath}`);

    // 4. Abrir en browser automáticamente
    if (this.options.auto) {
      await this.openInBrowser(htmlPath);
      console.log('🚀 Abierto en browser - Listo para revisar!');
    } else {
      console.log(`📂 Abre manualmente: ${htmlPath}`);
      console.log('💡 O usa --auto para abrir automáticamente');
    }

    // 5. Monitorear cambios (si es auto)
    if (this.options.auto) {
      await this.monitorPlanChanges(savedPlan.id);
    }
  }

  private async extractLatestPlan(): Promise<any> {
    // Buscar en archivos comunes de output de agentes
    const outputPaths = [
      './agent-output.txt',
      './claude-output.txt',
      './last-agent-response.md',
      './.openfarm/last-output.txt',
    ];

    for (const outputPath of outputPaths) {
      if (fs.existsSync(outputPath)) {
        const content = fs.readFileSync(outputPath, 'utf-8');
        const plan = PlanParser.extractPlanFromAgentOutput(content);
        if (plan) {
          return plan;
        }
      }
    }

    // Intentar leer del clipboard (macOS)
    if (process.platform === 'darwin') {
      try {
        const { stdout } = await this.execCommand('pbpaste');
        const plan = PlanParser.extractPlanFromAgentOutput(stdout);
        if (plan) {
          return plan;
        }
      } catch {
        // Clipboard no disponible
      }
    }

    return null;
  }

  private async generateReviewHTML(plan: any): Promise<string> {
    const annotations = this.planManager.getAnnotationManager().getAnnotationsForPlan(plan.id);
    
    const html = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Plan Review - ${plan.title}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { padding: 20px; border-bottom: 1px solid #e0e0e0; }
        .title { margin: 0; color: #333; }
        .status { padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; }
        .status-pending { background: #fff3cd; color: #856404; }
        .status-approved { background: #d4edda; color: #155724; }
        .status-rejected { background: #f8d7da; color: #721c24; }
        .content { display: flex; height: 70vh; }
        .plan-section { flex: 1; padding: 20px; overflow-y: auto; }
        .annotation-section { width: 400px; border-left: 1px solid #e0e0e0; padding: 20px; overflow-y: auto; }
        .step { margin-bottom: 20px; padding: 15px; border: 1px solid #e0e0e0; border-radius: 6px; cursor: pointer; }
        .step:hover { border-color: #007bff; }
        .step.selected { border-color: #007bff; background: #f8f9ff; }
        .step-title { font-weight: 600; margin-bottom: 8px; }
        .step-description { color: #666; margin-bottom: 8px; }
        .annotation { margin-bottom: 10px; padding: 10px; border-radius: 4px; border-left: 4px solid #007bff; }
        .annotation.comment { border-left-color: #17a2b8; }
        .annotation.delete { border-left-color: #dc3545; }
        .annotation.insert { border-left-color: #28a745; }
        .annotation.replace { border-left-color: #ffc107; }
        .annotation-type { font-size: 11px; text-transform: uppercase; font-weight: 600; margin-bottom: 4px; }
        .annotation-content { font-size: 14px; }
        .actions { padding: 20px; border-top: 1px solid #e0e0e0; display: flex; gap: 10px; }
        .btn { padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer; font-weight: 600; }
        .btn-approve { background: #28a745; color: white; }
        .btn-reject { background: #dc3545; color: white; }
        .btn-export { background: #6c757d; color: white; }
        .btn:hover { opacity: 0.9; }
        .selection-toolbar { position: fixed; background: #333; color: white; padding: 8px; border-radius: 4px; display: none; z-index: 1000; }
        .selection-toolbar button { margin: 0 4px; padding: 4px 8px; background: #007bff; color: white; border: none; border-radius: 2px; cursor: pointer; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 class="title">${plan.title}</h1>
            <span class="status status-${plan.status}">${plan.status}</span>
        </div>
        
        <div class="content">
            <div class="plan-section" id="plan-section">
                ${plan.steps.map((step: any, index: number) => `
                    <div class="step" data-step-id="${step.id}">
                        <div class="step-title">${index + 1}. ${step.title}</div>
                        <div class="step-description">${step.description}</div>
                        ${step.dependencies ? `<div><strong>Dependencias:</strong> ${step.dependencies.join(', ')}</div>` : ''}
                    </div>
                `).join('')}
            </div>
            
            <div class="annotation-section">
                <h3>Anotaciones (${annotations.length})</h3>
                <div id="annotations">
                    ${annotations.map((ann: any) => `
                        <div class="annotation ${ann.type}">
                            <div class="annotation-type">${ann.type}</div>
                            <div class="annotation-content">${ann.content}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
        
        <div class="actions">
            <button class="btn btn-approve" onclick="approvePlan()">✅ Aprobar Plan</button>
            <button class="btn btn-reject" onclick="rejectPlan()">❌ Rechazar Plan</button>
            <button class="btn btn-export" onclick="exportPlan()">📤 Exportar</button>
        </div>
    </div>
    
    <div class="selection-toolbar" id="selection-toolbar">
        <button onclick="addComment()">💬 Comentario</button>
        <button onclick="addDelete()">❌ Eliminar</button>
        <button onclick="addInsert()">➕ Insertar</button>
        <button onclick="addReplace()">🔄 Reemplazar</button>
    </div>

    <script>
        let selectedText = '';
        let selectedStepId = null;
        
        // Selección de texto
        document.addEventListener('mouseup', function(e) {
            const selection = window.getSelection();
            const text = selection.toString().trim();
            
            if (text) {
                selectedText = text;
                const step = e.target.closest('.step');
                selectedStepId = step ? step.dataset.stepId : null;
                
                showSelectionToolbar(e.pageX, e.pageY);
            } else {
                hideSelectionToolbar();
            }
        });
        
        function showSelectionToolbar(x, y) {
            const toolbar = document.getElementById('selection-toolbar');
            toolbar.style.display = 'block';
            toolbar.style.left = x + 'px';
            toolbar.style.top = y + 'px';
        }
        
        function hideSelectionToolbar() {
            document.getElementById('selection-toolbar').style.display = 'none';
        }
        
        // Selección de steps
        document.querySelectorAll('.step').forEach(step => {
            step.addEventListener('click', function() {
                document.querySelectorAll('.step').forEach(s => s.classList.remove('selected'));
                this.classList.add('selected');
                selectedStepId = this.dataset.stepId;
            });
        });
        
        function addComment() {
            const comment = prompt('💬 Agregar comentario:');
            if (comment) {
                addAnnotation('comment', comment);
            }
            hideSelectionToolbar();
        }
        
        function addDelete() {
            addAnnotation('delete', \`Eliminar: "\${selectedText}"\`);
            hideSelectionToolbar();
        }
        
        function addInsert() {
            const insert = prompt('➕ Insertar antes:');
            if (insert) {
                addAnnotation('insert', insert);
            }
            hideSelectionToolbar();
        }
        
        function addReplace() {
            const replace = prompt(\`🔄 Reemplazar "\${selectedText}" con:\`);
            if (replace) {
                addAnnotation('replace', replace);
            }
            hideSelectionToolbar();
        }
        
        function addAnnotation(type, content) {
            const annotationsDiv = document.getElementById('annotations');
            const annotation = document.createElement('div');
            annotation.className = \`annotation \${type}\`;
            annotation.innerHTML = \`
                <div class="annotation-type">\${type}</div>
                <div class="annotation-content">\${content}</div>
            \`;
            annotationsDiv.appendChild(annotation);
            
            // Guardar en localStorage (simulación)
            const annotations = JSON.parse(localStorage.getItem('annotations') || '[]');
            annotations.push({
                type,
                content,
                stepId: selectedStepId,
                timestamp: new Date().toISOString()
            });
            localStorage.setItem('annotations', JSON.stringify(annotations));
        }
        
        function approvePlan() {
            if (confirm('✅ ¿Aprobar este plan? El agente podrá continuar con la implementación.')) {
                localStorage.setItem('planDecision', JSON.stringify({
                    action: 'approve',
                    timestamp: new Date().toISOString()
                }));
                alert('✅ Plan aprobado! El agente puede continuar.');
                window.close();
            }
        }
        
        function rejectPlan() {
            const feedback = prompt('❌ Razón del rechazo:');
            if (feedback) {
                localStorage.setItem('planDecision', JSON.stringify({
                    action: 'reject',
                    feedback,
                    timestamp: new Date().toISOString()
                }));
                alert('❌ Plan rechazado. El agente recibirá el feedback.');
                window.close();
            }
        }
        
        function exportPlan() {
            const planData = {
                plan: ${JSON.stringify(plan)},
                annotations: JSON.parse(localStorage.getItem('annotations') || '[]'),
                decision: JSON.parse(localStorage.getItem('planDecision') || '{}'),
                exportedAt: new Date().toISOString()
            };
            
            const blob = new Blob([JSON.stringify(planData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'plan-review.json';
            a.click();
            URL.revokeObjectURL(url);
        }
        
        // Cargar anotaciones guardadas
        window.addEventListener('load', function() {
            const savedAnnotations = JSON.parse(localStorage.getItem('annotations') || '[]');
            const annotationsDiv = document.getElementById('annotations');
            
            savedAnnotations.forEach((ann: any) => {
                const annotation = document.createElement('div');
                annotation.className = \`annotation \${ann.type}\`;
                annotation.innerHTML = \`
                    <div class="annotation-type">\${ann.type}</div>
                    <div class="annotation-content">\${ann.content}</div>
                \`;
                annotationsDiv.appendChild(annotation);
            });
        });
    </script>
</body>
</html>`;

    const htmlPath = this.options.output || path.join(process.cwd(), 'plan-review.html');
    fs.writeFileSync(htmlPath, html);
    return htmlPath;
  }

  private async openInBrowser(filePath: string): Promise<void> {
    const fullPath = path.resolve(filePath);
    const fileUrl = `file://${fullPath}`;

    try {
      if (process.platform === 'darwin') {
        await this.execCommand(`open "${fileUrl}"`);
      } else if (process.platform === 'win32') {
        await this.execCommand(`start "${fileUrl}"`);
      } else {
        await this.execCommand(`xdg-open "${fileUrl}"`);
      }
    } catch (error) {
      console.log(`❌ No se pudo abrir el browser automáticamente`);
      console.log(`📂 Abre manualmente: ${fileUrl}`);
    }
  }

  private async monitorPlanChanges(planId: string): Promise<void> {
    // Monitorear cambios en el plan (approvals/rejections)
    const checkInterval = setInterval(async () => {
      const plan = this.planManager.getPlan(planId);
      if (!plan) return;

      if (plan.status === 'approved') {
        console.log('✅ Plan aprobado - Continuando con la implementación...');
        clearInterval(checkInterval);
        // Aquí podrías llamar al agente para continuar
      } else if (plan.status === 'rejected') {
        console.log('❌ Plan rechazado - Enviando feedback al agente...');
        clearInterval(checkInterval);
        // Aquí podrías enviar el feedback al agente
      }
    }, 2000);

    // Limpiar después de 5 minutos
    setTimeout(() => clearInterval(checkInterval), 300000);
  }

  private execCommand(command: string): Promise<{ stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
      const [cmd, ...args] = command.split(' ');
      const child = spawn(cmd, args, { shell: true });
      
      let stdout = '';
      let stderr = '';
      
      child.stdout?.on('data', (data) => stdout += data);
      child.stderr?.on('data', (data) => stderr += data);
      
      child.on('close', (code) => {
        if (code === 0) {
          resolve({ stdout, stderr });
        } else {
          reject(new Error(`Command failed with code ${code}: ${stderr}`));
        }
      });
    });
  }
}

// CLI entry point
if (import.meta.main) {
  const args = process.argv.slice(2);
  const options: PlanOpenfarmOptions = {};

  // Parse arguments
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '--auto':
        options.auto = true;
        break;
      case '--port':
        options.port = parseInt(args[++i]);
        break;
      case '--agent':
        options.agent = args[++i];
        break;
      case '--output':
        options.output = args[++i];
        break;
      case '--help':
        console.log(`
🚀 PlanOpenfarm - Revisión Visual de Planes

Uso:
  plan-openfarm [options]

Options:
  --auto          Abrir browser automáticamente
  --port <n>      Puerto para el servidor (default: 3001)
  --agent <name>  Nombre del agente (default: claude-code)
  --output <path> Ruta del HTML generado (default: ./plan-review.html)
  --help          Mostrar esta ayuda

Ejemplos:
  plan-openfarm --auto
  plan-openfarm --agent claude-code --output ./review.html
        `);
        process.exit(0);
    }
  }

  const cli = new PlanOpenfarmCLI(options);
  cli.execute().catch(console.error);
}
