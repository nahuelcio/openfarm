# Design Document: Task Loop YAML Refactor

## Overview

This refactor transforms the task-loop package from a system with hardcoded workflow logic into a thin orchestrator that delegates to YAML-driven workflows. The current implementation violates separation of concerns by embedding workflow definitions, task selection rules, prompt templates, and completion detection logic directly in TypeScript code.

The refactored architecture will:
- Move all workflow logic to YAML files
- Delegate execution to the existing workflow engine
- Load configuration from YAML files at runtime
- Maintain backward compatibility with the existing API
- Enable extensibility without code changes

## Architecture

### Current Architecture (Problems)

```
┌─────────────────────────────────────────────────────────┐
│                    Orchestrator                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │ Hardcoded    │  │ Hardcoded    │  │ Hardcoded    │ │
│  │ Git Logic    │  │ Selection    │  │ Templates    │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
│  ┌──────────────┐  ┌──────────────┐                   │
│  │ Hardcoded    │  │ Workflow     │                   │
│  │ Completion   │  │ Adapter      │                   │
│  └──────────────┘  └──────────────┘                   │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │  Workflow Engine      │
              │  (Partially Used)     │
              └───────────────────────┘
```

### Target Architecture (Solution)

```
┌─────────────────────────────────────────────────────────┐
│                    Orchestrator                         │
│                  (Thin Coordinator)                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │ Config       │  │ Config       │  │ Config       │ │
│  │ Loader       │  │ Loader       │  │ Loader       │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │  Workflow Engine      │
              │  (Full Delegation)    │
              └───────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                  YAML Configuration                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │ workflows/   │  │ selection.   │  │ prompts.     │ │
│  │ *.yaml       │  │ yaml         │  │ yaml         │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
│  ┌──────────────┐                                      │
│  │ completion.  │                                      │
│  │ yaml         │                                      │
│  └──────────────┘                                      │
└─────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. Configuration Loader

A new component responsible for loading YAML configuration files.

```typescript
interface ConfigLoader {
  loadSelectionConfig(): Promise<SelectionConfig>;
  loadPromptConfig(): Promise<PromptConfig>;
  loadCompletionConfig(): Promise<CompletionConfig>;
  loadWorkflowConfig(): Promise<WorkflowConfig>;
}

interface SelectionConfig {
  strategies: {
    priority: PriorityStrategy;
    fifo: FifoStrategy;
    lifo: LifoStrategy;
    random: RandomStrategy;
  };
  priorityScores: Record<string, number>;
}

interface PromptConfig {
  templates: Record<string, PromptTemplate>;
  defaultTemplate: string;
}

interface PromptTemplate {
  name: string;
  content: string;
  variables: string[];
}

interface CompletionConfig {
  strategies: {
    heuristic: HeuristicStrategy;
    gitChanges: GitChangesStrategy;
    llmJudge: LlmJudgeStrategy;
  };
  completionMarkers: string[];
  failureMarkers: string[];
  fatalErrorPatterns: string[];
}

interface WorkflowConfig {
  defaultWorkflow: string;
  taskExecutionWorkflow: string;
  gitSetupWorkflow: string;
}
```

### 2. Refactored Task Selector

Remove hardcoded priority scores and load from configuration.

```typescript
class TaskSelector {
  constructor(
    private config: TaskSelectorConfig,
    private selectionConfig: SelectionConfig
  ) {}

  select(tasks: TaskLoopTask[]): TaskLoopTask[] {
    // Load strategy from config instead of hardcoding
    const strategy = this.selectionConfig.strategies[this.config.strategy];
    return strategy.select(tasks, this.selectionConfig.priorityScores);
  }
}
```

### 3. Refactored Prompt Builder

Remove hardcoded templates and load from configuration.

```typescript
class PromptBuilder {
  constructor(
    private config: PromptBuilderConfig,
    private promptConfig: PromptConfig
  ) {}

  build(task: TaskLoopTask): string {
    const templateName = this.config.template || this.promptConfig.defaultTemplate;
    const template = this.promptConfig.templates[templateName];
    
    if (!template) {
      throw new Error(`Template not found: ${templateName}`);
    }
    
    return this.substituteVariables(template.content, task);
  }
}
```

### 4. Refactored Completion Detector

Remove hardcoded markers and load from configuration.

```typescript
class CompletionDetector {
  constructor(
    private config: CompletionDetectorConfig,
    private completionConfig: CompletionConfig
  ) {}

