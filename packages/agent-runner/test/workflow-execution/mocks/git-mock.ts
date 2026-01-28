import { ok, type Result } from "@openfarm/result";
import type { StepExecutionRequest } from "../../../src/engines/workflow/types";

/**
 * Mock de operaciones git para tests
 * Registra todas las llamadas para verificación posterior
 */
export class GitMock {
  public calls: {
    checkout: Array<{ branch: string; context: unknown }>;
    branch: Array<{ pattern: string; context: unknown }>;
    commit: Array<{ message: string; context: unknown }>;
    push: Array<{ context: unknown }>;
  } = {
    checkout: [],
    branch: [],
    commit: [],
    push: [],
  };

  /**
   * Mock de executeGitCheckout
   */
  async executeGitCheckout(
    request: StepExecutionRequest
  ): Promise<Result<string>> {
    const { step, context } = request;
    const branch =
      (step.config?.branch as string) || context.defaultBranch || "main";

    this.calls.checkout.push({ branch, context });

    return ok(`Checked out branch: ${branch}`);
  }

  /**
   * Mock de executeGitBranch
   */
  async executeGitBranch(
    request: StepExecutionRequest
  ): Promise<Result<{ message: string; newBranchName: string }>> {
    const { step, context } = request;
    const pattern = (step.config?.pattern as string) || "test-branch";

    // Simular creación de nombre de branch basado en el pattern
    // En un caso real, esto se resolvería con expresiones
    const newBranchName = pattern.includes("${")
      ? pattern.replace(/\$\{[^}]+\}/g, "resolved")
      : pattern;

    this.calls.branch.push({ pattern, context });

    return ok({
      message: `Created branch: ${newBranchName}`,
      newBranchName,
    });
  }

  /**
   * Mock de executeGitCommit
   */
  async executeGitCommit(
    request: StepExecutionRequest
  ): Promise<Result<string>> {
    const { step, context } = request;
    const message = (step.config?.message as string) || "Test commit";

    this.calls.commit.push({ message, context });

    return ok(`Committed changes: ${message}`);
  }

  /**
   * Mock de executeGitPush
   */
  async executeGitPush(request: StepExecutionRequest): Promise<Result<string>> {
    const { context } = request;

    this.calls.push.push({ context });

    return ok("Pushed changes to remote");
  }

  /**
   * Resetea todas las llamadas registradas
   */
  reset(): void {
    this.calls = {
      checkout: [],
      branch: [],
      commit: [],
      push: [],
    };
  }
}
