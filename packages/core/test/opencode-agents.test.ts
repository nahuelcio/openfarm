import { describe, expect, it } from "vitest";
import type {
  AgentMode,
  OpenCodeAgent,
  OpenCodeSkill,
} from "../src/types/opencode-agents";

describe("OpenCode Agents Types", () => {
  it("should allow defining an OpenCode agent", () => {
    const agent: OpenCodeAgent = {
      id: "test-agent",
      name: "Test Agent",
      description: "A test agent",
      mode: "subagent",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    expect(agent.id).toBe("test-agent");
    expect(agent.mode).toBe("subagent");
  });

  it("should allow defining a skill", () => {
    const skill: OpenCodeSkill = {
      id: "test-skill",
      name: "test-skill",
      description: "A test skill",
      instructions: "## Instructions",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    expect(skill.id).toBe("test-skill");
    expect(skill.name).toBe("test-skill");
  });

  it("should support all agent modes", () => {
    const modes: AgentMode[] = ["primary", "subagent", "all"];
    modes.forEach((mode) => {
      const agent: OpenCodeAgent = {
        id: `agent-${mode}`,
        name: `Agent ${mode}`,
        description: `Agent with ${mode} mode`,
        mode,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      expect(agent.mode).toBe(mode);
    });
  });
});
