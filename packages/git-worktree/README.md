# @openfarm/git-worktree

Git worktree utilities for OpenFarm - manage multiple working trees efficiently.

## Installation

```bash
npm install @openfarm/git-worktree
```

## Usage

### List Worktrees

```typescript
import { listWorktrees } from '@openfarm/git-worktree';

const result = await listWorktrees('/path/to/repo');
if (result.ok) {
  console.log('Worktrees:', result.value);
  // [
  //   {
  //     path: '/path/to/main',
  //     branch: 'main',
  //     commit: '1234567890abcdef',
  //     isMain: true,
  //     exists: true
  //   },
  //   {
  //     path: '/path/to/feature',
  //     branch: 'feature-branch',
  //     commit: 'abcdef1234567890',
  //     isMain: false,
  //     exists: true
  //   }
  // ]
}
```

### Create Worktree

```typescript
import { createWorktree } from '@openfarm/git-worktree';

// Create worktree with new branch
const result = await createWorktree('/path/to/repo', {
  path: '/path/to/new-worktree',
  branch: 'feature-branch',
  createBranch: true,
  baseBranch: 'main'
});

if (result.ok) {
  console.log('Created worktree:', result.value);
}
```

### Get Current Worktree

```typescript
import { getCurrentWorktree } from '@openfarm/git-worktree';

const result = await getCurrentWorktree('/path/to/current/directory');
if (result.ok && result.value) {
  console.log('Current worktree:', result.value);
} else {
  console.log('Not in a git worktree');
}
```

### Remove Worktree

```typescript
import { removeWorktree } from '@openfarm/git-worktree';

const result = await removeWorktree('/path/to/repo', '/path/to/worktree');
if (result.ok) {
  console.log('Worktree removed successfully');
}
```

### Prune Stale Worktrees

```typescript
import { pruneWorktrees } from '@openfarm/git-worktree';

const result = await pruneWorktrees('/path/to/repo');
if (result.ok) {
  console.log('Stale worktrees pruned');
}
```

## API

### Types

#### `GitWorktree`

```typescript
interface GitWorktree {
  path: string;        // Absolute path to the worktree directory
  branch: string;      // Branch name checked out in this worktree
  commit: string;      // Git commit hash
  isMain: boolean;     // Whether this is the main worktree
  exists: boolean;     // Whether the worktree directory exists on disk
}
```

#### `CreateWorktreeOptions`

```typescript
interface CreateWorktreeOptions {
  path: string;          // Path where the new worktree should be created
  branch: string;        // Branch name for the new worktree
  createBranch?: boolean; // Whether to create a new branch (default: false)
  baseBranch?: string;   // Base branch/commit to create the new branch from
  force?: boolean;       // Force creation even if path exists
}
```

### Functions

All functions return a `Result<T>` type from `@openfarm/result` for proper error handling.

- `listWorktrees(repoPath, options?, gitExec?)` - List all worktrees
- `createWorktree(repoPath, options, gitExec?)` - Create a new worktree
- `removeWorktree(repoPath, worktreePath, force?, gitExec?)` - Remove a worktree
- `pruneWorktrees(repoPath, gitExec?)` - Prune stale worktree references
- `getCurrentWorktree(path, gitExec?)` - Get current worktree info

## Error Handling

All functions use the `Result<T>` pattern for error handling:

```typescript
const result = await listWorktrees('/path/to/repo');
if (result.ok) {
  // Success - use result.value
  console.log(result.value);
} else {
  // Error - use result.error
  console.error(result.error.message);
}
```

## License

MIT