  async detect(
    result: TaskExecutionResult,
    task: TaskLoopTask
  ): Promise<CompletionDetectionResult> {
    const strategy = this.completionConfig.strategies[this.config.strategy];
    return strategy.detect(result, task, this.completionConfig);
  }
}
```

### 5. Refactored Workflow Adapter

Remove hardcoded StepExecutor and delegate to workflow engine.

```typescript
// BEFORE: Hardcoded git operations
async function executeGitSetup(options: WorkflowSetupOptions): Promise<WorkflowSetupResult> {
  // Hardcoded StepExecutor with git.branch and git.worktree logic
  const stepExecutor: StepExecutor = {
    execute: async (stepRequest, executionContext) => {
      if (action === "git.branch") { /* hardcoded logic */ }
      if (action === "git.worktree") { /* hardcoded logic */ }
    }
  };
}

// AFTER: Delegate to workflow engine
async function executeGitSetup(options: WorkflowSetupOptions): Promise<WorkflowSetupResult> {
  const workflowId = "oneshot_with_git"; // Use existing workflow
  
  const request: WorkflowExecutionRequest = {
    executionId: generateId(),
    jobId: generateId(),
    workflowId,
    workItemId: options.workItem.id,
    context: buildContext(options),
    agentConfig: buildAgentConfig(options.config),
    previewMode: false,
  };
  
  // Delegate to workflow engine - no hardcoded logic
  const result = await executeWorkflow(request, engineConfig);
  
  return {
    success: result.success,
    branchName: result.context.branchName,
    worktreePath: result.context.worktreePath,
    error: result.error,
  };
}
```

### 6. Refactored Orchestrator

Simplify orchestrator to coordinate rather than implement workflow logic.

```typescript
class TaskLoopOrchestrator {
  private configLoader: ConfigLoader;
  private selector: TaskSelector;
  private promptBuilder: PromptBuilder;
  private completionDetector: CompletionDetector;

  constructor(private config: TaskLoopConfig) {
    this.configLoader = new ConfigLoader();
  }

  async run(options: TaskLoopRunOptions): Promise<TaskLoopSession> {
    // Load all configuration at startup
    const selectionConfig = await this.configLoader.loadSelectionConfig();
    const promptConfig = await this.configLoader.loadPromptConfig();
    const completionConfig = await this.configLoader.loadCompletionConfig();
    const workflowConfig = await this.configLoader.loadWorkflowConfig();

    // Initialize components with loaded config
    this.selector = new TaskSelector(
      { strategy: "priority", respectDependencies: true },
      selectionConfig
    );
    this.promptBuilder = new PromptBuilder({}, promptConfig);
    this.completionDetector = new CompletionDetector(
      { strategy: "heuristic" },
      completionConfig
    );

    // Rest of orchestration logic remains the same
    // ...
  }

  private async executeTask(
    task: TaskLoopTask,
    prompt: string,
    options: TaskLoopRunOptions
  ): Promise<TaskExecutionResult> {
    // Delegate to workflow engine instead of custom execution
    const workflowId = this.config.workflowId || "oneshot_with_git";
    
    const request: WorkflowExecutionRequest = {
      executionId: generateId(),
      jobId: generateId(),
      workflowId,
      workItemId: task.id,
      context: this.buildWorkflowContext(task, prompt),
      agentConfig: this.buildAgentConfig(),
      previewMode: false,
    };

    const result = await executeWorkflow(request, this.buildEngineConfig());
    
    return this.convertWorkflowResult(result, task);
  }
}
```

## Data Models

### Configuration File Schemas

#### selection.yaml

```yaml
# Task selection configuration
strategies:
  priority:
    enabled: true
    description: "Select tasks by priority (critical > high > medium > low)"
  fifo:
    enabled: true
    description: "First in, first out"
  lifo:
    enabled: true
    description: "Last in, first out"
  random:
    enabled: true
    description: "Random selection"

priorityScores:
  critical: 4
  high: 3
  medium: 2
  low: 1

defaultStrategy: "priority"
```

#### prompts.yaml

```yaml
# Prompt template configuration
defaultTemplate: "default"

