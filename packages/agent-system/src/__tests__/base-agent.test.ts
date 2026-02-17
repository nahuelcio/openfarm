import type { ChangesSummary } from "@openfarm/core/types/adapters";
import { describe, expect, it } from "vitest";
import { BaseAgentPlugin } from "../core/base-agent";
import type { AgentExecuteOptions, AgentPluginMeta } from "../core/types";

class TestAgent extends BaseAgentPlugin {
	readonly meta: AgentPluginMeta = {
		id: "test-agent",
		name: "Test Agent",
		description: "Test agent",
		version: "0.0.1",
		defaultCommand: "node",
		supportsStreaming: true,
		supportsInterrupt: true,
		supportsFileContext: false,
		supportsSubagentTracing: false,
	};

	protected buildArgs(
		_prompt: string,
		options?: AgentExecuteOptions,
	): string[] {
		if (options?.flags?.includes("sleep")) {
			return ["-e", "setTimeout(() => {}, 10000)"];
		}
		return ["-e", "console.log('hello')"];
	}

	protected parseOutput(stdout: string): ChangesSummary | undefined {
		return { summary: stdout.trim() };
	}
}

class StdinCloseAgent extends BaseAgentPlugin {
	readonly meta: AgentPluginMeta = {
		id: "stdin-close-agent",
		name: "Stdin Close Agent",
		description: "Agent that waits for stdin end",
		version: "0.0.1",
		defaultCommand: "node",
		supportsStreaming: true,
		supportsInterrupt: true,
		supportsFileContext: false,
		supportsSubagentTracing: false,
	};

	protected buildArgs(
		_prompt: string,
		_options?: AgentExecuteOptions,
	): string[] {
		return [
			"-e",
			"process.stdin.on('end', () => { console.log('done'); }); process.stdin.resume();",
		];
	}

	protected parseOutput(stdout: string): ChangesSummary | undefined {
		return { summary: stdout.trim() };
	}
}

describe("BaseAgentPlugin", () => {
	it("executes and captures stdout", async () => {
		const agent = new TestAgent();
		const handle = agent.execute("hello");
		const result = await handle.promise;

		expect(result.status).toBe("completed");
		expect(result.stdout.trim()).toBe("hello");
		expect(result.changes?.summary).toBe("hello");
	});

	it("interrupts a running execution", async () => {
		const agent = new TestAgent();
		const handle = agent.execute("sleep", { flags: ["sleep"] });
		handle.interrupt();

		const result = await handle.promise;
		expect(result.status).toBe("interrupted");
	});

	it("closes stdin when no input is provided", async () => {
		const agent = new StdinCloseAgent();
		const handle = agent.execute("ignored", { timeout: 1000 });
		const result = await handle.promise;

		expect(result.status).toBe("completed");
		expect(result.stdout.trim()).toBe("done");
	});
});
