import { describe, expect, it } from "vitest";
import { AgentConfigService } from "../src/services/agent-config-service";
import type {
  OpenCodeAgent,
  OpenCodeSkill,
} from "../src/types/opencode-agents";

describe("AgentConfigService", () => {
  // Mock DB interface
  const createMockDb = () => {
    const executedSql: string[] = [];
    const mockDb = async (
      strings: TemplateStringsArray,
      ...values: unknown[]
    ) => {
      let sql = strings[0] || "";
      values.forEach((val, i) => {
        sql += JSON.stringify(val) + (strings[i + 1] || "");
      });
      executedSql.push(sql);
      return [];
    };
    (mockDb as Record<string, unknown>).executedSql = executedSql;
    return mockDb;
  };

  it("should create an agent", async () => {
    const mockDb = createMockDb();
    const service = new AgentConfigService(mockDb as any);

    const agent: OpenCodeAgent = {
      id: "agent-1",
      name: "Test Agent",
      description: "A test agent",
      mode: "subagent",
      prompt: "Be helpful",
      tools: { bash: true, webfetch: "allow" },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await service.createAgent(agent);

    const sql = (mockDb as any).executedSql[0];
    expect(sql).toContain("INSERT INTO opencode_agents");
    expect(sql).toContain("agent-1");
    expect(sql).toContain("Test Agent");
    expect(sql).toContain("subagent");
    expect(sql).toContain("Be helpful");
  });

  it("should create a skill", async () => {
    const mockDb = createMockDb();
    const service = new AgentConfigService(mockDb as any);

    const skill: OpenCodeSkill = {
      id: "skill-1",
      name: "Test Skill",
      description: "A test skill",
      instructions: "Do TDD",
      compatibility: { supportedAgents: ["agent-1"] },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await service.createSkill(skill);

    const sql = (mockDb as any).executedSql[0];
    expect(sql).toContain("INSERT INTO opencode_skills");
    expect(sql).toContain("skill-1");
    expect(sql).toContain("Test Skill");
    expect(sql).toContain("Do TDD");
  });

  it("should get all agents", async () => {
    const mockDb = createMockDb();
    const service = new AgentConfigService(mockDb as any);

    await service.getAllAgents();

    const sql = (mockDb as any).executedSql[0];
    expect(sql).toContain("SELECT * FROM opencode_agents");
  });

  it("should get all skills", async () => {
    const mockDb = createMockDb();
    const service = new AgentConfigService(mockDb as any);

    await service.getAllSkills();

    const sql = (mockDb as any).executedSql[0];
    expect(sql).toContain("SELECT * FROM opencode_skills");
  });
});
