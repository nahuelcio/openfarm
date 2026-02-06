import { describe, expect, it } from "vitest";
import { createSpecPlan } from "../src/core/create-spec-plan";

describe("createSpecPlan", () => {
  it("rejects unsupported providers before generating artifacts", async () => {
    await expect(
      createSpecPlan({
        cwd: process.cwd(),
        name: "demo",
        description: "demo",
        provider: "external-agent",
      })
    ).rejects.toThrow("Unsupported spec planning provider: external-agent");
  });
});
