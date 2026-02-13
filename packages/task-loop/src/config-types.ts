/**
 * Configuration Types
 *
 * TypeScript interfaces for YAML configuration schema.
 * These types define the structure of the unified task-loop.yaml configuration file.
 */

/**
 * Strategy configuration for task selection
 */
export interface StrategyConfig {
  enabled: boolean;
  description: string;
}

/**
 * Priority-based selection strategy
 */
export interface PriorityStrategy extends StrategyConfig {}

/**
 * FIFO selection strategy
 */
export interface FifoStrategy extends StrategyConfig {}

/**
 * LIFO selection strategy
 */
export interface LifoStrategy extends StrategyConfig {}

/**
 * Random selection strategy
 */
export interface RandomStrategy extends StrategyConfig {}

/**
 * Selection configuration
 */
export interface SelectionConfig {
  strategies: {
    priority: PriorityStrategy;
    fifo: FifoStrategy;
    lifo: LifoStrategy;
    random: RandomStrategy;
  };
  priorityScores: Record<string, number>;
  defaultStrategy: string;
}

/**
 * Prompt template definition
 */
export interface PromptTemplate {
  name: string;
  description: string;
  content: string;
  variables: string[];
}

/**
 * Prompt configuration
 */
export interface PromptConfig {
  defaultTemplate: string;
  templates: Record<string, PromptTemplate>;
}

/**
 * Heuristic completion detection strategy
 */
export interface HeuristicStrategy extends StrategyConfig {
  completionMarkers: string[];
  failureMarkers: string[];
  fatalErrorPatterns: string[];
}

/**
 * Git changes completion detection strategy
 */
export interface GitChangesStrategy extends StrategyConfig {
  minChanges: number;
}

/**
 * LLM judge completion detection strategy
 */
export interface LlmJudgeStrategy extends StrategyConfig {}

/**
 * Completion configuration
 */
export interface CompletionConfig {
  strategies: {
    heuristic: HeuristicStrategy;
    gitChanges: GitChangesStrategy;
    llmJudge: LlmJudgeStrategy;
  };
  defaultStrategy: string;
}

/**
 * Workflow configuration
 */
export interface WorkflowConfig {
  defaultWorkflow: string;
  taskExecutionWorkflow: string;
  gitSetupWorkflow: string;
  workflowOverrides: Record<string, string>;
}

/**
 * Unified task-loop configuration loaded from task-loop.yaml
 */
export interface TaskLoopYamlConfig {
  selection: SelectionConfig;
  prompts: PromptConfig;
  completion: CompletionConfig;
  workflows: WorkflowConfig;
}