templates:
  default:
    name: "Default Template"
    description: "Standard prompt with all sections"
    content: |
      {title}

      ## Description
      {description}

      ## Acceptance Criteria
      {acceptanceCriteria}

      ## Instructions
      You are an AI coding assistant working autonomously. Please implement the requirements above.
      Make reasonable assumptions if information is missing. Do not ask clarifying questions.

      {preInstructions}
    variables:
      - title
      - description
      - acceptanceCriteria
      - preInstructions

  simple:
    name: "Simple Template"
    description: "Minimal prompt for quick tasks"
    content: |
      {title}

      {description}

      Acceptance Criteria:
      {acceptanceCriteria}
    variables:
      - title
      - description
      - acceptanceCriteria

  detailed:
    name: "Detailed Template"
    description: "Comprehensive prompt with full context"
    content: |
      # Task: {title}

      ## Overview
      {description}

      ## Success Criteria
      {acceptanceCriteria}

      ## Context
      - Type: {workItemType}
      - ID: {id}
      - Project: {project}
      - Priority: {priority}

      ## Additional Instructions
      {preInstructions}

      ## Guidelines
      1. Implement the requirements completely
      2. Follow existing code patterns and conventions
      3. Add tests if appropriate
      4. Update documentation as needed
      5. Ensure the code passes any existing linting/type checks

      You are running in an automated environment. Do not ask questions. Proceed with implementation.
    variables:
      - title
      - description
      - acceptanceCriteria
      - workItemType
      - id
      - project
      - priority
      - preInstructions
```

#### completion.yaml

```yaml
# Completion detection configuration
strategies:
  heuristic:
    enabled: true
    description: "Detect completion based on output markers"
    completionMarkers:
      - "task completed"
      - "done"
      - "finished"
      - "completed successfully"
      - "changes applied"
      - "implemented"
      - "✓"
      - "✅"
      - "success"
      - "all requirements met"
    failureMarkers:
      - "failed"
      - "error"
      - "unable to"
      - "cannot"
      - "unable to complete"
      - "task failed"
      - "❌"
      - "✗"
      - "not possible"
      - "insufficient information"
    fatalErrorPatterns:
      - "permission denied"
      - "not found"
      - "does not exist"
      - "invalid"
      - "unauthorized"
      - "authentication failed"
      - "repository not found"

  gitChanges:
    enabled: true
    description: "Detect completion based on git changes"
    minChanges: 1

  llmJudge:
    enabled: false
    description: "Use LLM to evaluate completion (future)"

defaultStrategy: "heuristic"
```

#### workflows.yaml

```yaml
# Workflow configuration for task-loop
defaultWorkflow: "oneshot_with_git"
taskExecutionWorkflow: "oneshot_with_git"
gitSetupWorkflow: "oneshot_with_git"

# Workflow overrides per task type
workflowOverrides:
  bug: "oneshot_with_git"
  feature: "oneshot_with_git"
  refactor: "oneshot_with_git"
