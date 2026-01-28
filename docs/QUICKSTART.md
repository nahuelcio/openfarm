# Quick Start Guide

## Installation

```bash
npm install @openfarm/sdk
# or
yarn add @openfarm/sdk
# or
bun add @openfarm/sdk
```

## Basic Usage

```typescript
import { MinionsFarm } from '@openfarm/sdk'

const client = new MinionsFarm({
  provider: 'anthropic',
  apiKey: process.env.ANTHROPIC_API_KEY
})

const result = await client.execute({
  task: 'Fix the authentication bug',
  repo: './my-project'
})

console.log(result.diff) // See the changes
```

## What's Next?

- 📖 [Full Documentation](./API.md)
- 💡 [Examples](../examples/)
- 🏗️ [Architecture](./ARCHITECTURE.md)
- 🤝 [Contributing](../CONTRIBUTING.md)

## Key Concepts

### Agents

OpenFarm runs AI agents that understand code and make fixes. Each agent can:
- Analyze code structure
- Write tests
- Make targeted changes
- Verify the fix works

### Workflows

Chain multiple operations together:

```typescript
const workflow = await client.createWorkflow({
  steps: [
    { type: 'analyze', target: 'src/auth' },
    { type: 'fix', issue: 'Missing error handling' },
    { type: 'test' },
    { type: 'commit' }
  ]
})
```

### Adapters

Connect to your platform:
- **GitHub:** Manage issues, PRs, repos
- **Azure DevOps:** Work with work items
- **GitLab:** Coming soon

## Common Tasks

### Fix a specific file

```typescript
await client.execute({
  task: 'Add input validation',
  repo: './project',
  files: ['src/utils/validate.ts']
})
```

### Run a workflow

```typescript
const result = await client.runWorkflow({
  workflow: 'default-bug-fix',
  issue: 'Handle null pointers in payment processor'
})
```

### Get agent status

```typescript
const status = await client.getStatus()
console.log(status.running, status.completed, status.failed)
```

## Environment Variables

```bash
# Required
ANTHROPIC_API_KEY=sk-...

# Optional
GITHUB_TOKEN=ghp_...
AZURE_DEVOPS_TOKEN=pat_...
```

## Troubleshooting

**Agent timed out?**
- Increase timeout in config
- Break task into smaller pieces

**Changes not appearing?**
- Check agent logs: `client.logs()`
- Verify repo path is correct

**Integration errors?**
- Verify tokens are set
- Check permissions on repositories

See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for more.
