import { beforeEach, describe, expect, it, vi } from "vitest";

const spawnSyncMock = vi.fn();

vi.mock("node:child_process", () => ({
	spawnSync: (...args: unknown[]) => spawnSyncMock(...args),
	spawn: vi.fn(),
	execFile: vi.fn(),
	exec: vi.fn(),
	execSync: vi.fn(),
	execFileSync: vi.fn(),
}));

describe("provider-opencode getAvailableModels", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		process.env.OPENCODE_COMMAND = undefined;
	});

	it("returns dynamic model list from opencode command", async () => {
		spawnSyncMock.mockReturnValue({
			status: 0,
			stdout: [
				"opencode/gpt-5-nano",
				"openrouter/openai/gpt-5",
				"zai/glm-4.7",
				"",
			].join("\n"),
		});

		const mod = await import("./models");
		const models = mod.getAvailableModels();

		expect(models).toEqual([
			"opencode/gpt-5-nano",
			"openrouter/openai/gpt-5",
			"zai/glm-4.7",
		]);
		expect(spawnSyncMock).toHaveBeenCalledWith("opencode", ["models"], {
			encoding: "utf8",
			timeout: 8000,
			stdio: ["ignore", "pipe", "ignore"],
		});
	});

	it("parses models with and without provider prefix", async () => {
		spawnSyncMock.mockReturnValue({
			status: 0,
			stdout: [
				"opencode/gpt-5-nano",
				"gpt-4o", // no prefix
				"gpt-5-mini", // no prefix
				"github-copilot/gpt-4o",
				"openrouter/anthropic/claude-3.7-sonnet",
				"zai/glm-4.7",
				"",
			].join("\n"),
		});

		const mod = await import("./models");
		const models = mod.getAvailableModels();

		expect(models).toContain("opencode/gpt-5-nano");
		expect(models).toContain("gpt-4o");
		expect(models).toContain("gpt-5-mini");
		expect(models).toContain("github-copilot/gpt-4o");
		expect(models).toContain("openrouter/anthropic/claude-3.7-sonnet");
		expect(models).toContain("zai/glm-4.7");
		expect(models.length).toBe(6);
	});

	it("falls back to static list when all commands fail", async () => {
		spawnSyncMock.mockReturnValue({
			status: 1,
			stdout: "",
		});

		const mod = await import("./models");
		const models = mod.getAvailableModels();

		expect(models).toContain("opencode/gpt-5-nano");
		expect(models).toContain("zai/glm-4.7");
		expect(models.length).toBeGreaterThan(1);
	});

	it("uses bunx invocation when OPENCODE_COMMAND is bunx", async () => {
		process.env.OPENCODE_COMMAND = "bunx";
		spawnSyncMock.mockReturnValue({
			status: 0,
			stdout: "opencode/glm-4.7-free\n",
		});

		const mod = await import("./models");
		const models = mod.getAvailableModels();

		expect(models).toEqual(["opencode/glm-4.7-free"]);
		expect(spawnSyncMock).toHaveBeenCalledWith(
			"bunx",
			["opencode-ai", "models"],
			{
				encoding: "utf8",
				timeout: 8000,
				stdio: ["ignore", "pipe", "ignore"],
			},
		);
	});
});
