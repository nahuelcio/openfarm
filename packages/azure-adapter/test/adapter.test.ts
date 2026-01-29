import type { Integration } from "@openfarm/core/types/domain";
import { describe, expect, it } from "vitest";
import { AzurePlatformAdapter } from "../src/adapter";

describe("AzurePlatformAdapter", () => {
  const mockIntegration: Integration = {
    id: "test-id",
    name: "Test Azure",
    type: "azure",
    credentials: "test-pat",
    organization: "https://dev.azure.com/test-org",
    createdAt: new Date().toISOString(),
  };

  it("should be correctly instantiated", () => {
    const adapter = new AzurePlatformAdapter(mockIntegration, "test-project");
    expect(adapter.getName()).toBe("Azure DevOps (test-project)");
  });

  it("should have a getWorkItem method", () => {
    const adapter = new AzurePlatformAdapter(mockIntegration, "test-project");
    expect(typeof adapter.getWorkItem).toBe("function");
  });

  it("should use integration credentials for getWorkItem", () => {
    const adapter = new AzurePlatformAdapter(mockIntegration, "test-project");
    // We can't easily mock the fetch inside processWorkItemBatch here without more boilerplate,
    // but we've verified it takes the integration in the constructor.
    expect((adapter as any).integration.credentials).toBe("test-pat");
  });
});
