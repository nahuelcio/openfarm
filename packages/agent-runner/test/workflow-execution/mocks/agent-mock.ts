import { ok, type Result } from "@openfarm/result";
import type { StepExecutionRequest } from "../../../src/engines/workflow/types";

/**
 * Mock de agentes de código para tests
 * Simula ejecución de agentes sin llamadas reales a LLMs
 */
export class AgentMock {
  public calls: {
    code: Array<{
      prompt: string;
      provider?: string;
      model?: string;
      context: unknown;
    }>;
  } = {
    code: [],
  };

  /**
   * Configuración de respuestas personalizadas
   */
  private readonly responses: Map<string, string> = new Map();

  /**
   * Mock de executeAgentCode
   */
  async executeAgentCode(
    request: StepExecutionRequest
  ): Promise<Result<string>> {
    const { step, context } = request;
    const stepConfig = "config" in step ? step.config : undefined;
    const config = stepConfig || {};

    const stepPrompt = "prompt" in step ? step.prompt : undefined;
    const prompt = stepPrompt || "";
    const provider = (config.provider as string) || "opencode";
    const model = (config.model as string) || undefined;

    this.calls.code.push({
      prompt,
      provider,
      model,
      context,
    });

    // Si hay una respuesta personalizada configurada, usarla
    const customResponse = this.responses.get(step.id);
    if (customResponse) {
      return ok(customResponse);
    }

    // Respuesta por defecto
    const defaultResponse = `Agent executed successfully with provider: ${provider}${model ? `, model: ${model}` : ""}`;

    return ok(defaultResponse);
  }

  /**
   * Configura una respuesta personalizada para un step específico
   */
  setResponse(stepId: string, response: string): void {
    this.responses.set(stepId, response);
  }

  /**
   * Limpia todas las respuestas personalizadas
   */
  clearResponses(): void {
    this.responses.clear();
  }

  /**
   * Resetea todas las llamadas registradas
   */
  reset(): void {
    this.calls = {
      code: [],
    };
    this.clearResponses();
  }
}
