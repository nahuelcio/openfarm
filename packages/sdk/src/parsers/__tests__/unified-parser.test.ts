import { describe, expect, it } from "vitest";
import {
	collectNumbersByKeys,
	collectStringsByKeys,
	COMMAND_KEYS,
	CREDIT_KEYS,
	FILE_PATH_KEYS,
	hasToolSignal,
	INPUT_TOKEN_KEYS,
	OUTPUT_TOKEN_KEYS,
	parseJsonRecord,
	parseProviderOutput,
	type RuntimeStatsAccumulator,
} from "../unified-parser";

describe("unified-parser", () => {
	it("parses JSON object lines and rejects non-JSON lines", () => {
		expect(parseJsonRecord('{"type":"text"}')).toEqual({ type: "text" });
		expect(parseJsonRecord("not-json")).toBeNull();
		expect(parseJsonRecord("[]")).toBeNull();
	});

	it("collects numeric values recursively by key", () => {
		const sink: number[] = [];
		collectNumbersByKeys(
			{
				a: {
					input_tokens: "12",
					nested: [{ outputTokens: 3 }, { completion_tokens: "9" }],
				},
			},
			new Set(["input_tokens", "outputTokens", "completion_tokens"]),
			sink,
		);

		expect(sink).toEqual([12, 3, 9]);
	});

	it("collects string values recursively by key", () => {
		const sink: string[] = [];
		collectStringsByKeys(
			{
				part: {
					filePath: " src/main.ts ",
					nested: [{ command: " bun test " }],
				},
			},
			new Set(["filePath", "command"]),
			sink,
		);

		expect(sink).toEqual(["src/main.ts", "bun test"]);
	});

	it("detects tool signals", () => {
		expect(hasToolSignal({ type: "tool_use" })).toBe(true);
		expect(hasToolSignal({ type: "other", part: { tool: "bash" } })).toBe(true);
		expect(hasToolSignal({ type: "text" })).toBe(false);
	});

	it("updates runtime stats from mixed provider output", () => {
		const stats: RuntimeStatsAccumulator = {
			tokensInput: 0,
			tokensOutput: 0,
			cost: 0,
			seenFiles: new Set<string>(),
			seenCommands: new Set<string>(),
		};

		const output = [
			'{"type":"tool_use","part":{"tool":"Edit","state":{"input":{"filePath":"src/a.ts","command":"bun test"}}}}',
			'{"usage":{"input_tokens":10,"outputTokens":20,"credits_spent":0.12}}',
			'{"usage":{"inputTokens":12,"completion_tokens":18,"total_cost":0.25}}',
			"not-json-line",
		].join("\n");

		parseProviderOutput(output, stats);

		expect(stats.tokensInput).toBe(12);
		expect(stats.tokensOutput).toBe(20);
		expect(stats.cost).toBe(0.25);
		expect([...stats.seenFiles]).toEqual(["src/a.ts"]);
		expect([...stats.seenCommands]).toEqual(["bun test"]);
	});

	it("exports key sets expected by providers", () => {
		expect(INPUT_TOKEN_KEYS.has("input_tokens")).toBe(true);
		expect(OUTPUT_TOKEN_KEYS.has("completion_tokens")).toBe(true);
		expect(CREDIT_KEYS.has("credits_spent")).toBe(true);
		expect(FILE_PATH_KEYS.has("filePath")).toBe(true);
		expect(COMMAND_KEYS.has("command")).toBe(true);
	});
});
