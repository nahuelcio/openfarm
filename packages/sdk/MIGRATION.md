# Migration Guide: Executors to Provider System

This guide helps you migrate from the old executor system to the new provider architecture in OpenFarm SDK.

## Overview

The new provider system offers:
- **Better Performance**: Lazy loading and caching
- **Improved Architecture**: Modular, extensible design
- **Enhanced Testing**: Comprehensive mock support
- **Auto-Discovery**: Automatic provider detection
- **Backward Compatibility**: Existing APIs still work

## Quick Migration

### Before (Old Executor System)

```typescript
import { createExecutor } from '@openfarm/sdk';

// Create executor
const executor = createExecutor('opencode', {
  mode: 'local',
  timeout: 120000
});

// Execute task
const result = await executor.execute({
  task: 'Create a React component',
  model: 'gpt-4o'
});
```

### After (New Provider System)

```typescript
import { OpenFarm } from '@openfarm/sdk';

// Create OpenFarm instance
const openFarm = new OpenFarm({
  defaultProvider: 'opencode',
  timeout: 120000
});

// Execute task (same API!)
const result = await openFarm.execute({
  task: 'Create a React component',
  model: 'gpt-4o'
});
```

## Detailed Migration Steps

### 1. Update Imports

```typescript
// Old
import { 
  createExecutor,
  OpenCodeExecutor,
  AiderExecutor,
  ClaudeCodeExecutor 
} from '@openfarm/sdk';

// New
import { OpenFarm } from '@openfarm/sdk';
```

### 2. Install Provider Packages

External providers are now separate packages:

```bash
# Install specific providers you need
npm install @openfarm/provider-opencode
npm install @openfarm/provider-aider
npm install @openfarm/provider-claude
```

### 3. Update Initialization

```typescript
// Old - Direct executor creation
const openCodeExecutor = new OpenCodeExecutor({
  mode: 'local',
  timeout: 120000
});

const aiderExecutor = new AiderExecutor({
  workingDirectory: './project'
});

// New - Single OpenFarm instance
const openFarm = new OpenFarm({
  defaultProvider: 'opencode',
  timeout: 120000
});

// Switch providers dynamically
openFarm.setProvider('aider');
```

### 4. Update Execution Calls

The execution API remains the same, but now supports provider switching:

```typescript
// Old - Fixed executor
const result1 = await openCodeExecutor.execute({
  task: 'Fix the bug',
  model: 'gpt-4o'
});

const result2 = await aiderExecutor.execute({
  task: 'Add tests'
});

// New - Dynamic provider switching
const result1 = await openFarm.execute({
  task: 'Fix the bug',
  provider: 'opencode',  // Override default
  model: 'gpt-4o'
});

const result2 = await openFarm.execute({
  task: 'Add tests',
  provider: 'aider'      // Switch provider per task
});
```

### 5. Update Configuration

```typescript
// Old - Per-executor configuration
const executor = createExecutor('opencode', {
  mode: 'local',
  baseUrl: 'https://api.example.com',
  apiKey: process.env.API_KEY,
  timeout: 60000
});

// New - Centralized configuration
const openFarm = new OpenFarm({
  defaultProvider: 'opencode',
  defaultModel: 'gpt-4o',
  timeout: 60000,
  // Provider-specific config is handled automatically
});
```

## Provider-Specific Migrations

### OpenCode Provider

```typescript
// Old
import { OpenCodeExecutor } from '@openfarm/sdk';

const executor = new OpenCodeExecutor({
  mode: 'local',        // or 'cloud'
  baseUrl: 'https://...',
  timeout: 120000
});

// New
import { OpenFarm } from '@openfarm/sdk';
// npm install @openfarm/provider-opencode

const openFarm = new OpenFarm({
  defaultProvider: 'opencode'
});

// Mode and baseUrl are configured automatically
// or via provider-specific configuration
```

### Aider Provider

