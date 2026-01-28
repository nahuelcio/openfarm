/**
 * OpenCode Agents and Skills Types
 *
 * Defines structure for custom OpenCode agents and skills that can be used
 * in workflows to provide specialized behavior and reusable patterns.
 * @see https://opencode.ai/docs/agents
 * @see https://opencode.ai/docs/skills
 */

/**
 * Agent mode - determines how agent can be used
 */
export type AgentMode = "primary" | "subagent" | "all";

/**
 * Agent permission types
 */
export type PermissionType = "allow" | "deny" | "ask";

/**
 * Bash command-level permissions
 * Can be a simple permission or an object with pattern-based rules
 */
export type BashPermission =
  | PermissionType
  | {
      /** Wildcard rule for all commands */
      "*"?: PermissionType;
      /** Pattern-based rules (e.g., "git *": "allow", "npm install": "ask") */
      [pattern: string]: PermissionType | undefined;
    };

/**
 * Agent tool permissions
 * Control which tools the agent can access
 */
export interface ToolPermission {
  /** File write operations */
  write?: boolean;
  /** File edit operations (patches) */
  edit?: boolean;
  /** Bash command execution - can be simple permission or object with patterns */
  bash?: boolean | BashPermission;
  /** Web fetch operations */
  webfetch?: PermissionType;
  /** Skill tool - can agent load/use skills? */
  skill?: PermissionType;
  /** MCP server tools - can be wildcarded (e.g., "mymcp_*": false) */
  [key: string]: boolean | BashPermission | PermissionType | undefined;
}

/**
 * Task permissions (which subagents can be invoked via Task tool)
 * Uses glob patterns for flexible matching
 */
export interface TaskPermission {
  /** Wildcard rule for all subagents */
  "*"?: PermissionType;
  /** Pattern-based rules (e.g., "security-*": "allow", "internal-*": "deny") */
  [pattern: string]: PermissionType | undefined;
}

/**
 * Agent permissions (for subagent invocation and tool access)
 */
export interface AgentPermission {
  /** File edit permissions */
  edit?: PermissionType;
  /** Bash command execution permissions */
  bash?: BashPermission;
  /** Web fetch permissions */
  webfetch?: PermissionType;
  /** Task permissions - which subagents can be invoked */
  task?: TaskPermission;
}

/**
 * OpenCode Agent Definition
 * Custom subagents or primary agents with specialized behavior
 */
export interface OpenCodeAgent {
  /** Unique identifier (e.g., "azure-integrator", "security-reviewer") */
  id: string;
  /** Display name for UI (e.g., "Azure DevOps Integrator") */
  name: string;
  /** What this agent does and when to use it */
  description: string;
  /** Agent mode: primary (switch with Tab), subagent (invoke with @), or both */
  mode: AgentMode;
  /** Override model for this agent (optional, defaults to global config) */
  model?: string;
  /** Temperature: 0.0-1.0 (optional, lower = more focused, higher = more creative) */
  temperature?: number;
  /** Maximum number of iterations before forced response (optional) */
  maxSteps?: number;
  /** Custom system prompt for this agent (optional) */
  prompt?: string;
  /** Tool permissions - control which tools agent can access */
  permission?: AgentPermission;
  /** Enabled/disabled tools for this agent */
  tools?: ToolPermission;
  /** Hide from autocomplete menu (subagent only) - internal use only */
  hidden?: boolean;
  /** Task permissions - which subagents this agent can invoke */
  taskPermission?: TaskPermission;
  /** Creation timestamp */
  createdAt: string;
  /** Last update timestamp */
  updatedAt: string;
}

/**
 * Skill frontmatter (parsed from SKILL.md)
 */
export interface SkillFrontmatter {
  /** Skill name (required) */
  name: string;
  /** Skill description (required, 1-1024 characters) */
  description: string;
  /** License (optional) */
  license?: string;
  /** Compatibility (optional) */
  compatibility?: string;
  /** Additional metadata (optional, string-to-string map) */
  metadata?: Record<string, string>;
}

/**
 * OpenCode Skill Definition
 * Reusable instructions and patterns that agents can load on-demand
 */
export interface OpenCodeSkill {
  /** Unique identifier (e.g., "azure-workflow", "tdd-patterns") */
  id: string;
  /** Skill name (kebab-case, must match directory name containing SKILL.md) */
  name: string;
  /** What this skill does and when to use it */
  description: string;
  instructions: string;
  compatibility?: string | Record<string, any>;
  /** Creation timestamp */
  createdAt: string;
  /** Last update timestamp */
  updatedAt: string;
}

/**
 * Workflow step extended configuration
 * Extends base AgentCodeConfig with OpenCode-specific options
 */
export interface AgentCodeConfigExtended {
  /** Base agent code configuration */
  prompt?: string;
  provider?: "opencode" | "direct-llm" | "claude-code";
  model: string;
  maxIterations?: number;
  previewMode?: boolean;
  readOnly?: boolean;
  chatOnly?: boolean;

  // New OpenCode-specific options
  /** OpenCode agent ID to use (e.g., "azure-integrator") */
  agent?: string;
  /** Skill ID to load (e.g., "azure-workflow") */
  skill?: string;
  /** Alias for agent (for backward compatibility) */
  opencodeAgent?: string;
  /** Alias for skill (for backward compatibility) */
  opencodeSkill?: string;
  /** Override agent temperature (0.0-1.0) */
  opencodeTemperature?: number;
  /** Override agent max steps */
  opencodeMaxSteps?: number;
}

/**
 * OpenCode agent file format (for .opencode/agents/*.md)
 */
export interface OpenCodeAgentFile {
  /** Agent description */
  description: string;
  /** Agent mode */
  mode: AgentMode;
  /** Model override */
  model?: string;
  /** Temperature */
  temperature?: number;
  /** Max steps */
  maxSteps?: number;
  /** Custom prompt */
  prompt?: string;
  /** Permissions */
  permission?: AgentPermission;
  /** Tools */
  tools?: ToolPermission;
  /** Hide from autocomplete */
  hidden?: boolean;
  /** Task permissions */
  taskPermission?: TaskPermission;
}

/**
 * OpenCode config with agents and skills
 */
export interface OpenCodeConfigWithAgents {
  /** Model to use */
  model?: string;
  /** Preview mode */
  previewMode?: boolean;
  /** Chat only mode */
  chatOnly?: boolean;
  /** Agent definitions */
  agents?: Record<string, OpenCodeAgentFile>;
  /** Active agent for current step */
  activeAgent?: string;
}

/**
 * Skill loading result
 */
export interface SkillLoadResult {
  /** Whether skill was loaded successfully */
  success: boolean;
  /** Skill content */
  skill?: OpenCodeSkill;
  /** Error message if loading failed */
  error?: string;
}

/**
 * Agent configuration for workflow step resolution
 */
export interface WorkflowAgentConfig {
  /** Agent ID to use */
  agent?: string;
  /** Skill ID to load */
  skill?: string;
  /** Temperature override */
  temperature?: number;
  /** Max steps override */
  maxSteps?: number;
  /** Model override */
  model?: string;
}
