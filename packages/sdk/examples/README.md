# OpenFarm SDK Examples

Examples of how to use the OpenFarm SDK with the new provider system.

## 📋 Prerequisites

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Build the SDK:**
   ```bash
   npm run build --workspace=@openfarm/sdk
   ```

3. **Install provider packages** (optional):
   ```bash
   npm install @openfarm/provider-opencode
   npm install @openfarm/provider-aider
   npm install @openfarm/provider-claude
   ```

4. **Configure credentials** (depending on provider):
   ```bash
   # For OpenCode
   export ANTHROPIC_API_KEY="your-api-key"
   export COPILOT_TOKEN="your-token"
   
   # For Aider
   pip install aider-chat
   
   # For Claude
   npm install -g @anthropic-ai/claude-code
   ```

## 🚀 Running Examples

### 1. Simple Demo (JavaScript)

The simplest example using the new provider system:

```bash
node packages/sdk/examples/simple-demo.mjs
```

**What it does:**
- ✅ Creates an OpenFarm instance
- ✅ Uses the new provider system
- ✅ Executes a simple task
- ✅ Displays formatted results

### 2. Full Example (TypeScript)

Complete example with multiple providers:

```bash
npx tsx packages/sdk/examples/opencode-cli-example.ts
```

**What it does:**
- ✅ Demonstrates provider switching
- ✅ Shows different execution modes
- ✅ Handles errors gracefully
- ✅ Uses provider metadata

## 📚 Code Examples

### Basic Example

```typescript
import { OpenFarm } from "@openfarm/sdk";

const openFarm = new OpenFarm({
  defaultProvider: 'direct-api',
  defaultModel: 'gpt-4o'
});

const result = await openFarm.execute({
  task: "Create a hello.txt file",
  workspace: './my-project'
});

console.log(result.success); // true/false
console.log(result.output);  // Description of changes
console.log(result.tokens);  // Tokens used
```

### Provider Management

```typescript
// Get available providers
const providers = openFarm.getAvailableProviders();
console.log('Available providers:', providers);

// Switch providers
openFarm.setProvider('opencode');

// Get provider metadata
const metadata = openFarm.getProviderMetadata('opencode');
console.log('Provider capabilities:', metadata.supportedFeatures);
```

### Performance Optimization

```typescript
// Preload providers for better performance
await openFarm.preloadProvider('opencode');

// Get registry statistics
const stats = openFarm.getRegistryStats();
console.log(`Loaded: ${stats.loadedProviders}, Cached: ${stats.cachedProviders}`);
```

### Testing with Mocks

```typescript
import { ProviderTestUtils } from '@openfarm/sdk';

// Create isolated test environment
const registry = ProviderTestUtils.createIsolatedRegistry();

// Register mock provider
const mockProvider = ProviderTestUtils.createMockProvider({
  type: 'test-provider',
  executionResult: {
    success: true,
    output: 'Mock result',
    duration: 100
  }
});

ProviderTestUtils.registerMockProvider(registry, 'test-provider');
```

## 🧪 Running Tests

Run the provider system tests:

```bash
npm test --workspace=@openfarm/sdk
```

## 🐛 Troubleshooting

### "Provider 'X' is not available"

- Check if the provider package is installed:
  ```bash
  npm list @openfarm/provider-opencode
  ```
- Install missing providers:
  ```bash
  npm install @openfarm/provider-opencode
  ```

### "Provider 'X' is lazy-loaded and must be created with createProviderAsync()"

- Use the async method for lazy-loaded providers:
  ```typescript
  const provider = await openFarm.providerRegistry.createProviderAsync('opencode');
  ```

### Provider-specific issues

- **OpenCode**: Verify CLI credentials are configured
- **Aider**: Ensure `aider` command is available (`pip install aider-chat`)
- **Claude**: Ensure Claude CLI is installed (`npm install -g @anthropic-ai/claude-code`)

## 📖 API Reference

### `OpenFarm`

**Constructor:**
```typescript
new OpenFarm(config?: OpenFarmConfig)
```

**Config:**
- `defaultProvider`: string (default: `"direct-api"`)
- `defaultModel`: string (optional)
- `timeout`: number in ms (optional)
- `retries`: number (optional)

**Methods:**

#### `execute(options: ExecutionOptions): Promise<ExecutionResult>`

Execute a task with the specified or default provider.

**Options:**
- `task`: string (required) - Task description
- `provider`: string (optional) - Provider to use
- `model`: string (optional) - Model to use
- `workspace`: string (optional) - Working directory
- `verbose`: boolean (optional) - Enable detailed logging
- `onLog`: function (optional) - Custom logging function

**Returns:**
- `success`: boolean - Whether execution was successful
- `output`: string - Description of changes/output
- `duration`: number - Execution duration in ms
- `tokens`: number - Tokens used (if available)
- `error`: string (optional) - Error message if failed

#### `getAvailableProviders(): string[]`

Get list of all available providers.

#### `getProviderMetadata(name: string): ProviderMetadata | undefined`

Get metadata for a specific provider.

#### `setProvider(provider: string): void`

Set the current provider.

#### `testConnection(): Promise<boolean>`

Test connection with the current provider.

## 🏗️ Architecture

The new provider system offers:

- **Modular Design**: Each provider is a separate package
- **Lazy Loading**: Providers are loaded only when needed
- **Caching**: Provider instances are cached for performance
- **Auto-Discovery**: External providers are automatically discovered
- **Testing Support**: Comprehensive mocking and testing utilities
- **Backward Compatibility**: Smooth migration from old executor system

## 🔥 Tips

1. **Start with direct-api**: It's built-in and works out of the box
2. **Install providers as needed**: Only install the providers you actually use
3. **Use preloading**: Preload providers you use frequently for better performance
4. **Leverage caching**: Provider instances are cached automatically
5. **Test with mocks**: Use the testing utilities for reliable unit tests

## 📝 License

MIT
