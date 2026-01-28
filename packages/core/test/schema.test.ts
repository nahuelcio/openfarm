import { describe, expect, it } from "vitest";
import { createSchema } from "../src/db/schema";

describe("Schema", () => {
  it("should create schema with new tables", async () => {
    // Mock DB interface
    const executedSql: string[] = [];
    const mockDb = async (
      strings: TemplateStringsArray,
      ...values: unknown[]
    ) => {
      let sql = strings[0] || "";
      values.forEach((val, i) => {
        sql += val + (strings[i + 1] || "");
      });
      executedSql.push(sql);
      return [];
    };

    (mockDb as any).unsafe = (val: string) => val;

    await createSchema(mockDb as any);

    const agentsTableCreation = executedSql.find((sql) =>
      sql.includes("CREATE TABLE IF NOT EXISTS opencode_agents")
    );
    expect(agentsTableCreation).toBeDefined();
    expect(agentsTableCreation).toContain(
      "mode TEXT NOT NULL CHECK(mode IN ('primary', 'subagent', 'all'))"
    );

    const skillsTableCreation = executedSql.find((sql) =>
      sql.includes("CREATE TABLE IF NOT EXISTS opencode_skills")
    );
    expect(skillsTableCreation).toBeDefined();
    expect(skillsTableCreation).toContain("compatibility TEXT");
  });
});
