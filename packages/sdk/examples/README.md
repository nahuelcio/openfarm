# OpenCode SDK Examples

Examples of how to use the OpenCode SDK with **standalone** CLI mode (no server required).

## 📋 Prerequisites

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Build the SDK:**
   ```bash
   npm run build --workspace=@openfarm/sdk
   ```

3. **Configure credentials** (at least one):
   ```bash
   export ANTHROPIC_API_KEY="your-api-key"
   # OR
   export COPILOT_TOKEN="your-token"
   # OR
   export OPENROUTER_API_KEY="your-api-key"
   # OR
   export ZAI_API_KEY="your-api-key"
   ```

**Note:** No server required! The `local` mode runs the CLI standalone.

## 🚀 Running Examples

### 1. Simple Demo (JavaScript)

The simplest example - just executes a single task:

```bash
node packages/sdk/examples/simple-demo.mjs
```

**What it does:**
- ✅ Creates an executor in standalone mode
- ✅ Executes a simple task (create a file)
- ✅ Displays formatted results

### 2. Full Example (TypeScript)

Complete example with multiple tasks:

```bash
npx tsx packages/sdk/examples/opencode-cli-example.ts
```

**What it does:**
- ✅ Creates an executor instance
- ✅ Executes a simple task (create file)
- ✅ Executes a code task (TypeScript)
- ✅ Shows cloud mode configuration example

## 📚 Code Examples

### Basic Example

```typescript
import { OpenCodeExecutor } from "@openfarm/sdk";

const executor = new OpenCodeExecutor({ mode: "local" });

const result = await executor.execute({
  task: "Create a hello.txt file",
  model: "github-copilot/gpt-5-mini"
});

console.log(result.success); // true/false
console.log(result.output);  // Description of changes
console.log(result.tokens);  // Tokens used
```

### Example with Custom Timeout

```typescript
const executor = new OpenCodeExecutor({
  mode: "local",
  timeout: 30_000 // 30 seconds
});
```

### Cloud Mode Example

```typescript
const executor = new OpenCodeExecutor({
  mode: "cloud",
  baseUrl: "https://api.opencode.dev",
  password: "my-password"
});
```

## 🧪 Running Tests

Run the E2E tests:

```bash
npm test --workspace=@openfarm/sdk -- opencode.test.ts
```

## 🐛 Troubleshooting

### "Process exited with code 1" or credential errors

- Verify you have at least one environment variable configured:
  ```bash
  echo $ANTHROPIC_API_KEY
  echo $COPILOT_TOKEN
  ```
- Configure the one you need:
  ```bash
  export ANTHROPIC_API_KEY="your-key-here"
  ```

### "Process exited with code 1"

- Verify you have credentials configured
- Check the CLI error output for more details

### "Timeout after Xms"

- Increase the timeout in the configuration
- Simplify the task

## 📖 API Reference

### `OpenCodeExecutor`

**Constructor:**
```typescript
new OpenCodeExecutor(config?: OpenCodeConfig)
```

**Config:**
- `mode`: `"local"` | `"cloud"` (default: `"local"`)
- `timeout`: number in ms (default: 600000 = 10 min)
- `baseUrl`: string (required if mode = `"cloud"`)
- `password`: string (optional, for authentication)

**Methods:**

#### `execute(options: ExecutionOptions): Promise<ExecutionResult>`

Execute a task with OpenCode.

**Options:**
- `task`: string (required) - Task description
- `model`: string (optional) - Model to use (e.g., `"github-copilot/gpt-5-mini"`)
- `context`: string (optional) - Additional context
- `provider`: string (optional) - Provider override

**Returns:**
- `success`: boolean - Whether execution was successful
- `output`: string - Description of changes/output
- `duration`: number - Execution duration in ms
- `tokens`: number - Tokens used
- `error`: string (optional) - Error message if failed

#### `testConnection(): Promise<boolean>`

Checks if the OpenCode CLI is available (always returns true in local mode).

## 🔥 Tips

1. **Use small models for testing**: `github-copilot/gpt-5-mini` is faster and cheaper
2. **Be specific**: Describe exactly what you want the task to do
3. **Generous timeouts**: Complex tasks can take several minutes
4. **Verify credentials**: The CLI needs access to at least one provider

## 📝 License

MIT
