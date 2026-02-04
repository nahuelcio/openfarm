---
inclusion: manual
---

# Creating Workflows in OpenFarm

This guide explains how to create, structure, and use workflows in OpenFarm. Workflows are YAML-based automation definitions that orchestrate git operations, code execution, human approvals, and platform integrations.

## Core Concepts

### What is a Workflow?

A workflow is a declarative definition of an automation process. It consists of:

- **Metadata**: ID, name, description
- **Parameters**: Configurable inputs (optional)
- **Variables**: Computed values available to all steps (optional)
- **Steps**: Sequential or parallel operations to execute

### Workflow Lifecycle

1. **Definition**: Write workflow YAML file
2. **Validation**: Ensure schema compliance
3. **Execution**: Runtime processes steps sequentially
4. **State Management**: Track execution progress and results

## Workflow Structure

### Basic Template

```yaml
id: my-workflow
name: My Workflow
description: Brief description of what this workflow does

parameters:
  paramName:
    type: string
    required: false
    default: "value"
    description: Parameter description

variables:
  varName: "static value"
  computedVar: "${expression}"

steps:
  - id: step-1
    name: Step Name
    type: git
    action: git.branch
    config:
      pattern: "feature-${Date.now()}"
    timeout: 30000
    retryCount: 1
    continueOnError: false
```

### Required Fields

- `id`: Unique workflow identifier (kebab-case)
- `steps`: Array of at least one step

### Optional Fields

- `name`: Human-readable workflow name
- `description`: Workflow purpose and behavior
- `extends`: Parent workflow ID for inheritance
- `abstract`: If true, workflow cannot be executed directly (inheritance-only)
- `parameters`: Configurable inputs
- `variables`: Workflow-level variables
- `version`: Workflow version string
- `metadata`: Additional custom metadata

## Parameters

Parameters make workflows reusable by accepting external inputs.

### Parameter Definition

```yaml
parameters:
  provider:
    type: string
    required: false
    default: "external-agent"
    description: Provider to use for code execution
  
  maxIterations:
    type: number
    required: true
    description: Maximum iterations for agent execution
  
  enableDebug:
    type: boolean
    required: false
    default: false
    description: Enable debug logging
  
  config:
    type: object
    required: false
    description: Configuration object
  
  tags:
    type: array
    required: false
    default: []
    description: List of tags
```

### Parameter Types

- `string`: Text values
- `number`: Numeric values
- `boolean`: True/false values
- `object`: JSON objects
- `array`: Lists of values

### Using Parameters

Reference parameters in steps using expression syntax:

```yaml
steps:
  - id: execute
    type: code
    action: agent.implement
    config:
      provider: "${provider}"
      maxIterations: "${maxIterations}"
```

## Variables

Variables are computed values available to all steps in the workflow.

### Variable Definition

```yaml
variables:
  # Static value
  worktreePath: ""
  
  # Computed expression
  currentDate: "${new Date().toISOString()}"
  
  # Reference parameters
  branchPrefix: "${provider}-task"
  
  # Complex expressions
  commitMessage: "${workItem.title} - ${currentDate}"
```

### Expression Syntax

Variables support JavaScript expressions wrapped in `${}`:

```yaml
variables:
  # Date operations
  timestamp: "${Date.now()}"
  isoDate: "${new Date().toISOString()}"
  
  # String operations
  upperTitle: "${workItem.title.toUpperCase()}"
  
  # Conditional expressions
  modelName: "${model || 'default-model'}"
  
  # Object access
  taskId: "${workItem.id}"
  taskTitle: "${workItem.title}"
```

### Available Context

Expressions have access to:

- `workItem`: Current work item object (id, title, description, etc.)
- `task`: Task description (alias for workItem.description)
- `parameters`: All workflow parameters
- `variables`: Previously defined variables
- Standard JavaScript globals: `Date`, `Math`, `String`, etc.

## Steps

Steps are the building blocks of workflows. Each step performs a specific action.

### Step Structure

