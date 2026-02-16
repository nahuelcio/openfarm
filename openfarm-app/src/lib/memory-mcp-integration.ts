import type { McpServerConfig } from "./mcp-manager";
import { memoryAPI } from "./memory-api";

export interface MemoryMcpConfig {
  enabled: boolean;
  workspaceRoot: string;
  sharedBanks: string[];
}

export class MemoryMcpIntegration {
  private config: MemoryMcpConfig;
  private initialized = false;

  constructor(config: MemoryMcpConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    console.log("🧠 Initializing Memory MCP Integration...");
    
    // Ensure memory system is ready
    try {
      await memoryAPI.listMemoryBanks();
      this.initialized = true;
      console.log("✅ Memory MCP Integration initialized");
    } catch (error) {
      console.error("❌ Failed to initialize Memory MCP Integration:", error);
      throw error;
    }
  }

  async getTools(): Promise<any[]> {
    if (!this.initialized) {
      await this.initialize();
    }

    return [
      {
        name: "create_memory",
        description: "Create a new memory document",
        inputSchema: {
          type: "object",
          properties: {
            title: { type: "string", description: "Memory title" },
            content: { type: "string", description: "Memory content" },
            tags: { type: "array", items: { type: "string" }, description: "Memory tags" },
            bankId: { type: "string", description: "Target memory bank ID" },
          },
          required: ["title", "content"],
        },
      },
      {
        name: "read_memory",
        description: "Read a memory document by ID",
        inputSchema: {
          type: "object",
          properties: {
            id: { type: "string", description: "Memory document ID" },
          },
          required: ["id"],
        },
      },
      {
        name: "search_memories",
        description: "Search memory documents",
        inputSchema: {
          type: "object",
          properties: {
            query: { type: "string", description: "Search query" },
            bankIds: { type: "array", items: { type: "string" }, description: "Memory bank IDs to search in" },
            limit: { type: "number", description: "Maximum number of results" },
          },
          required: ["query"],
        },
      },
      {
        name: "list_memory_banks",
        description: "List available memory banks",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "attach_shared_bank",
        description: "Attach a shared memory bank",
        inputSchema: {
          type: "object",
          properties: {
            bankId: { type: "string", description: "Bank ID" },
            name: { type: "string", description: "Bank name" },
          },
          required: ["bankId", "name"],
        },
      },
      {
        name: "bind_workspace",
        description: "Bind workspace to shared memory banks",
        inputSchema: {
          type: "object",
          properties: {
            workspaceId: { type: "string", description: "Workspace ID" },
            rootPath: { type: "string", description: "Workspace root path" },
            sharedBankIds: { type: "array", items: { type: "string" }, description: "Shared bank IDs" },
          },
          required: ["workspaceId", "rootPath", "sharedBankIds"],
        },
      },
      {
        name: "get_workspace_bindings",
        description: "Get workspace memory bank bindings",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
    ];
  }

  async callTool(toolName: string, args: any): Promise<any> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      console.log(`🧠 Calling memory tool: ${toolName}`, args);

      switch (toolName) {
        case "create_memory":
          const memory = await memoryAPI.createMemory(args);
          return {
            content: [
              {
                type: "text",
                text: `Memory created successfully: ${memory.title} (ID: ${memory.id})`,
              },
            ],
          };

        case "read_memory":
          const readResult = await memoryAPI.readMemory(args.id);
          if (readResult) {
            return {
              content: [
                {
                  type: "text",
                  text: `Title: ${readResult.title}\n\nContent:\n${readResult.content}\n\nTags: ${readResult.tags.join(", ")}\nBank: ${readResult.bankId}\nUpdated: ${readResult.updatedAt}`,
                },
              ],
            };
          } else {
            return {
              content: [
                {
                  type: "text",
                  text: `Memory not found: ${args.id}`,
                },
              ],
            };
          }

        case "search_memories":
          const searchResults = await memoryAPI.searchMemories(args);
          const resultsText = searchResults
            .map(
              (mem) =>
                `- ${mem.title} (${mem.bankId}): ${mem.content.substring(0, 100)}${mem.content.length > 100 ? "..." : ""}`,
            )
            .join("\n");
          return {
            content: [
              {
                type: "text",
                text: `Found ${searchResults.length} memories:\n\n${resultsText || "No results"}`,
              },
            ],
          };

        case "list_memory_banks":
          const banks = await memoryAPI.listMemoryBanks();
          const banksText = banks
            .map((bank) => `- ${bank.name} (${bank.id}): ${bank.scope} - ${bank.enabled ? "enabled" : "disabled"}`)
            .join("\n");
          return {
            content: [
              {
                type: "text",
                text: `Available memory banks:\n\n${banksText}`,
              },
            ],
          };

        case "attach_shared_bank":
          const attachedBank = await memoryAPI.attachSharedBank(args.bankId, args.name);
          return {
            content: [
              {
                type: "text",
                text: `Shared bank attached: ${attachedBank.name} (${attachedBank.id})`,
              },
            ],
          };

        case "bind_workspace":
          await memoryAPI.bindWorkspace(args.workspaceId, args.rootPath, args.sharedBankIds);
          return {
            content: [
              {
                type: "text",
                text: `Workspace ${args.workspaceId} bound to shared banks: ${args.sharedBankIds.join(", ")}`,
              },
            ],
          };

        case "get_workspace_bindings":
          const bindings = await memoryAPI.getWorkspaceBindings();
          const bindingsText = bindings
            .map(
              (binding) =>
                `- ${binding.workspaceId}: ${binding.rootPath} -> [${binding.sharedBankIds.join(", ")}]`,
            )
            .join("\n");
          return {
            content: [
              {
                type: "text",
                text: `Workspace bindings:\n\n${bindingsText || "No bindings"}`,
              },
            ],
          };

        default:
          throw new Error(`Unknown memory tool: ${toolName}`);
      }
    } catch (error) {
      console.error(`❌ Memory tool ${toolName} failed:`, error);
      return {
        content: [
          {
            type: "text",
            text: `Error executing memory tool ${toolName}: ${error instanceof Error ? error.message : "Unknown error"}`,
          },
        ],
      };
    }
  }

  async cleanup(): Promise<void> {
    console.log("🧠 Cleaning up Memory MCP Integration...");
    this.initialized = false;
  }
}

// Factory function to create memory MCP server config
export function createMemoryMcpServerConfig(workspaceRoot: string): McpServerConfig {
  return {
    id: "memory-system",
    name: "Memory System",
    command: "bunx",
    args: ["tsx", `${workspaceRoot}/packages/memory-system/src/mcp/memory-server.ts`],
    env: {
      MEMORY_WORKSPACE_ROOT: workspaceRoot,
    },
    provider: "opencode" as any, // This will be overridden by the provider
    enabled: true,
  };
}