```typescript
// Old
import { AiderExecutor } from '@openfarm/sdk';

const executor = new AiderExecutor({
  workingDirectory: './project',
  aiderPath: '/usr/local/bin/aider'
});

// New
import { OpenFarm } from '@openfarm/sdk';
// npm install @openfarm/provider-aider

const openFarm = new OpenFarm({
  defaultProvider: 'aider'
});

// Working directory is passed per execution
await openFarm.execute({
  task: 'Add feature',
  workspace: './project'
});
```

### Claude Provider

```typescript
// Old
import { ClaudeCodeExecutor } from '@openfarm/sdk';

const executor = new ClaudeCodeExecutor({
  apiKey: process.env.ANTHROPIC_API_KEY,
  model: 'claude-3-5-sonnet-20241022'
});

// New
import { OpenFarm } from '@openfarm/sdk';
// npm install @openfarm/provider-claude

const openFarm = new OpenFarm({
  defaultProvider: 'claude',
  defaultModel: 'claude-3-5-sonnet-20241022'
});

// API key is read from environment automatically
```

## Advanced Features

### Provider Discovery

```typescript
// Check available providers
const providers = openFarm.getAvailableProviders();
console.log('Available:', providers);

// Get provider metadata
const metadata = openFarm.getProviderMetadata('opencode');
console.log('Features:', metadata.supportedFeatures);
```

### Performance Optimization

```typescript
// Preload providers for better performance
await openFarm.preloadProvider('opencode');
await openFarm.preloadAllProviders();

// Check registry statistics
const stats = openFarm.getRegistryStats();
console.log(`Loaded: ${stats.loadedProviders}/${stats.totalProviders}`);
```

### Testing

```typescript
// Old - Manual mocking
const mockExecutor = {
  execute: jest.fn().mockResolvedValue({
    success: true,
    output: 'Mock result'
  })
};

// New - Built-in test utilities
import { ProviderTestUtils } from '@openfarm/sdk';

const registry = ProviderTestUtils.createIsolatedRegistry();
const mockProvider = ProviderTestUtils.createMockProvider({
  type: 'test-provider',
  executionResult: { success: true, output: 'Mock result' }
});

ProviderTestUtils.registerMockProvider(registry, 'test-provider');
```

## Breaking Changes

### Removed APIs

These APIs are no longer available:

```typescript
// ❌ Removed
import { createExecutor } from '@openfarm/sdk';
import { ExecutorFactory } from '@openfarm/sdk';

// ✅ Use instead
import { OpenFarm } from '@openfarm/sdk';
```

### Changed Behavior

1. **Provider Loading**: Providers are now lazy-loaded and cached
2. **Configuration**: Provider-specific config is handled by each provider
3. **Error Handling**: More consistent error messages and types
4. **Logging**: Improved structured logging with `onLog` callback

## Troubleshooting

### Provider Not Found

```
Error: Provider 'opencode' is not available
```

**Solution**: Install the provider package:
```bash
npm install @openfarm/provider-opencode
```

### Configuration Issues

```
Error: Invalid configuration for provider 'aider'
```

**Solution**: Check provider-specific documentation and ensure required environment variables are set.

### Performance Issues

**Solution**: Use preloading for frequently used providers:
```typescript
await openFarm.preloadProvider('opencode');
```

## Rollback Plan

If you need to rollback temporarily:

1. **Keep old imports**: The old executor classes still exist (deprecated)
2. **Gradual migration**: Migrate one provider at a time
3. **Feature flags**: Use environment variables to switch between old/new systems

```typescript
// Temporary rollback approach
const useNewSystem = process.env.USE_NEW_PROVIDERS === 'true';

if (useNewSystem) {
  const openFarm = new OpenFarm({ defaultProvider: 'opencode' });
  return openFarm.execute(options);
} else {
  const executor = new OpenCodeExecutor(config);
  return executor.execute(options);
}
```

## Support

- **Documentation**: Check `packages/sdk/README.md`
- **Examples**: See `packages/sdk/examples/`
- **Issues**: Report problems on GitHub
- **Migration Help**: Create a discussion for migration questions

The new provider system is designed to be a drop-in replacement with enhanced capabilities. Most migrations should be straightforward with minimal code changes.