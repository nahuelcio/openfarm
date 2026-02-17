import type { ChangesSummary } from "@openfarm/core/types/adapters";
import { describe, expect, it } from "vitest";
import { AgentToCodingEngineAdapter } from "../compat/coding-engine-adapter";
import type {
	AgentExecuteOptions,
	AgentExecutionHandle,
	AgentExecutionResult,
	AgentPlugin,
	AgentPluginMeta,
} from "../core/types";

class StubAgent implements AgentPlugin {
	readonly meta: AgentPluginMeta;
	private readonly result: AgentExecutionResult;
	public lastPrompt: string | undefined;

	constructor(metaId: string, result: AgentExecutionResult) {
		this.meta = {
			id: metaId,
			name: "Stub",
			description: "Stub",
			version: "0.0.0",
			defaultCommand: "stub",
			supportsStreaming: false,
			supportsInterrupt: false,
			supportsFileContext: false,
			supportsSubagentTracing: false,
		};
		this.result = result;
	}

	async initialize(): Promise<void> {}
	async isReady(): Promise<boolean> {
		return true;
	}
	async detect() {
		return { available: true };
	}
	execute(
		prompt: string,
		_options?: AgentExecuteOptions,
	): AgentExecutionHandle {
		this.lastPrompt = prompt;
		return {
			executionId: this.result.executionId,
			promise: Promise.resolve(this.result),
			interrupt: () => {},
			isRunning: () => false,
		};
	}
	interrupt(): boolean {
		return false;
	}
	interruptAll(): void {}
	getCurrentExecution() {
		return undefined;
	}
	validateModel(): string | null {
		return null;
	}
	async dispose(): Promise<void> {}
}

describe("AgentToCodingEngineAdapter", () => {
	it("returns ok when agent completes", async () => {
		const changes: ChangesSummary = { summary: "done" };
		const agent = new StubAgent("claude-code", {
			executionId: "1",
			status: "completed",
			stdout: "done",
			stderr: "",
			durationMs: 10,
			changes,
		});

		const adapter = new AgentToCodingEngineAdapter(agent);
		const result = await adapter.applyChanges("test", "/repo");

		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.value.summary).toBe("done");
		}
	});

	it("returns err when agent fails", async () => {
		const agent = new StubAgent("claude-code", {
			executionId: "1",
			status: "failed",
			stdout: "",
			stderr: "err",
			durationMs: 10,
			error: "boom",
		});

		const adapter = new AgentToCodingEngineAdapter(agent);
		const result = await adapter.applyChanges("test", "/repo");

		expect(result.ok).toBe(false);
	});

	it("passes prompt without opencode prefix", async () => {
		const agent = new StubAgent("opencode", {
			executionId: "1",
			status: "completed",
			stdout: "",
			stderr: "",
			durationMs: 1,
		});
		const adapter = new AgentToCodingEngineAdapter(agent);
		await adapter.applyChanges("do it", "/repo");

		expect(agent.lastPrompt).toBe("do it");
	});
});