```yaml
steps:
  - id: unique-step-id
    name: Human Readable Name
    type: git
    action: git.branch
    config:
      # Action-specific configuration
      pattern: "feature-${Date.now()}"
    timeout: 30000
    retryCount: 1
    continueOnError: false
    model: "gpt-5-mini"
    prompt: |
      Multi-line prompt
      for this step
```

### Step Fields

- `id` (required): Unique step identifier within workflow
- `type` (required): Step type (git, code, planning, human, platform, command, conditional, loop, parallel)
- `action` (required): Specific action to perform
- `config` (required): Action-specific configuration object
- `timeout` (optional): Maximum execution time in milliseconds
- `retryCount` (optional): Number of retry attempts on failure
- `continueOnError` (optional): If true, workflow continues even if step fails
- `model` (optional): Override model for this step
- `prompt` (optional): Custom prompt for agent steps

### Step Types and Actions

#### Task Operations (`type: task`)

**task.load** - Load tasks from database
```yaml
- id: load-tasks
  type: task
  action: task.load
  config: {}
```

**task.filter** - Filter tasks by criteria
```yaml
- id: filter-tasks
  type: task
  action: task.filter
  config:
    project: "my-project"
    minPriority: "high"
    tags: ["urgent", "bug"]
    status: ["new", "assigned"]
```

**task.select** - Select next task from queue
```yaml
- id: select-task
  type: task
  action: task.select
  config:
    strategy: "priority"  # priority, fifo, lifo, random
```

**task.update_status** - Update task status
```yaml
- id: update-status
  type: task
  action: task.update_status
  config:
    taskId: "${variables.currentTask.id}"
    status: "completed"  # pending, running, completed, failed
```

#### Prompt Operations (`type: prompt`)

**prompt.build** - Build prompt from template and task
```yaml
- id: build-prompt
  type: prompt
  action: prompt.build
  config:
    template: "default"  # default, simple, detailed
```

**prompt.template** - Apply template to variables
```yaml
- id: apply-template
  type: prompt
  action: prompt.template
  config:
    template: "Task: {title}\n\n{description}"
    variables:
      title: "My Task"
      description: "Task description"
```

#### Detection Operations (`type: detection`)

**detection.check_completion** - Check if task is complete
```yaml
- id: check-completion
  type: detection
  action: detection.check_completion
  config:
    output: "${variables.executionOutput}"
    error: "${variables.executionError}"
    success: true
    strategy: "heuristic"  # heuristic, git-changes, llm-judge
    completionMarkers:
      - "task completed"
      - "done"
      - "✅"
    failureMarkers:
      - "failed"
      - "error"
      - "❌"
```

**detection.analyze_output** - Analyze agent output
```yaml
- id: analyze-output
  type: detection
  action: detection.analyze_output
  config:
    output: "${variables.executionOutput}"
```

#### Session Operations (`type: session`)

**session.create** - Create new session
```yaml
- id: create-session
  type: session
  action: session.create
  config:
    sessionId: "optional-custom-id"
```

**session.update** - Update session state
```yaml
- id: update-session
  type: session
  action: session.update
  config:
    status: "running"  # running, paused, completed, failed
    completedTasks: 5
    failedTasks: 1
```

**session.log** - Add log entry to session
```yaml
- id: log-message
  type: session
  action: session.log
  config:
    message: "Task completed successfully"
```

#### Git Operations (`type: git`)

**git.branch** - Create a new branch
```yaml
- id: create-branch
  type: git
  action: git.branch
  config:
    pattern: "task-${Date.now()}"
```

**git.worktree** - Manage git worktrees
```yaml
- id: create-worktree
  type: git
  action: git.worktree
  config:
    operation: "create"  # or "remove"
```

**git.commit** - Commit changes
```yaml
- id: commit
  type: git
  action: git.commit
  config:
    message: "${commitMessage}"
```

**git.push** - Push to remote
```yaml
- id: push
  type: git
  action: git.push
  config:
    customLabel: "⬆️ Push to Remote"
    customDescription: "Pushes committed changes"
```

