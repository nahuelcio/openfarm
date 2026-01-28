# Predefined Workflows

This directory contains JSON files defining predefined workflows for the Minions Farm platform.

## Workflows

### fix-bug-workflow.json

Standard workflow for fixing bugs. Includes:

- Git checkout and branch creation
- AI-assisted code changes with improved prompts
- Commit and push operations
- Pull request creation

**Features:**

- 10-minute timeout for code changes (increased from 5 minutes)
- Retry support for all steps
- Detailed commit messages
- Comprehensive PR descriptions

### document-code-workflow.json

Workflow for generating comprehensive code documentation. Includes:

- JSDoc/TSDoc comment generation
- File and module-level documentation
- Usage examples
- Detailed prompts for better documentation quality

**Features:**

- 10-minute timeout for documentation generation
- Focus on public APIs and complex logic
- Maintains existing code style
- Improved PR descriptions

### refactor-code-workflow.json

Workflow for safely refactoring code. Includes:

- Code analysis phase before refactoring
- Impact assessment
- Safe refactoring with backward compatibility focus
- Validation steps

**Features:**

- Two-phase approach: analyze then refactor
- 15-minute timeout for refactoring operations
- Emphasis on maintaining functionality
- Comprehensive testing recommendations

## Adding New Workflows

To add a new predefined workflow:

1. Create a new JSON file in this directory with the pattern `{workflow-id}-workflow.json`
2. Follow the Workflow schema defined in `packages/core/src/types.ts`
3. Ensure all required fields are present:

   - `id`: Unique workflow identifier
   - `name`: Human-readable workflow name
   - `description`: Optional workflow description
   - `steps`: Array of workflow steps

4. Each step must have:
   - `id`: Unique step identifier

- `type`: One of 'git', 'code', 'llm', 'command', 'platform', 'planning', 'human', 'review', 'conditional', 'loop', 'parallel'
- `action`: Action identifier (e.g., 'git.checkout', 'agent.code', 'planning.plan', 'human.approval')
- `config`: Configuration object for the action

5. Optional step fields:
   - `timeout`: Timeout in milliseconds
   - `retryCount`: Number of retry attempts
   - `continueOnError`: Whether to continue on error
   - `model`: Model to use for code or planning steps
   - `prompt`: Custom prompt for code or planning steps

## Optional Steps: Planning and Human Approval

Workflows support optional steps for planning and human approval. These steps are **completely optional** and can be added to any existing workflow:

### Planning Step (`planning.plan`)

Generates a detailed implementation plan before code changes:

- **Type**: `planning`
- **Action**: `planning.plan`
- **Config**:
  - `model`: Model to use (optional, defaults to agent config model)
  - `format`: Output format (default: "markdown")
- **Prompt**: Optional custom prompt for plan generation

**Example:**

```json
{
  "id": "plan",
  "type": "planning",
  "action": "planning.plan",
  "config": {
    "model": "gpt-4o"
  },
  "timeout": 300000,
  "retryCount": 1
}
```

### Human Approval Step (`human.approval`)

Pauses the workflow and waits for human approval/modification of the plan:

- **Type**: `human`
- **Action**: `human.approval`
- **Config**:
  - `timeout`: Maximum wait time in milliseconds (default: 24 hours)
- **Note**: Requires a planning step to be executed first

**Example:**

```json
{
  "id": "approval",
  "type": "human",
  "action": "human.approval",
  "config": {
    "timeout": 86400000
  },
  "continueOnError": false
}
```

### Implementation Step (`agent.implement`)

Implements code changes based on an approved plan:

- **Type**: `code`
- **Action**: `agent.implement`
- **Config**: Same as `agent.code`
- **Note**: Requires a planning step and approval step to be executed first

**Example:**

```json
{
  "id": "implement",
  "type": "code",
  "action": "agent.implement",
  "config": {
    "provider": "opencode"
  },
  "timeout": 600000
}
```

### Workflow Pattern with Planning

To add planning to an existing workflow, insert these steps before the implementation step:

1. **Planning step** (`planning.plan`) - Generates the plan
2. **Approval step** (`human.approval`) - Waits for human review
3. **Implementation step** (`agent.implement`) - Implements the approved plan

**Important**:

- These steps are **completely optional** - existing workflows work without them
- If you use `agent.implement`, you must have `planning.plan` and `human.approval` steps before it
- If you use `human.approval`, you must have a `planning.plan` step before it
- You can still use `agent.code` in workflows without planning (as in existing workflows)

See `fix-bug-with-planning-workflow.json` for an example of adding planning to an existing workflow.

6. The workflow will be automatically loaded when `initializePredefinedWorkflows()` is called.

## Workflow Variable Substitution

Workflows support variable substitution in prompts and config values:

- `{title}`: Work item title
- `{description}`: Work item description
- `{acceptanceCriteria}`: Work item acceptance criteria
- `{id}`: Work item ID
- `{type}`: Work item type (e.g., 'Bug', 'Task')

## OpenCode Configuration

OpenCode supports configurable providers and models. Configuration is resolved in this order:

1. Step config (per workflow step)
2. Agent configuration (if provider is `opencode`)
3. Context overrides (server/tui overrides)
4. Shared provider config
5. Environment variables
6. Defaults

### Step Configuration

You can override the model used by OpenCode per step by specifying `model` in the step config.
This only applies when the workflow step uses `provider: "opencode"`.

**Example:**

```json
{
  "id": "code",
  "type": "code",
  "action": "agent.code",
  "config": {
    "provider": "opencode",
    "model": "copilot/claude-sonnet-4"
  }
}
```

## Best Practices

1. **Timeouts**: Set appropriate timeouts for long-running operations (code generation, refactoring)
2. **Retries**: Add retry logic for network-dependent operations (git push, PR creation)
3. **Error Handling**: Use `continueOnError: true` for non-critical steps (PR creation)
4. **Prompts**: Write clear, detailed prompts for AI code generation steps
5. **Descriptions**: Include comprehensive descriptions in PR creation steps
