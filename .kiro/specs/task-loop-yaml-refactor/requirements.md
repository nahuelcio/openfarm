# Requirements Document

## Introduction

The task-loop package currently contains hardcoded workflow logic in TypeScript that should be defined in YAML workflow files instead. This violates the principle of configuration-driven workflows and makes the system inflexible and difficult to extend. This refactor will eliminate all hardcoded workflow logic and make task-loop a thin orchestrator that delegates to the workflow engine.

## Glossary

- **Task_Loop**: The autonomous task execution system that processes work items continuously
- **Workflow_Engine**: The existing workflow execution engine that processes YAML workflow definitions
- **Orchestrator**: The main coordinator that manages task selection, execution, and completion detection
- **YAML_Workflow**: A workflow definition stored in a YAML file under packages/core/workflows/
- **Step_Executor**: A component that executes individual workflow steps (git operations, agent execution, etc.)
- **Task_Selector**: Component responsible for choosing which task to execute next
- **Prompt_Builder**: Component that constructs prompts for AI agents from task data
- **Completion_Detector**: Component that determines if a task has been completed successfully
- **Hardcoded_Logic**: Workflow logic implemented directly in TypeScript rather than defined in configuration

## Requirements

### Requirement 1: Remove Hardcoded Git Operations

**User Story:** As a developer, I want git operations to be defined in YAML workflows, so that I can modify git behavior without changing TypeScript code.

#### Acceptance Criteria

1. WHEN the orchestrator needs to perform git operations, THE Task_Loop SHALL load the appropriate YAML workflow
2. THE workflow-adapter.ts file SHALL NOT contain hardcoded StepExecutor implementations for git.branch or git.worktree
3. WHEN git setup is required, THE Task_Loop SHALL delegate to the oneshot_with_git.yaml workflow
4. THE Task_Loop SHALL NOT reference a non-existent "git-setup" workflow
5. WHEN git operations complete, THE Task_Loop SHALL receive branch name and worktree path from workflow context

### Requirement 2: YAML-Driven Task Selection

**User Story:** As a system administrator, I want task selection strategies to be configurable via YAML, so that I can adjust selection behavior without code changes.

#### Acceptance Criteria

1. THE task-selector.ts file SHALL NOT contain hardcoded PRIORITY_SCORES
2. WHEN selecting tasks, THE Task_Selector SHALL load selection configuration from a YAML file
3. THE YAML configuration SHALL define priority scores for each priority level (critical, high, medium, low)
4. THE YAML configuration SHALL define available selection strategies (priority, fifo, lifo, random)
5. WHEN a selection strategy is requested, THE Task_Selector SHALL apply the rules defined in YAML

### Requirement 3: YAML-Driven Prompt Templates

**User Story:** As a developer, I want prompt templates to be stored in YAML files, so that I can customize prompts without modifying TypeScript code.

#### Acceptance Criteria

1. THE prompt-builder.ts file SHALL NOT contain hardcoded template constants (DEFAULT_TEMPLATE, SIMPLE_TEMPLATE, DETAILED_TEMPLATE)
2. WHEN building a prompt, THE Prompt_Builder SHALL load templates from YAML configuration files
3. THE YAML configuration SHALL define all available prompt templates
4. THE YAML configuration SHALL support template variables (title, description, acceptanceCriteria, etc.)
5. WHEN a template is requested, THE Prompt_Builder SHALL load it from YAML and substitute variables

### Requirement 4: YAML-Driven Completion Detection

**User Story:** As a developer, I want completion detection rules to be defined in YAML, so that I can adjust detection behavior without code changes.

#### Acceptance Criteria

1. THE completion-detector.ts file SHALL NOT contain hardcoded DEFAULT_COMPLETION_MARKERS or DEFAULT_FAILURE_MARKERS
2. WHEN detecting task completion, THE Completion_Detector SHALL load detection rules from YAML configuration
3. THE YAML configuration SHALL define completion markers for each detection strategy
4. THE YAML configuration SHALL define failure markers and fatal error patterns
5. WHEN evaluating task results, THE Completion_Detector SHALL apply rules from YAML configuration

### Requirement 5: Workflow Engine Delegation

**User Story:** As a system architect, I want the orchestrator to delegate all workflow execution to the workflow engine, so that workflow logic is centralized and consistent.

#### Acceptance Criteria

1. THE Orchestrator SHALL NOT implement workflow execution logic directly
2. WHEN executing a task, THE Orchestrator SHALL create a WorkflowExecutionRequest and pass it to the workflow engine
3. THE Orchestrator SHALL receive execution results from the workflow engine
4. THE Orchestrator SHALL NOT contain hardcoded logic for task execution steps
5. WHEN workflow execution completes, THE Orchestrator SHALL update task status based on workflow results

### Requirement 6: Configuration File Structure

**User Story:** As a developer, I want a clear configuration file structure, so that I can easily find and modify task-loop settings.

#### Acceptance Criteria

1. THE Task_Loop SHALL define a configuration directory at packages/task-loop/config/
2. THE configuration directory SHALL contain separate YAML files for each concern (selection, prompts, completion, workflows)
3. WHEN the Task_Loop starts, THE system SHALL load all configuration files from the config directory
4. THE configuration files SHALL use a consistent YAML schema
5. WHEN a configuration file is missing, THE Task_Loop SHALL provide clear error messages

### Requirement 7: Backward Compatibility

**User Story:** As a user of task-loop, I want the public API to remain unchanged, so that my existing code continues to work after the refactor.

#### Acceptance Criteria

1. THE TaskLoopOrchestrator class SHALL maintain its existing public methods (run, pause, getIsRunning, getSession)
2. THE TaskLoopConfig interface SHALL remain unchanged
3. THE runTaskLoop and resumeTaskLoop functions SHALL maintain their existing signatures
4. WHEN calling existing API methods, THE Task_Loop SHALL behave identically to the pre-refactor version
5. THE Task_Loop SHALL NOT introduce breaking changes to exported types or interfaces

### Requirement 8: Extensibility

**User Story:** As a developer, I want to add new workflows without code changes, so that I can extend task-loop functionality easily.

#### Acceptance Criteria

1. WHEN a new YAML workflow is added to packages/core/workflows/, THE Task_Loop SHALL automatically discover it
2. THE Task_Loop SHALL support referencing workflows by ID in configuration
3. WHEN a workflow is referenced, THE Task_Loop SHALL validate that it exists before execution
4. THE Task_Loop SHALL provide clear error messages when a referenced workflow is not found
5. WHEN listing available workflows, THE Task_Loop SHALL include all workflows from the workflows directory
