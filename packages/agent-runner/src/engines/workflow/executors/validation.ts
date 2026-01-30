import { StepAction } from "@openfarm/core/constants/actions";
import { err, ok, type Result } from "@openfarm/result";
import { z } from "zod";

/**
 * Zod schemas for various workflow step configurations
 */

// Git actions
export const GitCheckoutSchema = z.object({
  branch: z.string().optional(),
});

export type GitCheckoutConfig = z.infer<typeof GitCheckoutSchema>;

export const GitBranchSchema = z.object({
  pattern: z.string().optional(),
});

export type GitBranchConfig = z.infer<typeof GitBranchSchema>;

export const GitCommitSchema = z.object({
  message: z.string().optional(),
});

export type GitCommitConfig = z.infer<typeof GitCommitSchema>;

export const GitPushSchema = z.object({}).optional();

export type GitPushConfig = z.infer<typeof GitPushSchema>;

export const GitWorktreeSchema = z.object({
  operation: z.enum(["create", "remove"]),
  path: z.string().optional(), // Auto-generated if not provided
  branch: z.string().optional(), // Required for create
  baseBranch: z.string().optional(), // Base for new branch
});

export type GitWorktreeConfig = z.infer<typeof GitWorktreeSchema>;

// Agent actions
export const AgentCodeSchema = z.object({
  prompt: z.string().optional(),
  provider: z.enum(["opencode", "direct-llm", "claude-code"]).optional(),
  model: z.string().min(1).optional(), // Model to use for this step (e.g., "opencode/gpt-5-nano", "opencode/grok-code-fast-1", "opencode/code-supernova", "gpt-5-mini")
  maxIterations: z.number().int().positive().optional(),
  previewMode: z.boolean().optional(),
  readOnly: z.boolean().optional(), // Alias for previewMode
  chatOnly: z.boolean().optional(), // If true, ignores diffs and returns only text summary

  // OpenCode specific fields
  agent: z.string().optional(),
  skill: z.string().optional(),
  opencodeTemperature: z.number().optional(),
  opencodeMaxSteps: z.number().optional(),

  // Legacy aliases for backward compatibility
  opencodeAgent: z.string().optional(),
  opencodeSkill: z.string().optional(),
});

export type AgentCodeConfig = z.infer<typeof AgentCodeSchema>;

export const AgentImplementSchema = AgentCodeSchema; // Currently same config

export type AgentImplementConfig = AgentCodeConfig;

export const AgentAuthorSchema = z.object({
  prompt: z.string().optional(),
  systemPrompt: z.string().optional(),
  model: z.string().min(1),
});

export type AgentAuthorConfig = z.infer<typeof AgentAuthorSchema>;

export const AgentRouterSchema = z.object({
  systemPrompt: z.string().optional(),
  model: z.string().min(1), // Model to use for routing analysis (default: "gpt-5-mini")
  prompt: z.string().optional(), // Custom analysis prompt (overrides default)
  strategies: z
    .array(z.enum(["opencode", "direct-llm", "cache", "documentation"]))
    .optional(), // Available strategies to choose from
  defaultStrategy: z
    .enum(["opencode", "direct-llm", "cache", "documentation"])
    .optional(), // Default strategy if analysis fails
  defaultRequiresCode: z.boolean().optional(), // Default requiresCodeAnalysis if analysis fails (default: true)
  defaultCodeScope: z.enum(["full", "summary", "targeted"]).optional(), // Default codeScope (default: "summary")
  rules: z
    .array(
      z.object({
        pattern: z.string(), // Pattern to match in question (regex or keyword)
        requiresCode: z.boolean(), // If pattern matches, set requiresCodeAnalysis
        strategy: z
          .enum(["opencode", "direct-llm", "cache", "documentation"])
          .optional(), // Strategy to use if pattern matches
        codeScope: z.enum(["full", "summary", "targeted"]).optional(), // CodeScope if pattern matches
      })
    )
    .optional(), // Custom routing rules (evaluated before LLM analysis)
  temperature: z.number().min(0).max(2).optional(), // Temperature for LLM (default: 0.7)
});

export type AgentRouterConfig = z.infer<typeof AgentRouterSchema>;

// Platform actions
export const PlatformCreatePrSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  source: z.string().optional(),
  target: z.string().optional(),
});

export type PlatformCreatePrConfig = z.infer<typeof PlatformCreatePrSchema>;

export const PlatformPostCommentSchema = z.object({
  comment: z.string().optional(),
});

export type PlatformPostCommentConfig = z.infer<
  typeof PlatformPostCommentSchema
>;

export const PlatformProvisionPodSchema = z.object({
  image: z.string().optional(),
  cloneDepth: z.number().int().positive().optional(),
  npmCache: z.boolean().optional(),
  namespace: z.string().optional(),
  resources: z
    .object({
      cpu: z.string().optional(),
      memory: z.string().optional(),
    })
    .optional(),
});

export type PlatformProvisionPodConfig = z.infer<
  typeof PlatformProvisionPodSchema
