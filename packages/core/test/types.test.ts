import { StepType } from "../src/constants";
import type {
  AgentConfiguration,
  Integration,
  WorkflowStep,
} from "../src/types";

describe("Core Types", () => {
  it("should allow defining an Integration object", () => {
    const integration: Integration = {
      id: "test-id",
      name: "Test Azure",
      type: "azure",
      credentials: "token",
      createdAt: new Date().toISOString(),
    };
    expect(integration.id).toBe("test-id");
  });

  it("should allow defining a WorkflowStep object", () => {
    const step: WorkflowStep = {
      id: "step-1",
      type: StepType.GIT,
      action: "git.checkout",
      config: { branch: "main" },
    };
    expect(step.id).toBe("step-1");
  });

  it("should allow defining an AgentConfiguration with opencode provider", () => {
    const config: AgentConfiguration = {
      id: "test-config",
      model: "gpt-4",
      enabled: true,
      provider: "opencode",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    expect(config.provider).toBe("opencode");
  });
});
