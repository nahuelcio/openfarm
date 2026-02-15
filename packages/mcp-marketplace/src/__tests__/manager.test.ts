import { beforeEach, describe, expect, it } from "vitest";
import { McpManager } from "../services/manager";

describe("McpManager", () => {
	let manager: McpManager;

	beforeEach(() => {
		manager = new McpManager();
		manager.setDryRun(true);
	});

	describe("listAvailable", () => {
		it("should list all available MCPs", () => {
			const available = manager.listAvailable();

			expect(available).toHaveLength(6);
		});

		it("should have all required fields", () => {
			const available = manager.listAvailable();

			available.forEach((mcp) => {
				expect(mcp.id).toBeDefined();
				expect(mcp.name).toBeDefined();
				expect(mcp.description).toBeDefined();
				expect(mcp.npmPackage).toBeDefined();
				expect(mcp.category).toBeDefined();
			});
		});
	});

	describe("searchAvailable", () => {
		it("should search by name", () => {
			const results = manager.searchAvailable("github");

			expect(results).toHaveLength(1);
			expect(results[0]?.id).toBe("github");
		});

		it("should search by description", () => {
			const results = manager.searchAvailable("issues");

			expect(results).toHaveLength(1);
			expect(results[0]?.id).toBe("github");
		});

		it("should search by category", () => {
			const results = manager.searchAvailable("productivity");

			expect(results).toHaveLength(2);
			expect(results.map((r) => r.id)).toContain("linear");
			expect(results.map((r) => r.id)).toContain("notion");
		});

		it("should return empty for unknown query", () => {
			const results = manager.searchAvailable("xyz123");

			expect(results).toHaveLength(0);
		});
	});

	describe("getByCategory", () => {
		it("should filter by category", () => {
			const results = manager.getByCategory("dev-tools");

			expect(results).toHaveLength(2);
			expect(results.map((r) => r.id)).toContain("github");
			expect(results.map((r) => r.id)).toContain("context7");
		});
	});

	describe("getCategories", () => {
		it("should return unique categories", () => {
			const categories = manager.getCategories();

			expect(categories).toContain("dev-tools");
			expect(categories).toContain("productivity");
			expect(categories).toContain("design");
			expect(categories).toContain("testing");
		});
	});

	describe("installation flow", () => {
		it("should install and track MCP", async () => {
			const installResult = await manager.install("github");

			expect(installResult.success).toBe(true);
			expect(manager.isInstalled("github")).toBe(true);
		});

		it("should list installed MCPs", async () => {
			await manager.install("github");
			await manager.install("figma");

			const installed = manager.listInstalled();

			expect(installed).toHaveLength(2);
		});

		it("should get specific installed MCP", async () => {
			await manager.install("github");

			const mcp = manager.getInstalled("github");

			expect(mcp).toBeDefined();
			expect(mcp?.catalogEntryId).toBe("github");
		});

		it("should update MCP config", async () => {
			await manager.install("github");

			const updateResult = await manager.updateConfig("github", {
				enabled: false,
			});

			expect(updateResult.success).toBe(true);

			const mcp = manager.getInstalled("github");
			expect(mcp?.enabled).toBe(false);
		});

		it("should fail updating non-installed MCP", async () => {
			const result = await manager.updateConfig("github", {
				enabled: false,
			});

			expect(result.success).toBe(false);
		});

		it("should uninstall MCP", async () => {
			await manager.install("github");

			const result = await manager.uninstall("github");

			expect(result.success).toBe(true);
			expect(manager.isInstalled("github")).toBe(false);
		});
	});
});