**git.checkout** - Checkout branch
```yaml
- id: checkout
  type: git
  action: git.checkout
  config:
    branch: "main"
```

#### Code Execution (`type: code`)

**agent.code** - Execute code with agent
```yaml
- id: execute
  type: code
  action: agent.code
  config:
    provider: "external-agent"
    model: "gpt-5-mini"
    maxIterations: 5
    previewMode: false
    readOnly: false
    chatOnly: false
  prompt: |
    Implement the following feature:
    ${task}
```

**agent.implement** - Implement task with agent
```yaml
- id: implement
  type: code
  action: agent.implement
  config:
    provider: "${provider}"
    model: "${model}"
    maxIterations: 5
```

**agent.author** - Generate content with LLM
```yaml
- id: author
  type: code
  action: agent.author
  config:
    model: "gpt-5-mini"
    systemPrompt: "You are a technical writer"
  prompt: |
    Write documentation for:
    ${task}
```

**agent.router** - Route to appropriate agent
```yaml
- id: route
  type: code
  action: agent.router
  config:
    provider: "external-agent"
```

#### Planning (`type: planning`)

**planning.plan** - Generate implementation plan
```yaml
- id: plan
  type: planning
  action: planning.plan
  config:
    provider: "${provider}"
    model: "${model}"
    format: "markdown"
  timeout: 300000
  prompt: |
    Generate a detailed implementation plan for:
    ${task}
    
    Include:
    1. Analysis of requirements
    2. Step-by-step implementation plan
    3. Files that may need modification
    4. Potential risks or considerations
```

#### Human Interaction (`type: human`)

**human.approval** - Wait for human approval
```yaml
- id: approval
  type: human
  action: human.approval
  config:
    timeout: 86400000  # 24 hours
```

**human.input** - Request human input
```yaml
- id: input
  type: human
  action: human.input
  config:
    prompt: "Enter configuration value"
    timeout: 3600000  # 1 hour
```

#### Platform Operations (`type: platform`)

**platform.create_pr** - Create pull request
```yaml
- id: create-pr
  type: platform
  action: platform.create_pr
  config:
    title: "${workItem.title}"
    body: "Automated PR for task ${workItem.id}"
    base: "main"
```

**platform.post_comment** - Post comment on PR/issue
```yaml
- id: comment
  type: platform
  action: platform.post_comment
  config:
    message: "Task completed successfully"
```

**platform.provision_pod** - Provision execution pod
```yaml
- id: provision
  type: platform
  action: platform.provision_pod
  config:
    resources:
      cpu: "2"
      memory: "4Gi"
```

**platform.destroy_pod** - Destroy execution pod
```yaml
- id: cleanup
  type: platform
  action: platform.destroy_pod
  config:
    podId: "${variables.podId}"
```

#### Command Execution (`type: command`)

**command.exec** - Execute shell command
```yaml
- id: run-tests
  type: command
  action: command.exec
  config:
    command: "npm test"
    cwd: "${worktreePath}"
    env:
      NODE_ENV: "test"
```

#### Control Flow

**Conditional Steps** (`type: conditional`)
```yaml
- id: conditional-step
  type: conditional
  condition: "${variables.shouldDeploy}"
  if:
    - id: deploy
      type: command
      action: command.exec
      config:
        command: "npm run deploy"
  else:
    - id: skip-deploy
      type: command
      action: command.exec
      config:
        command: "echo 'Skipping deployment'"
```

**Switch Statements**
```yaml
- id: switch-step
  type: conditional
  condition: "${parameters.environment}"
  switch:
    production:
      - id: prod-deploy
        type: command
        action: command.exec
        config:
          command: "npm run deploy:prod"
    staging:
      - id: staging-deploy
        type: command
        action: command.exec
        config:
          command: "npm run deploy:staging"
  default:
    - id: dev-deploy
      type: command
      action: command.exec
      config:
        command: "npm run deploy:dev"
```

**Loop Steps** (`type: loop`)
```yaml
- id: retry-loop
  type: loop
  loopType: "retry"
  maxIterations: 3
  steps:
    - id: attempt
      type: command
      action: command.exec
      config:
        command: "npm run flaky-test"
  onError: "continue"
```

