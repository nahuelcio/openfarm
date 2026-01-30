# @openfarm/sdk

The OpenFarm SDK provides a unified interface for AI-powered code execution across multiple providers.

## Installation

```bash
npm install @openfarm/sdk
```

## Quick Start

```typescript
import { OpenFarm } from '@openfarm/sdk';

const openFarm = new OpenFarm({
  defaultProvider: 'direct-api',
  defaultModel: 'gpt-4o'
});

const result = await openFarm.execute({
  task: 'Create a simple React component for a todo list',
  workspace: './my-project'
});

console.log(result.output);
```

## Provider System

OpenFarm uses a modular provider system that supports multiple AI coding assistants:

### Built-in Providers

- **direct-api**: Direct API integration for simple HTTP-based AI services
- **opencode**: OpenCode AI assistant (requires `@openfarm/provider-opencode`)
- **aider**: Aider AI pair programming (requires `@openfarm/provider-aider`)
- **claude**: Claude Code assistant (requires `@openfarm/provider-claude`)

### Using External Providers

External providers are automatically discovered and lazy-loaded:

```bash
# Install additional providers
npm install @openfarm/provider-opencode
npm install @openfarm/provider-aider
npm install @openfarm/provider-claude
```

```typescript
// They're automatically available
const providers = openFarm.getAvailableProviders();
console.log(providers); // ['direct-api', 'opencode', 'aider', 'claude']

// Switch providers dynamically
openFarm.setProvider('opencode');
await openFarm.execute({ task: 'Fix the authentication bug' });
```

## Configuration

```typescript
const openFarm = new OpenFarm({
  defaultProvider: 'opencode',
  defaultModel: 'claude-3-5-sonnet-20241022',
  timeout: 600000,
  retries: 3
});
```

## Execution Options

```typescript
await openFarm.execute({
  task: 'Add error handling to the user service',
  workspace: '/path/to/project',
  provider: 'aider',           // Override default provider
  model: 'gpt-4o',            // Override default model
  verbose: true,              // Enable detailed logging
  temperature: 0.7,           // Control randomness
  maxTokens: 4000,           // Limit response length
  onLog: (msg) => console.log(msg)  // Custom logging
});
```

## Provider Management

### Get Available Providers

```typescript
const providers = openFarm.getAvailableProviders();
console.log(providers);
```

### Get Provider Metadata

```typescript
const metadata = openFarm.getProviderMetadata('opencode');
console.log(metadata.description);
console.log(metadata.supportedFeatures);
```

### Performance Optimization

```typescript
// Preload providers for better performance
await openFarm.preloadProvider('opencode');

// Or preload all providers
await openFarm.preloadAllProviders();

// Get registry statistics
const stats = openFarm.getRegistryStats();
console.log(`Loaded: ${stats.loadedProviders}, Cached: ${stats.cachedProviders}`);
```

## Testing

The SDK includes comprehensive testing utilities:

```typescript
import { ProviderTestUtils, MockProvider } from '@openfarm/sdk';

// Create isolated test environment
const registry = ProviderTestUtils.createIsolatedRegistry();

// Register mock providers
const mockProvider = ProviderTestUtils.createMockProvider({
  type: 'test-provider',
  executionResult: {
    success: true,
    output: 'Mock result',
    duration: 100
  }
});

ProviderTestUtils.registerMockProvider(registry, 'test-provider');

// Test your code with mocks
const openFarm = new OpenFarm({ defaultProvider: 'test-provider' });
const result = await openFarm.execute({ task: 'test task' });

// Assert results
ProviderTestUtils.assertProviderExecuted(mockProvider, { task: 'test task' });
```

## Architecture

The OpenFarm SDK uses a modular architecture:

- **Provider Registry**: Manages provider discovery and instantiation
- **Communication Strategies**: Reusable HTTP and CLI communication patterns
- **Response Parsers**: Handle different response formats (JSON, streaming, etc.)
- **Configuration Management**: Schema-based configuration validation
- **Lazy Loading**: Providers are loaded only when needed for performance

## Migration from Executors

If you're migrating from the old executor system:

```typescript
// Old way (deprecated)
import { createExecutor } from '@openfarm/sdk';
const executor = createExecutor('opencode');

// New way
import { OpenFarm } from '@openfarm/sdk';
const openFarm = new OpenFarm({ defaultProvider: 'opencode' });
```

The new provider system offers:
- Better performance with lazy loading and caching
- Improved error handling and logging
- Extensible architecture for custom providers
- Comprehensive testing utilities
- Automatic provider discovery

## Examples

See the [examples directory](./examples/) for complete usage examples.

## License

MIT