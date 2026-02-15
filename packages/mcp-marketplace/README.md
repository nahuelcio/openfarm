# @openfarm/mcp-marketplace

MCP Marketplace for OpenFarm - Discover, install, and manage Model Context Protocol servers.

## Installation

```bash
npm install @openfarm/mcp-marketplace
# or
bun add @openfarm/mcp-marketplace
```

## Usage

```typescript
import { mcpManager, getCatalogEntries, McpInstaller } from "@openfarm/mcp-marketplace";

// List available MCPs
const available = mcpManager.listAvailable();
console.log(available);

// Search MCPs
const results = mcpManager.searchAvailable("github");
console.log(results);

// Install an MCP (dry-run mode for testing)
const installer = new McpInstaller();
installer.setDryRun(true); // Don't actually run npm install
const result = await installer.install("github");

if (result.success) {
  console.log("Installed:", result.installedMcp);
}

// Get installed MCPs
const installed = mcpManager.listInstalled();

// Uninstall
await mcpManager.uninstall("github");
```

## API

### McpManager

- `listAvailable()` - Get all MCPs from catalog
- `listInstalled()` - Get installed MCPs
- `isInstalled(id)` - Check if MCP is installed
- `getInstalled(id)` - Get specific installed MCP
- `install(id)` - Install an MCP
- `uninstall(id)` - Uninstall an MCP
- `updateConfig(id, config)` - Update MCP configuration
- `searchAvailable(query)` - Search MCPs by name/description
- `getByCategory(category)` - Filter MCPs by category
- `getCategories()` - Get all available categories

### McpInstaller

- `install(id)` - Install MCP and run npm install
- `uninstall(id)` - Uninstall MCP
- `isInstalled(id)` - Check if installed
- `getInstalled(id)` - Get installed MCP
- `listInstalled()` - List all installed
- `setDryRun(enabled)` - Enable/disable dry-run mode

## Catalog

The package includes a built-in catalog with these MCPs:

| ID | Name | Category | NPM Package |
|----|------|----------|-------------|
| context7 | Context7 | dev-tools | @upstash/context7-mcp |
| figma | Figma | design | @modelcontextprotocol/server-figma |
| github | GitHub | dev-tools | @modelcontextprotocol/server-github |
| linear | Linear | productivity | @modelcontextprotocol/server-linear |
| notion | Notion | productivity | @notionhq/notion-mcp |
| playwright | Playwright | testing | @modelcontextprotocol/server-playwright |

## Types

```typescript
interface McpCatalogEntry {
  id: string;
  name: string;
  description: string;
  icon: string;
  npmPackage: string;
  category: string;
  defaultArgs: string[];
  defaultEnv: Record<string, string>;
  configSchema: McpConfigSchema;
  verified?: boolean;
  docsUrl?: string;
}

interface InstalledMcp {
  id: string;
  catalogEntryId: string;
  displayName?: string;
  command: string;
  args: string[];
  env: Record<string, string>;
  enabled: boolean;
  installedAt: string;
  configOverrides: Record<string, unknown>;
}
```

## License

MIT
