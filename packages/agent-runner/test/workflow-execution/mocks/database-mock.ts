import type { StepStatus } from "@openfarm/core/constants/status";
import type { WorkflowExecution } from "@openfarm/core/types/workflow";

interface WorkflowStepResult {
  stepId: string;
  status: StepStatus;
  result?: string;
  error?: string;
  startedAt?: string;
  completedAt?: string;
}

/**
 * Mock de base de datos para tests
 * Simula almacenamiento de ejecuciones y resultados de pasos en memoria
 */
export class DatabaseMock {
  private readonly executions: Map<string, WorkflowExecution> = new Map();
  private readonly stepResults: Map<string, WorkflowStepResult[]> = new Map();

  /**
   * Obtiene una ejecución de workflow por ID
   */
  async getWorkflowExecution(
    executionId: string
  ): Promise<WorkflowExecution | undefined> {
    return this.executions.get(executionId);
  }

  /**
   * Guarda o actualiza una ejecución de workflow
   */
  async saveWorkflowExecution(execution: WorkflowExecution): Promise<void> {
    this.executions.set(execution.id, execution);
  }

  /**
   * Actualiza una ejecución de workflow con una función de transformación
   */
  async updateWorkflowExecution(
    executionId: string,
    updater: (execution: WorkflowExecution) => WorkflowExecution
  ): Promise<void> {
    const existing = this.executions.get(executionId);
    if (existing) {
      const updated = updater(existing);
      this.executions.set(executionId, updated);
    } else {
      // Crear nueva ejecución si no existe
      const newExecution = updater({
        id: executionId,
        workflowId: "",
        workItemId: "",
        jobId: "",
        status: "running",
        stepResults: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as WorkflowExecution);
      this.executions.set(executionId, newExecution);
    }
  }

  /**
   * Obtiene los resultados de pasos para una ejecución
   */
  async getStepResults(executionId: string): Promise<WorkflowStepResult[]> {
    const execution = this.executions.get(executionId);
    return execution?.stepResults || [];
  }

  /**
   * Guarda un resultado de paso
   */
  async saveStepResult(
    executionId: string,
    stepResult: WorkflowStepResult
  ): Promise<void> {
    const execution = this.executions.get(executionId);
    if (execution) {
      const existingResults = execution.stepResults || [];
      const updatedResults = [
        ...existingResults.filter((r) => r.stepId !== stepResult.stepId),
        stepResult,
      ];
      await this.updateWorkflowExecution(executionId, (exec) => ({
        ...exec,
        stepResults: updatedResults,
      }));
    }
  }

  /**
   * Obtiene todos los workflows (mock - retorna array vacío)
   */
  async getWorkflows(): Promise<unknown[]> {
    return [];
  }

  /**
   * Resetea toda la base de datos mock
   */
  reset(): void {
    this.executions.clear();
    this.stepResults.clear();
  }

  /**
   * Obtiene todas las ejecuciones guardadas (útil para debugging)
   */
  getAllExecutions(): WorkflowExecution[] {
    return Array.from(this.executions.values());
  }
}
