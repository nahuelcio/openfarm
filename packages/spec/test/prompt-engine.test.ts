import { beforeEach, describe, expect, it, vi } from "vitest";
import { PromptEngine } from "../src/core/prompt-engine";

describe("prompt engine", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("throws when llm plan generation fails with explicit config", async () => {
    const engine = new PromptEngine({
      provider: "openai",
      model: "gpt-4o-mini",
    });
    const engineWithPrivate = engine as unknown as {
      llmService: { complete: (...args: unknown[]) => Promise<unknown> };
    };
    vi.spyOn(engineWithPrivate.llmService, "complete").mockRejectedValue(
      new Error("boom")
    );

    await expect(
      engine.generatePlanArtifacts({
        name: "test-spec",
        description: "desc",
        context: "ctx",
      })
    ).rejects.toThrow("LLM plan generation failed: boom");
  });

  it("throws when llm task generation fails with explicit config", async () => {
    const engine = new PromptEngine({
      provider: "openai",
      model: "gpt-4o-mini",
    });
    const engineWithPrivate = engine as unknown as {
      llmService: { complete: (...args: unknown[]) => Promise<unknown> };
    };
    vi.spyOn(engineWithPrivate.llmService, "complete").mockRejectedValue(
      new Error("boom")
    );

    await expect(engine.generateTasks("# req", "# design")).rejects.toThrow(
      "LLM task generation failed: boom"
    );
  });

  it("uses hidden code workflow for opencode provider", async () => {
    const engine = new PromptEngine({
      provider: "opencode",
      model: "zai/glm-4.7",
    });
    const engineWithPrivate = engine as unknown as {
      llmService: { complete: (...args: unknown[]) => Promise<unknown> };
      runHiddenSpecWorkflowStep: (
        instruction: string,
        timeoutMs: number
      ) => Promise<string>;
    };
    const llmSpy = vi.spyOn(engineWithPrivate.llmService, "complete");
    const workflowSpy = vi
      .spyOn(engineWithPrivate, "runHiddenSpecWorkflowStep")
      .mockResolvedValue(`# Proposal

ok proposal

# Requirements

ok requirements

# Design

ok design`);

    const result = await engine.generatePlanArtifacts({
      name: "test",
      description: "test",
      context: "ctx",
    });

    expect(workflowSpy).toHaveBeenCalledTimes(1);
    expect(llmSpy).not.toHaveBeenCalled();
    expect(result.proposal).toContain("ok proposal");
    expect(result.requirements).toContain("ok requirements");
    expect(result.design).toContain("ok design");
  });

  it("falls back to llm service when opencode workflow fails", async () => {
    const engine = new PromptEngine({
      provider: "opencode",
      model: "zai/glm-4.7",
    });
    const engineWithPrivate = engine as unknown as {
      llmService: { complete: (...args: unknown[]) => Promise<unknown> };
      runHiddenSpecWorkflowStep: (
        instruction: string,
        timeoutMs: number
      ) => Promise<string>;
    };
    vi.spyOn(engineWithPrivate, "runHiddenSpecWorkflowStep").mockRejectedValue(
      new Error("wf broke")
    );
    vi.spyOn(engineWithPrivate.llmService, "complete").mockResolvedValue({
      text: `# Proposal

llm proposal

# Requirements

llm requirements

# Design

llm design`,
    });

    const result = await engine.generatePlanArtifacts({
      name: "test",
      description: "test",
      context: "ctx",
    });

    expect(result.proposal).toContain("llm proposal");
    expect(result.requirements).toContain("llm requirements");
    expect(result.design).toContain("llm design");
  });
});
