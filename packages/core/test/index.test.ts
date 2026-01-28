import * as core from "../src/index";
import { AgentConfigService } from "../src/services/agent-config-service";

describe("Core Exports", () => {
  it("should export AgentConfigService", () => {
    // This test will fail until we actually export it in src/index.ts
    // We are checking if the export exists on the module object
    expect(core).toHaveProperty("AgentConfigService");
    // Once exported, this check confirms it's the correct class
    if ((core as any).AgentConfigService) {
      expect((core as any).AgentConfigService).toBe(AgentConfigService);
    }
  });
});