**While Loop**
```yaml
- id: while-loop
  type: loop
  loopType: "while"
  condition: "${variables.hasMoreWork}"
  maxIterations: 10
  steps:
    - id: process
      type: code
      action: agent.code
      config:
        provider: "external-agent"
  breakOn: "${variables.completed}"
```

**Parallel Steps** (`type: parallel`)
```yaml
- id: parallel-tests
  type: parallel
  maxConcurrency: 3
  failFast: true
  steps:
    - id: unit-tests
      type: command
      action: command.exec
      config:
        command: "npm run test:unit"
    
    - id: integration-tests
      type: command
      action: command.exec
      config:
        command: "npm run test:integration"
    
    - id: e2e-tests
      type: command
      action: command.exec
      config:
        command: "npm run test:e2e"
```

## Workflow Inheritance

Workflows can extend other workflows to reuse common patterns.

### Parent Workflow (Abstract)

```yaml
id: base-git-workflow
name: Base Git Workflow
description: Common git operations
abstract: true

parameters:
  commitMessage:
    type: string
    required: false
    default: "${workItem.title}"

steps:
  - id: create-branch
    type: git
    action: git.branch
    config:
      pattern: "task-${Date.now()}"
  
  - id: create-worktree
    type: git
    action: git.worktree
    config:
      operation: "create"
```

### Child Workflow

```yaml
id: my-custom-workflow
name: My Custom Workflow
extends: base-git-workflow

steps:
  # Inherits steps from base-git-workflow
  # Add additional steps here
  - id: execute
    type: code
    action: agent.implement
    config:
      provider: "external-agent"
  
  - id: commit
    type: git
    action: git.commit
    config:
      message: "${commitMessage}"
```

## Common Workflow Patterns

### Pattern 1: Simple Code Execution (No Git)

```yaml
id: oneshot
name: One Shot
description: Direct execution without git operations

steps:
  - id: execute
    type: code
    action: agent.implement
    config:
      provider: "external-agent"
      maxIterations: 5
```

### Pattern 2: Git + Code + Commit

```yaml
id: oneshot-with-git
name: One Shot + Git
description: Execute with worktree, commit and push

variables:
  worktreePath: ""

steps:
  - id: create-branch
    type: git
    action: git.branch
    config:
      pattern: "task-${Date.now()}"
  
  - id: create-worktree
    type: git
    action: git.worktree
    config:
      operation: "create"
  
  - id: execute
    type: code
    action: agent.implement
    config:
      provider: "external-agent"
  
  - id: commit
    type: git
    action: git.commit
    config:
      message: "${workItem.title}"
  
  - id: push
    type: git
    action: git.push
    config: {}
```

### Pattern 3: Plan → Approval → Execute

```yaml
id: with-human-approval
name: With Human Approval
description: Plan → Human Approval → Execute → Commit → Push

steps:
  - id: create-branch
    type: git
    action: git.branch
    config:
      pattern: "task-${Date.now()}"
  
  - id: create-worktree
    type: git
    action: git.worktree
    config:
      operation: "create"
  
  - id: plan
    type: planning
    action: planning.plan
    config:
      provider: "external-agent"
      format: "markdown"
    prompt: |
      Generate implementation plan for: ${task}
  
  - id: approval
    type: human
    action: human.approval
    config:
      timeout: 86400000
  
  - id: execute
    type: code
    action: agent.implement
    config:
      provider: "external-agent"
  
  - id: commit
    type: git
    action: git.commit
    config:
      message: "${workItem.title}"
  
  - id: push
    type: git
    action: git.push
    config: {}
```

### Pattern 4: Autonomous Task Loop

```yaml
id: task-loop
name: Task Loop
description: Continuously process work items from database

steps:
  - id: task-loop-orchestrator
    type: loop
    loopType: "while"
    condition: "true"
    maxIterations: 1000
    steps:
      - id: fetch-task
        type: command
        action: command.exec
        config:
          command: "fetch-next-task"
      
      - id: execute-task
        type: code
        action: agent.implement
        config:
          provider: "external-agent"
      
      - id: mark-complete
        type: command
        action: command.exec
        config:
          command: "mark-task-complete"
```

