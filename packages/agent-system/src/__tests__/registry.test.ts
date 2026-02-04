import { describe, expect, it } from "vitest";
import { AgentRegistry } from "../core/registry";
import type {
  AgentPlugin,
  AgentPluginFactory,
  AgentPluginMeta,
} from "../core/types";

class MockAgent implements AgentPlugin {
  readonly meta: AgentPluginMeta = {
    id: "mock-agent",
    name: "Mock Agent",
    description: "Mock agent",
    version: "0.0.1",
    defaultCommand: "mock",
    supportsStreaming: false,
    supportsInterrupt: false,
    supportsFileContext: false,
    supportsSubagentTracing: false,
  };

  async initialize(): Promise<void> {}
  async isReady(): Promise<boolean> {
    return true;
  }
  async detect() {
    return { available: true, version: "1.0.0" };
  }
  execute() {
    throw new Error("not implemented");
  }
  interrupt(): boolean {
    return false;
  }
  interruptAll(): void {}
  getCurrentExecution() {
    return undefined;
  }
  validateModel(): string | null {
    return null;
  }
  async dispose(): Promise<void> {}
}

class MockAgentFactory implements AgentPluginFactory {
  create(): AgentPlugin {
    return new MockAgent();
  }
  getMeta(): AgentPluginMeta {
    return new MockAgent().meta;
  }
  canCreate(pluginId: string): boolean {
    return pluginId === "mock-agent";
  }
}

describe("AgentRegistry", () => {
  it("registers and creates agents", () => {
    const registry = new AgentRegistry();
    registry.registerBuiltin(new MockAgentFactory());

    const instance = registry.createInstance("mock-agent");
    expect(instance?.meta.id).toBe("mock-agent");
  });

  it("throws on duplicate registration", () => {
    const registry = new AgentRegistry();
    registry.registerBuiltin(new MockAgentFactory());
    expect(() => registry.registerBuiltin(new MockAgentFactory())).toThrow(
      "Agent plugin 'mock-agent' is already registered"
    );
  });
});