```


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Configuration Loading from YAML

*For any* task-loop component (selector, prompt builder, completion detector), when it needs configuration data, it should load that data from the corresponding YAML file rather than using hardcoded values.

**Validates: Requirements 1.1, 1.3, 2.2, 3.2, 4.2**

### Property 2: Workflow Engine Delegation

*For any* task execution request, the orchestrator should create a WorkflowExecutionRequest, pass it to the workflow engine, and receive a WorkflowExecutionResult without implementing workflow logic directly.

**Validates: Requirements 5.2, 5.3, 5.5**

### Property 3: Template Variable Substitution

*For any* prompt template loaded from YAML and any task data, substituting template variables should produce a prompt that contains all the substituted values from the task.

**Validates: Requirements 3.4, 3.5**

### Property 4: Workflow Reference Validation

*For any* workflow ID referenced in configuration, the system should validate that the workflow exists before execution and provide a clear error message if it doesn't.

**Validates: Requirements 1.4, 8.2, 8.3, 8.4**

### Property 5: Configuration-Driven Behavior

*For any* configuration change in YAML files (selection rules, completion markers, prompt templates), the system behavior should change accordingly without code modifications.

**Validates: Requirements 2.5, 4.5**

### Property 6: Workflow Discovery

*For any* YAML workflow file added to packages/core/workflows/, the task-loop should automatically discover it and include it in the list of available workflows.

**Validates: Requirements 8.1, 8.5**

### Property 7: Git Operation Context Flow

*For any* git operation executed via workflow engine, the task-loop should receive the branch name and worktree path from the workflow context after completion.

**Validates: Requirements 1.5**

### Property 8: Configuration File Loading

*For any* task-loop startup, all required configuration files (selection.yaml, prompts.yaml, completion.yaml, workflows.yaml) should be loaded, and if any file is missing, a clear error message should be provided.

**Validates: Requirements 6.3, 6.5**

### Property 9: YAML Schema Consistency

*For any* configuration file loaded, it should conform to its defined schema with all required fields present.

**Validates: Requirements 6.4**

### Property 10: API Backward Compatibility

*For any* existing API method or interface in the pre-refactor version, the refactored version should maintain the same signature and behavior.

**Validates: Requirements 7.4**

## Error Handling

### Configuration Errors

**Missing Configuration Files:**
- When a required YAML file is missing, throw `ConfigurationError` with message: "Configuration file not found: {filename}"
- Include the expected path in the error message
- Provide a list of required configuration files

**Invalid YAML Syntax:**
- When YAML parsing fails, throw `ConfigurationError` with message: "Invalid YAML syntax in {filename}: {parseError}"
- Include line number and column if available
- Suggest common YAML syntax issues (indentation, quotes, etc.)

**Schema Validation Errors:**
- When a configuration file doesn't match its schema, throw `ConfigurationError` with message: "Invalid configuration in {filename}: {validationErrors}"
- List all validation errors with field paths
- Provide examples of correct values

### Workflow Errors

**Workflow Not Found:**
- When a referenced workflow doesn't exist, throw `WorkflowNotFoundError` with message: "Workflow not found: {workflowId}"
- Include a list of available workflows
- Suggest similar workflow IDs (fuzzy matching)

**Workflow Execution Errors:**
- When workflow execution fails, propagate the workflow engine's error
- Add context about which task was being executed
- Include workflow ID and execution ID for debugging

### Template Errors

**Template Not Found:**
- When a requested template doesn't exist, throw `TemplateNotFoundError` with message: "Template not found: {templateName}"
- Include a list of available templates
- Fall back to default template if configured

**Variable Substitution Errors:**
- When a required variable is missing from task data, log a warning and use empty string
- Do not fail the entire prompt building process
- Include a list of missing variables in debug logs

## Testing Strategy

### Dual Testing Approach

This refactor requires both unit tests and property-based tests:

**Unit Tests:**
- Verify specific configuration file loading scenarios
- Test error handling for missing/invalid files
- Verify API backward compatibility with concrete examples
- Test workflow engine integration with mocked workflows
- Verify template variable substitution with specific examples

**Property-Based Tests:**
- Test configuration loading across all component types (minimum 100 iterations)
- Test workflow delegation with randomly generated tasks (minimum 100 iterations)
- Test template substitution with random task data (minimum 100 iterations)
- Test workflow validation with random workflow IDs (minimum 100 iterations)
- Test configuration-driven behavior changes (minimum 100 iterations)

**Property Test Configuration:**
- Use fast-check for TypeScript property-based testing
- Minimum 100 iterations per property test
- Each property test must reference its design document property
- Tag format: **Feature: task-loop-yaml-refactor, Property {number}: {property_text}**

**Testing Balance:**
- Focus unit tests on edge cases, error conditions, and integration points
- Use property tests to verify universal properties across all inputs
- Avoid writing too many unit tests for scenarios covered by property tests
- Property tests handle comprehensive input coverage through randomization

### Integration Testing

**Workflow Engine Integration:**
- Test that task-loop correctly delegates to workflow engine
- Verify workflow context is properly constructed
- Test that workflow results are correctly interpreted
- Use real workflow engine with test workflows

**Configuration Loading Integration:**
- Test loading all configuration files together
- Verify configuration changes affect system behavior
- Test configuration validation across all files
- Use real YAML files in test fixtures

**End-to-End Testing:**
- Test complete task execution flow with YAML configuration
- Verify git operations work through workflow delegation
- Test task selection with loaded configuration
- Test prompt building with loaded templates
- Test completion detection with loaded markers
