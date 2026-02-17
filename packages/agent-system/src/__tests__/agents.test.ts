import type { ChangesSummary } from "@openfarm/core/types/adapters";
import { describe, expect, it } from "vitest";
import { ClaudeCodeAgent } from "../agents/claude-code";
import { OpenCodeAgent } from "../agents/opencode";

describe("ClaudeCodeAgent", () => {
	it("parses jsonl output for changes", () => {
		const agent = new ClaudeCodeAgent();
		const output = [
			JSON.stringify({
				type: "tool_use",
				tool_name: "Write",
				tool_input: { file_path: "src/new.ts" },
			}),
			JSON.stringify({
				type: "result",
				message: "Done",
				cost_usd: 0.01,
			}),
		].join("\n");

		const changes = (
			agent as unknown as {
				parseOutput: (input: string) => ChangesSummary | undefined;
			}
		).parseOutput(output);
		expect(changes?.filesCreated).toContain("src/new.ts");
		expect(changes?.summary).toBe("Done");
		expect(changes?.totalCost).toBe(0.01);
	});

	it("rejects invalid model names", () => {
		const agent = new ClaudeCodeAgent();
		expect(agent.validateModel("bad-model")).toContain("Invalid model");
		expect(agent.validateModel("sonnet")).toBeNull();
	});
});

describe("OpenCodeAgent", () => {
	it("parses json output for modified files", () => {
		const agent = new OpenCodeAgent();
		const output = [
			JSON.stringify({
				type: "tool_use",
				part: {
					tool: "edit",
					state: {
						status: "completed",
						input: { filePath: "src/app.ts" },
						metadata: { diff: "+change" },
					},
				},
			}),
			JSON.stringify({
				type: "text",
				part: { text: "Finished" },
			}),
		].join("\n");

		const changes = (
			agent as unknown as {
				parseOutput: (input: string) => ChangesSummary | undefined;
			}
		).parseOutput(output);
		expect(changes?.filesModified).toContain("src/app.ts");
		expect(changes?.diff).toContain("+change");
		expect(changes?.summary).toContain("Finished");
	});

	it("filters metadata lines in streamed output", () => {
		const agent = new OpenCodeAgent();
		const output = [
			"Reading: src/app.ts",
			JSON.stringify({
				type: "text",
				part: { text: "Actual response" },
			}),
		].join("\n");

		const changes = (
			agent as unknown as {
				parseOutput: (input: string) => ChangesSummary | undefined;
			}
		).parseOutput(output);

		expect(changes?.summary).toContain("Actual response");
	});

	it("prefixes repo context in stdin input", () => {
		const agent = new OpenCodeAgent();
		const stdin = (
			agent as unknown as {
				getStdinInput: (prompt: string, options?: { cwd?: string }) => string;
			}
		).getStdinInput("Do it", { cwd: "/repo" });

		expect(stdin).toContain("IMPORTANT: Work ONLY in this repository: /repo");
		expect(stdin).toContain("Do it");
	});
});
