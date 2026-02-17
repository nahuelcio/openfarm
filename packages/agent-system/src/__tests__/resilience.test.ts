import { describe, expect, it } from "vitest";
import { AgentRegistry } from "../core/registry";
import type {
	AgentExecutionResult,
	AgentPlugin,
	AgentPluginFactory,
	AgentPluginMeta,
} from "../core/types";
import { AgentFallbackManager } from "../resilience/fallback-manager";
import { RateLimitDetector } from "../resilience/rate-limit-detector";

class MockAgent implements AgentPlugin {
	readonly meta: AgentPluginMeta;

	constructor(id: string) {
		this.meta = {
			id,
			name: "Mock Agent",
			description: "Mock agent",
			version: "0.0.1",
			defaultCommand: "mock",
			supportsStreaming: false,
			supportsInterrupt: false,
			supportsFileContext: false,
			supportsSubagentTracing: false,
		};
	}

	async initialize(): Promise<void> {}
	async isReady(): Promise<boolean> {
		return true;
	}
	async detect() {
		return { available: true, version: "1.0.0" };
	}
	execute() {
		throw new Error("not implemented");
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

class MockAgentFactory implements AgentPluginFactory {
	private readonly id: string;

	constructor(id: string) {
		this.id = id;
	}

	create(): AgentPlugin {
		return new MockAgent(this.id);
	}
	getMeta(): AgentPluginMeta {
		return new MockAgent(this.id).meta;
	}
	canCreate(pluginId: string): boolean {
		return pluginId === this.id;
	}
}

describe("RateLimitDetector", () => {
	it("detects rate limits and retry-after", () => {
		const detector = new RateLimitDetector();
		const result = detector.detect({
			stderr: "HTTP 429 too many requests. retry-after: 12s",
			exitCode: 1,
			agentId: "opencode",
		});

		expect(result.isRateLimit).toBe(true);
		expect(result.retryAfter).toBe(12);
	});
});

describe("AgentFallbackManager", () => {
	it("switches to fallback agent on rate limit", () => {
		const registry = new AgentRegistry();
		registry.registerBuiltin(new MockAgentFactory("primary"));
		registry.registerBuiltin(new MockAgentFactory("fallback"));

		const manager = new AgentFallbackManager(
			{
				primaryAgent: "primary",
				fallbackAgents: ["fallback"],
				maxRetries: 2,
				baseBackoffMs: 100,
				recoverPrimaryBetweenIterations: false,
			},
			registry,
			new RateLimitDetector(),
		);

		const result: AgentExecutionResult = {
			executionId: "1",
			status: "failed",
			stdout: "",
			stderr: "HTTP 429 too many requests",
			durationMs: 10,
			exitCode: 1,
		};

		const decision = manager.handleResult(result);
		expect(decision.shouldRetry).toBe(true);
		expect(manager.getActiveAgentId()).toBe("fallback");
	});
});