## Best Practices

### Naming Conventions

- **Workflow IDs**: Use kebab-case (e.g., `my-workflow`, `task-loop`)
- **Step IDs**: Use kebab-case (e.g., `create-branch`, `execute-task`)
- **Parameter names**: Use camelCase (e.g., `maxIterations`, `commitMessage`)
- **Variable names**: Use camelCase (e.g., `worktreePath`, `currentDate`)

### Error Handling

```yaml
steps:
  - id: risky-operation
    type: command
    action: command.exec
    config:
      command: "npm run risky"
    retryCount: 3
    continueOnError: false
    timeout: 60000
```

- Use `retryCount` for transient failures
- Use `continueOnError: true` for optional steps
- Set reasonable `timeout` values to prevent hanging

### Timeouts

Recommended timeout values:

- Git operations: 30000ms (30 seconds)
- Code execution: 600000ms (10 minutes)
- Planning: 300000ms (5 minutes)
- Human approval: 86400000ms (24 hours)
- Command execution: 60000ms (1 minute)

### Prompts

Use multi-line prompts with clear instructions:

```yaml
prompt: |
  Implement the following feature:
  
  ${task}
  
  Requirements:
  1. Follow existing code style
  2. Add unit tests
  3. Update documentation
  
  Context:
  - Current date: ${variables.currentDate}
  - Provider: ${provider}
```

### Configuration Organization

Group related configuration:

```yaml
config:
  # Provider settings
  provider: "${provider}"
  model: "${model}"
  
  # Execution settings
  maxIterations: 5
  previewMode: false
  
```

## Validation

### Schema Validation

Workflows must conform to the schema:

1. `id` must be kebab-case
2. `steps` must be non-empty array
3. Each step must have `id`, `type`, `action`, `config`
4. Step types must be valid (git, code, planning, human, platform, command, conditional, loop, parallel)
5. Step actions must be valid (git.branch, agent.code, etc.)
6. Parameter types must be valid (string, number, boolean, object, array)

### Common Validation Errors

**Invalid ID format**
```yaml
# ❌ Wrong
id: MyWorkflow

# ✅ Correct
id: my-workflow
```

**Missing required fields**
```yaml
# ❌ Wrong
steps:
  - type: git
    config: {}

# ✅ Correct
steps:
  - id: step-1
    type: git
    action: git.branch
    config:
      pattern: "feature"
```

**Invalid step type**
```yaml
# ❌ Wrong
- id: step-1
  type: invalid-type
  action: some.action
  config: {}

# ✅ Correct
- id: step-1
  type: git
  action: git.branch
  config:
    pattern: "feature"
```

## File Organization

Store workflows in `packages/core/workflows/`:

```
packages/core/workflows/
├── oneshot.yaml
├── oneshot-with-git.yaml
├── with-human-approval.yaml
├── task-loop.yaml
└── custom-workflow.yaml
```

## YAML Formatting

### Indentation

Use 2 spaces (no tabs):

```yaml
steps:
  - id: step-1
    type: git
    config:
      pattern: "feature"
```

### Multi-line Strings

Use pipe operator for multi-line strings:

```yaml
prompt: |
  This is a multi-line
  prompt that preserves
  line breaks
```

### Field Order

Recommended field order:

```yaml
id: workflow-id
name: Workflow Name
description: Description

parameters:
  # parameters here

variables:
  # variables here

steps:
  # steps here
```

### Blank Lines

Add blank lines between major sections:

```yaml
id: my-workflow
name: My Workflow

parameters:
  param1:
    type: string

variables:
  var1: "value"

steps:
  - id: step-1
    type: git
    action: git.branch
    config: {}
```

## Debugging Workflows

### Enable Verbose Logging

