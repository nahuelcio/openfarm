import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import * as z from "zod/v4";
import { MemoryStore } from "../core/memory-store";

function resolveWorkspaceRoot(): string {
	const rootFromEnv =
		typeof process !== "undefined" ? process.env?.MEMORY_WORKSPACE_ROOT : "";
	if (rootFromEnv && rootFromEnv.trim().length > 0) {
		return rootFromEnv.trim();
	}
	return typeof process !== "undefined" ? process.cwd() : ".";
}

function asTextResult(value: unknown): {
	content: Array<{ type: "text"; text: string }>;
} {
	return {
		content: [
			{
				type: "text",
				text: JSON.stringify(value, null, 2),
			},
		],
	};
}

async function main(): Promise<void> {
	const workspaceRoot = resolveWorkspaceRoot();
	const store = new MemoryStore(workspaceRoot);
	await store.initialize();

	const server = new McpServer({
		name: "openfarm-memory-system",
		version: "0.1.0",
	});

	server.registerTool(
		"create_memory",
		{
			description: "Create a memory document in the selected memory bank",
			inputSchema: {
				title: z.string().min(1).describe("Memory title"),
				content: z.string().min(1).describe("Memory body"),
				tags: z.array(z.string()).optional().describe("Optional tags"),
				bankId: z.string().optional().describe("Target bank id"),
			},
		},
		async ({ title, content, tags, bankId }) => {
			const memory = await store.createMemory({ title, content, tags, bankId });
			return asTextResult(memory);
		},
	);

	server.registerTool(
		"read_memory",
		{
			description: "Read a memory by id",
			inputSchema: {
				id: z.string().min(1).describe("Memory id"),
			},
		},
		async ({ id }) => {
			return asTextResult(store.readMemory(id));
		},
	);

	server.registerTool(
		"search_memories",
		{
			description: "Search memories by text query",
			inputSchema: {
				query: z.string().min(1).describe("Search query"),
				bankIds: z
					.array(z.string())
					.optional()
					.describe("Optional bank ids filter"),
				limit: z.number().int().positive().optional().describe("Result limit"),
			},
		},
		async ({ query, bankIds, limit }) => {
			return asTextResult(store.searchMemories({ query, bankIds, limit }));
		},
	);

	server.registerTool(
		"list_memory_banks",
		{
			description: "List available memory banks",
			inputSchema: {},
		},
		async () => {
			return asTextResult(store.listBanks());
		},
	);

	server.registerTool(
		"attach_shared_bank",
		{
			description: "Attach a shared memory bank by id",
			inputSchema: {
				bankId: z.string().min(1).describe("Shared bank id"),
				name: z.string().min(1).describe("Shared bank display name"),
			},
		},
		async ({ bankId, name }) => {
			const bank = await store.attachSharedBank(bankId, name);
			return asTextResult(bank);
		},
	);

	server.registerTool(
		"bind_workspace",
		{
			description: "Bind workspace id to shared memory banks",
			inputSchema: {
				workspaceId: z.string().min(1).describe("Workspace id"),
				rootPath: z.string().min(1).describe("Workspace root path"),
				sharedBankIds: z
					.array(z.string())
					.describe("Shared bank ids for this workspace"),
			},
		},
		async ({ workspaceId, rootPath, sharedBankIds }) => {
			await store.bindWorkspace(workspaceId, rootPath, sharedBankIds);
			return asTextResult({ success: true });
		},
	);

	server.registerTool(
		"get_workspace_bindings",
		{
			description: "List workspace bindings to shared banks",
			inputSchema: {},
		},
		async () => {
			return asTextResult(store.getWorkspaceBindings());
		},
	);

	const transport = new StdioServerTransport();
	await server.connect(transport);

	if (typeof process !== "undefined") {
		const shutdown = () => {
			store.close();
			process.exit(0);
		};
		process.on("SIGINT", shutdown);
		process.on("SIGTERM", shutdown);
	}
}

main().catch((error) => {
	const message =
		error instanceof Error ? error.stack || error.message : String(error);
	if (typeof process !== "undefined") {
		process.stderr.write(`${message}\n`);
		process.exit(1);
	}
});
