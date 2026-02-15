import { describe, expect, it } from "vitest";
import { getCatalogEntries, getCatalogEntry, mcpCatalog } from "../index";

describe("MCP Catalog", () => {
	it("should have 6 MCPs in catalog", () => {
		const entries = getCatalogEntries();
		expect(entries).toHaveLength(6);
	});

	it("should have valid catalog structure", () => {
		expect(mcpCatalog.version).toBe("1.0.0");
		expect(mcpCatalog.mcps).toBeDefined();
		expect(Array.isArray(mcpCatalog.mcps)).toBe(true);
	});

	it("should have all required MCPs", () => {
		const entries = getCatalogEntries();
		const ids = entries.map((e) => e.id);

		expect(ids).toContain("context7");
		expect(ids).toContain("figma");
		expect(ids).toContain("github");
		expect(ids).toContain("linear");
		expect(ids).toContain("notion");
		expect(ids).toContain("playwright");
	});

	it("should return undefined for unknown MCP", () => {
		const entry = getCatalogEntry("unknown-mcp");
		expect(entry).toBeUndefined();
	});

	it("should return correct MCP by ID", () => {
		const entry = getCatalogEntry("github");
		expect(entry).toBeDefined();
		expect(entry?.name).toBe("GitHub");
		expect(entry?.npmPackage).toBe("@modelcontextprotocol/server-github");
	});

	it("should have required fields for all MCPs", () => {
		const entries = getCatalogEntries();

		entries.forEach((entry) => {
			expect(entry.id).toBeDefined();
			expect(entry.name).toBeDefined();
			expect(entry.description).toBeDefined();
			expect(entry.icon).toBeDefined();
			expect(entry.npmPackage).toBeDefined();
			expect(entry.category).toBeDefined();
			expect(entry.defaultArgs).toBeDefined();
			expect(entry.defaultEnv).toBeDefined();
			expect(entry.configSchema).toBeDefined();
		});
	});
});