```yaml
steps:
  - id: debug-step
    type: code
    action: agent.code
    config:
      provider: "external-agent"
      # Add debug configuration
    prompt: |
      Debug mode enabled
      Current variables: ${JSON.stringify(variables)}
```

### Test Workflow Structure

Use the workflow-creator CLI to validate:

```bash
# Validate workflow
workflow-creator validate my-workflow.yaml

# Test workflow (dry-run)
workflow-creator test my-workflow.yaml --verbose
```

### Common Issues

**Expression evaluation errors**
- Ensure variables are defined before use
- Check expression syntax: `${expression}`
- Verify context availability (workItem, parameters, variables)

**Step execution failures**
- Check step configuration
- Verify action exists for step type
- Review timeout and retry settings

**Git operation failures**
- Ensure worktree is created before operations
- Check branch naming patterns
- Verify git credentials

## Advanced Topics

### Dynamic Step Configuration

Use expressions in config:

```yaml
config:
  provider: "${parameters.provider || 'external-agent'}"
  maxIterations: "${parameters.debug ? 1 : 5}"
  model: "${variables.selectedModel}"
```

### Conditional Execution

Use conditional steps for branching logic:

```yaml
- id: conditional-deploy
  type: conditional
  condition: "${parameters.environment === 'production'}"
  if:
    - id: prod-deploy
      type: command
      action: command.exec
      config:
        command: "npm run deploy:prod"
  else:
    - id: skip-deploy
      type: command
      action: command.exec
      config:
        command: "echo 'Skipping production deploy'"
```

### Parallel Execution

Execute independent steps concurrently:

```yaml
- id: parallel-checks
  type: parallel
  maxConcurrency: 3
  failFast: true
  steps:
    - id: lint
      type: command
      action: command.exec
      config:
        command: "npm run lint"
    
    - id: type-check
      type: command
      action: command.exec
      config:
        command: "npm run type-check"
    
    - id: test
      type: command
      action: command.exec
      config:
        command: "npm test"
```

### Loop Patterns

**Retry with backoff**
```yaml
- id: retry-with-backoff
  type: loop
  loopType: "retry"
  maxIterations: 5
  steps:
    - id: attempt
      type: command
      action: command.exec
      config:
        command: "npm run deploy"
  onError: "continue"
```

**Process queue**
```yaml
- id: process-queue
  type: loop
  loopType: "while"
  condition: "${variables.queueSize > 0}"
  maxIterations: 100
  steps:
    - id: process-item
      type: code
      action: agent.code
      config:
        provider: "external-agent"
  breakOn: "${variables.queueEmpty}"
```

## References

- Workflow types: `packages/core/src/types/workflow.ts`
- Step actions: `packages/core/src/constants/actions.ts`
- Example workflows: `packages/core/workflows/`
- Workflow executor: `packages/workflow-executor/`
- Workflow engine: `packages/workflow-engine/`

## Quick Reference

### Step Types

- `git`: Git operations (branch, commit, push, worktree, checkout)
- `code`: Agent code execution (agent.code, agent.implement, agent.author, agent.router)
- `planning`: Plan generation (planning.plan)
- `human`: Human interaction (human.approval, human.input)
- `platform`: Platform operations (create_pr, post_comment, provision_pod, destroy_pod)
- `command`: Shell command execution (command.exec)
- `conditional`: If/else logic
- `loop`: While/for/retry loops
- `parallel`: Concurrent execution
- `task`: Task management (task.load, task.select, task.filter, task.update_status)
- `prompt`: Prompt building (prompt.build, prompt.template)
- `detection`: Completion detection (detection.check_completion, detection.analyze_output)
- `session`: Session management (session.create, session.update, session.log)

### Parameter Types

- `string`: Text values
- `number`: Numeric values
- `boolean`: True/false values
- `object`: JSON objects
- `array`: Lists of values

### Expression Context

- `workItem`: Current work item (id, title, description)
- `task`: Task description (alias for workItem.description)
- `parameters`: Workflow parameters
- `variables`: Workflow variables
- JavaScript globals: `Date`, `Math`, `String`, etc.
