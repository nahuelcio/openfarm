import { beforeEach, describe, expect, it } from "vitest";
import { McpManager } from "../services/manager";

describe("MCP Marketplace E2E", () => {
	let manager: McpManager;

	beforeEach(() => {
		manager = new McpManager();
		manager.setDryRun(true);
	});

	it("complete flow: search -> install -> verify -> uninstall", async () => {
		// Step 1: Search available MCPs
		const available = manager.listAvailable();
		expect(available.length).toBeGreaterThan(0);

		const githubResults = manager.searchAvailable("github");
		expect(githubResults).toHaveLength(1);
		expect(githubResults[0]?.id).toBe("github");

		// Step 2: Install MCP
		const installResult = await manager.install("github");
		expect(installResult.success).toBe(true);
		expect(installResult.installedMcp).toBeDefined();
		expect(installResult.installedMcp?.catalogEntryId).toBe("github");

		// Step 3: Verify installed
		expect(manager.isInstalled("github")).toBe(true);

		const installed = manager.getInstalled("github");
		expect(installed).toBeDefined();
		expect(installed?.enabled).toBe(true);
		expect(installed?.command).toContain("github");

		// Step 4: Update config
		const updateResult = await manager.updateConfig("github", {
			enabled: false,
		});
		expect(updateResult.success).toBe(true);

		const updated = manager.getInstalled("github");
		expect(updated?.enabled).toBe(false);

		// Step 5: Uninstall
		const uninstallResult = await manager.uninstall("github");
		expect(uninstallResult.success).toBe(true);
		expect(manager.isInstalled("github")).toBe(false);
	});

	it("should handle duplicate installation gracefully", async () => {
		await manager.install("github");

		const duplicateResult = await manager.install("github");
		expect(duplicateResult.success).toBe(false);
		expect(duplicateResult.error).toContain("already installed");
	});

	it("should handle uninstall of non-existent MCP", async () => {
		const result = await manager.uninstall("github");
		expect(result.success).toBe(false);
	});

	it("should filter by category correctly", () => {
		const devTools = manager.getByCategory("dev-tools");
		expect(devTools).toHaveLength(2);
		expect(devTools.map((m) => m.id)).toContain("github");
		expect(devTools.map((m) => m.id)).toContain("context7");

		const productivity = manager.getByCategory("productivity");
		expect(productivity).toHaveLength(2);
		expect(productivity.map((m) => m.id)).toContain("linear");
		expect(productivity.map((m) => m.id)).toContain("notion");
	});

	it("should return unique categories", () => {
		const categories = manager.getCategories();

		expect(categories).toContain("dev-tools");
		expect(categories).toContain("productivity");
		expect(categories).toContain("design");
		expect(categories).toContain("testing");
	});

	it("should install multiple MCPs and list them", async () => {
		await manager.install("github");
		await manager.install("figma");
		await manager.install("playwright");

		const installed = manager.listInstalled();
		expect(installed).toHaveLength(3);

		const ids = installed.map((m) => m.catalogEntryId);
		expect(ids).toContain("github");
		expect(ids).toContain("figma");
		expect(ids).toContain("playwright");
	});

	it("should provide correct command for different npm packages", async () => {
		const githubResult = await manager.install("github");
		expect(githubResult.installedMcp?.command).toBe(
			"npx -y @modelcontextprotocol/server-github",
		);

		await manager.uninstall("github");

		const figmaResult = await manager.install("figma");
		expect(figmaResult.installedMcp?.command).toBe(
			"npx -y @modelcontextprotocol/server-figma",
		);
	});
});
