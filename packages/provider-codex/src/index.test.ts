import { describe, expect, it } from "vitest";
import {
	getAvailableModes,
	getDefaultCodexSelection,
	parseCodexConfigToml,
	parseCodexModelsCache,
	resolveCodexExecutionArgs,
} from "./index";

describe("provider-codex", () => {
	it("parses codex models cache", () => {
		const raw = JSON.stringify({
			models: [
				{
					slug: "gpt-5.3-codex",
					display_name: "gpt-5.3-codex",
					description: "Latest coding model",
					default_reasoning_level: "medium",
					supported_reasoning_levels: [{ effort: "low" }, { effort: "medium" }],
					priority: 0,
					visibility: "list",
				},
			],
		});
		const models = parseCodexModelsCache(raw);
		expect(models).toHaveLength(1);
		expect(models[0]?.id).toBe("gpt-5.3-codex");
		expect(models[0]?.supportedReasoningEfforts).toEqual(["low", "medium"]);
	});

	it("parses codex config profiles from toml", () => {
		const raw = `
model = "gpt-5.3-codex"
model_reasoning_effort = "high"

[profiles.plan]
model = "gpt-5.2-codex"

[profiles.review]
model_reasoning_effort = "xhigh"
`;
		const config = parseCodexConfigToml(raw);
		expect(config.defaultModel).toBe("gpt-5.3-codex");
		expect(config.defaultReasoningEffort).toBe("high");
		expect(config.profiles.map((profile) => profile.id)).toEqual([
			"plan",
			"review",
		]);
	});

	it("builds codex modes with profiles and reasoning", () => {
		const config = parseCodexConfigToml(`
[profiles.plan]
model = "gpt-5.2-codex"
`);
		const models = parseCodexModelsCache(
			JSON.stringify({
				models: [
					{
						slug: "gpt-5.3-codex",
						supported_reasoning_levels: [
							{ effort: "medium" },
							{ effort: "high" },
						],
						visibility: "list",
					},
				],
			}),
		);

		const modes = getAvailableModes({
			configSnapshot: config,
			modelInfos: models,
		});
		expect(modes.some((mode) => mode.id === "plan")).toBe(true);
		expect(modes.some((mode) => mode.id === "reasoning:medium")).toBe(true);
		expect(modes.some((mode) => mode.id === "reasoning:high")).toBe(true);
	});

	it("resolves codex args for profile mode", () => {
		const args = resolveCodexExecutionArgs({
			model: "gpt-5.3-codex",
			mode: "plan",
			knownProfiles: ["plan", "review"],
		});

		expect(args).toEqual([
			"exec",
			"--json",
			"-s",
			"workspace-write",
			"--model",
			"gpt-5.3-codex",
			"--profile",
			"plan",
		]);
	});

	it("resolves codex args for reasoning mode", () => {
		const args = resolveCodexExecutionArgs({
			model: "gpt-5.3-codex",
			mode: "reasoning:xhigh",
		});

		expect(args).toEqual([
			"exec",
			"--json",
			"-s",
			"workspace-write",
			"--model",
			"gpt-5.3-codex",
			"-c",
			"model_reasoning_effort=xhigh",
		]);
	});

	it("chooses default mode from codex profile", () => {
		const config = parseCodexConfigToml(`
[profiles.default]
model = "gpt-5.2-codex"
`);
		const models = parseCodexModelsCache(
			JSON.stringify({
				models: [{ slug: "gpt-5.3-codex", visibility: "list" }],
			}),
		);
		const modes = getAvailableModes({
			configSnapshot: config,
			modelInfos: models,
		});
		const selection = getDefaultCodexSelection({
			configSnapshot: config,
			modelInfos: models,
			modes,
		});
		expect(selection.defaultMode).toBe("default");
	});
});
