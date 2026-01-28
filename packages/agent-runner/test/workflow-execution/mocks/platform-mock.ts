import { ok, type Result } from "@openfarm/result";
import type { StepExecutionRequest } from "../../../src/engines/workflow/types";

/**
 * Mock de operaciones de plataforma para tests
 * Simula creación de PRs sin llamadas reales a APIs
 */
export class PlatformMock {
  public calls: {
    createPR: Array<{
      title: string;
      description: string;
      target: string;
      source: string;
      context: unknown;
    }>;
  } = {
    createPR: [],
  };

  /**
   * Mock de executePlatformCreatePr
   */
  async executePlatformCreatePr(
    request: StepExecutionRequest
  ): Promise<Result<string>> {
    const { step, context } = request;
    const config = step.config || {};

    const title = (config.title as string) || `fix: ${context.workItem.title}`;
    const description =
      (config.description as string) || context.workItem.description || "";
    const target = (config.target as string) || context.defaultBranch || "main";
    const source =
      (config.source as string) || context.branchName || "test-branch";

    this.calls.createPR.push({
      title,
      description,
      target,
      source,
      context,
    });

    // Simular URL de PR
    const prUrl = "https://github.com/test/repo/pull/123";

    return ok(prUrl);
  }

  /**
   * Resetea todas las llamadas registradas
   */
  reset(): void {
    this.calls = {
      createPR: [],
    };
  }
}
