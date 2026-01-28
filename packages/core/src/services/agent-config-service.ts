import type { OpenCodeAgent, OpenCodeSkill } from "../types/opencode-agents";

type SQL = any;

/**
 * Service to manage OpenCode Agents and Skills configurations
 */
export class AgentConfigService {
  constructor(private readonly db: SQL) {}

  async listAgents(): Promise<OpenCodeAgent[]> {
    return this.getAllAgents();
  }

  async getAllAgents(): Promise<OpenCodeAgent[]> {
    const rows = await this.db`
      SELECT * FROM opencode_agents ORDER BY name ASC
    `;

    return rows.map(this.mapAgent);
  }

  async getAgentById(id: string): Promise<OpenCodeAgent | null> {
    const rows = await this.db`
      SELECT * FROM opencode_agents WHERE id = ${id}
    `;

    if (rows.length === 0) {
      return null;
    }
    return this.mapAgent(rows[0]);
  }

  async createAgent(agent: OpenCodeAgent): Promise<void> {
    const now = new Date().toISOString();

    await this.db`
      INSERT INTO opencode_agents (
        id, name, description, mode, system_instructions, permissions, created_at, updated_at
      ) VALUES (
        ${agent.id}, ${agent.name}, ${agent.description || null}, 
        ${agent.mode}, ${agent.prompt || null}, 
        ${JSON.stringify(agent.tools || {})}, ${now}, ${now}
      )
    `;
  }

  async updateAgent(agent: OpenCodeAgent): Promise<void> {
    const now = new Date().toISOString();
    await this.db`
      UPDATE opencode_agents SET
        name = ${agent.name},
        description = ${agent.description || null},
        mode = ${agent.mode},
        system_instructions = ${agent.prompt || null},
        permissions = ${JSON.stringify(agent.tools || {})},
        updated_at = ${now}
      WHERE id = ${agent.id}
    `;
  }

  async deleteAgent(id: string): Promise<void> {
    await this.db`DELETE FROM opencode_agents WHERE id = ${id}`;
  }

  async getAllSkills(): Promise<OpenCodeSkill[]> {
    const rows = await this.db`
      SELECT * FROM opencode_skills ORDER BY name ASC
    `;

    return rows.map(this.mapSkill);
  }

  async getSkillById(id: string): Promise<OpenCodeSkill | null> {
    const rows = await this.db`
      SELECT * FROM opencode_skills WHERE id = ${id}
    `;

    if (rows.length === 0) {
      return null;
    }
    return this.mapSkill(rows[0]);
  }

  async createSkill(skill: OpenCodeSkill): Promise<void> {
    const now = new Date().toISOString();
    await this.db`
      INSERT INTO opencode_skills (
        id, name, description, instructions, compatibility, created_at, updated_at
      ) VALUES (
        ${skill.id}, ${skill.name}, ${skill.description || null}, ${skill.instructions}, 
        ${JSON.stringify(skill.compatibility)}, ${now}, ${now}
      )
    `;
  }

  async updateSkill(skill: OpenCodeSkill): Promise<void> {
    const now = new Date().toISOString();
    await this.db`
      UPDATE opencode_skills SET
        name = ${skill.name},
        description = ${skill.description || null},
        instructions = ${skill.instructions},
        compatibility = ${JSON.stringify(skill.compatibility)},
        updated_at = ${now}
      WHERE id = ${skill.id}
    `;
  }

  async deleteSkill(id: string): Promise<void> {
    await this.db`DELETE FROM opencode_skills WHERE id = ${id}`;
  }

  private mapAgent(row: {
    id: string;
    name: string;
    description?: string;
    enabled: boolean;
  }): OpenCodeAgent {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      mode: row.mode,
      prompt: row.system_instructions,
      tools:
        typeof row.permissions === "string"
          ? JSON.parse(row.permissions)
          : row.permissions,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    } as OpenCodeAgent;
  }

  private mapSkill(row: {
    id: string;
    name: string;
    description?: string;
    enabled: boolean;
  }): OpenCodeSkill {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      instructions: row.instructions,
      compatibility:
        typeof row.compatibility === "string"
          ? JSON.parse(row.compatibility)
          : row.compatibility,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
