import { beforeEach, describe, expect, it } from "vitest";
import { McpInstaller } from "../services/installer";

describe("McpInstaller", () => {
	let installer: McpInstaller;

	beforeEach(() => {
		installer = new McpInstaller();
		installer.setDryRun(true);
	});

	it("should install MCP from catalog", async () => {
		const result = await installer.install("github");

		expect(result.success).toBe(true);
		expect(result.installedMcp).toBeDefined();
		expect(result.installedMcp?.catalogEntryId).toBe("github");
		expect(result.installedMcp?.command).toContain("github");
	});

	it("should fail for unknown MCP", async () => {
		const result = await installer.install("unknown-mcp");

		expect(result.success).toBe(false);
		expect(result.error).toContain("not found");
	});

	it("should fail if already installed", async () => {
		await installer.install("github");
		const result = await installer.install("github");

		expect(result.success).toBe(false);
		expect(result.error).toContain("already installed");
	});

	it("should track installed MCPs", async () => {
		await installer.install("github");
		await installer.install("figma");

		expect(installer.isInstalled("github")).toBe(true);
		expect(installer.isInstalled("figma")).toBe(true);
		expect(installer.isInstalled("notion")).toBe(false);
	});

	it("should list all installed MCPs", async () => {
		await installer.install("github");
		await installer.install("figma");

		const list = installer.listInstalled();

		expect(list).toHaveLength(2);
		expect(list.map((m) => m.catalogEntryId)).toContain("github");
		expect(list.map((m) => m.catalogEntryId)).toContain("figma");
	});

	it("should get specific installed MCP", async () => {
		await installer.install("github");

		const mcp = installer.getInstalled("github");

		expect(mcp).toBeDefined();
		expect(mcp?.catalogEntryId).toBe("github");
	});

	it("should uninstall MCP", async () => {
		await installer.install("github");

		const result = await installer.uninstall("github");

		expect(result.success).toBe(true);
		expect(installer.isInstalled("github")).toBe(false);
	});

	it("should fail uninstalling non-installed MCP", async () => {
		const result = await installer.uninstall("github");

		expect(result.success).toBe(false);
		expect(result.error).toContain("not installed");
	});

	it("should set correct command for npm packages", async () => {
		const result = await installer.install("github");

		expect(result.installedMcp?.command).toBe(
			"npx -y @modelcontextprotocol/server-github",
		);
	});
});