>;

export const PlatformDestroyPodSchema = z.object({}).optional();

export type PlatformDestroyPodConfig = z.infer<typeof PlatformDestroyPodSchema>;

// Command actions
export const CommandExecSchema = z.object({
  cmd: z.string(),
});

export type CommandExecConfig = z.infer<typeof CommandExecSchema>;

// Planning actions
export const PlanningPlanSchema = z.object({
  prompt: z.string().optional(),
  model: z.string().min(1),
});

export type PlanningPlanConfig = z.infer<typeof PlanningPlanSchema>;

// Review actions
export const ReviewCodeSchema = z.object({
  prompt: z.string().optional(), // Rules/prompt for code review (replaces rulesFile)
  filePatterns: z.string().optional(),
  excludePatterns: z.string().optional(),
  model: z.string().min(1), // Model to use (default: "gpt-5-mini")
  strictMode: z.boolean().optional(),
});

export type ReviewCodeConfig = z.infer<typeof ReviewCodeSchema>;

// Mapping of actions to schemas using StepAction enum values
const actionSchemas: Record<string, z.ZodTypeAny> = {
  // Git
  [StepAction.GIT_CHECKOUT]: GitCheckoutSchema,
  [StepAction.GIT_BRANCH]: GitBranchSchema,
  [StepAction.GIT_COMMIT]: GitCommitSchema,
  [StepAction.GIT_PUSH]: GitPushSchema || z.object({}),
  [StepAction.GIT_WORKTREE]: GitWorktreeSchema,

  // Agent
  [StepAction.AGENT_CODE]: AgentCodeSchema,
  [StepAction.AGENT_IMPLEMENT]: AgentImplementSchema,
  [StepAction.AGENT_AUTHOR]: AgentAuthorSchema,
  [StepAction.AGENT_ROUTER]: AgentRouterSchema,

  // Platform
  [StepAction.PLATFORM_CREATE_PR]: PlatformCreatePrSchema,
  [StepAction.PLATFORM_POST_COMMENT]: PlatformPostCommentSchema,
  [StepAction.PLATFORM_PROVISION_POD]: PlatformProvisionPodSchema,
  [StepAction.PLATFORM_DESTROY_POD]: PlatformDestroyPodSchema,

  // Command
  [StepAction.COMMAND_EXEC]: CommandExecSchema,

  // Planning
  [StepAction.PLANNING_PLAN]: PlanningPlanSchema,

  // Review
  [StepAction.REVIEW_CODE]: ReviewCodeSchema,

  // Human (no schema needed, handled separately)
  [StepAction.HUMAN_APPROVAL]: z.object({}),
  [StepAction.HUMAN_INPUT]: z.object({}),
};

/**
 * Type-safe configuration types for each action
 */
export interface ActionConfigMap {
  [StepAction.GIT_CHECKOUT]: GitCheckoutConfig;
  [StepAction.GIT_BRANCH]: GitBranchConfig;
  [StepAction.GIT_COMMIT]: GitCommitConfig;
  [StepAction.GIT_PUSH]: GitPushConfig;
  [StepAction.GIT_WORKTREE]: GitWorktreeConfig;
  [StepAction.AGENT_CODE]: AgentCodeConfig;
  [StepAction.AGENT_IMPLEMENT]: AgentImplementConfig;
  [StepAction.AGENT_AUTHOR]: AgentAuthorConfig;
  [StepAction.AGENT_ROUTER]: AgentRouterConfig;
  [StepAction.PLATFORM_CREATE_PR]: PlatformCreatePrConfig;
  [StepAction.PLATFORM_POST_COMMENT]: PlatformPostCommentConfig;
  [StepAction.PLATFORM_PROVISION_POD]: PlatformProvisionPodConfig;
  [StepAction.PLATFORM_DESTROY_POD]: PlatformDestroyPodConfig;
  [StepAction.COMMAND_EXEC]: CommandExecConfig;
  [StepAction.PLANNING_PLAN]: PlanningPlanConfig;
  [StepAction.REVIEW_CODE]: ReviewCodeConfig;
  [StepAction.HUMAN_APPROVAL]: Record<string, unknown>;
  [StepAction.HUMAN_INPUT]: Record<string, unknown>;
}

/**
 * Validates a step configuration against its action schema
 *
 * @param action - The action (StepAction enum value or string for backward compatibility)
 * @param config - The configuration object to validate
 * @returns Result with validated config or error
 */
export function validateConfig<T = unknown>(
  action: StepAction | string,
  config: unknown
): Result<T> {
  const schema = actionSchemas[action];

  if (!schema) {
    // If no schema defined, skip validation (better for forward compatibility)
    return ok(config as T);
  }

  const result = schema.safeParse(config);

  if (!result.success) {
    const errorMsg = result.error.issues
      .map((e) => `${e.path.join(".")}: ${e.message}`)
      .join(", ");
    return err(
      new Error(`Invalid configuration for action '${action}': ${errorMsg}`)
    );
  }

  return ok(result.data as T);
}
