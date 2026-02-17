import type {
	AgentRuntimeRequest,
	AgentRuntimeResult,
	BridgeRequest,
	BridgeResponse,
} from "./protocol";

/**
 * Bridge client for communicating with the Rust backend
 * This replaces the direct CLI execution logic that was previously in Rust
 */
export class BridgeClient {
	private static instance: BridgeClient;
	private isTauriEnvironment: boolean;

	private constructor() {
		this.isTauriEnvironment = this.detectTauriEnvironment();
	}

	/**
	 * Get singleton instance
	 */
	public static getInstance(): BridgeClient {
		if (!BridgeClient.instance) {
			BridgeClient.instance = new BridgeClient();
		}
		return BridgeClient.instance;
	}

	/**
	 * Detect if running in Tauri environment
	 */
	private detectTauriEnvironment(): boolean {
		if (typeof window === "undefined") {
			return false;
		}
		const candidate = window as unknown as Record<string, unknown>;
		return Boolean(
			candidate.__TAURI_INTERNALS__ ||
				candidate.__TAURI__ ||
				candidate.__TAURI_IPC__,
		);
	}

	/**
	 * Execute agent via bridge
	 */
	public async executeAgent(
		request: AgentRuntimeRequest,
	): Promise<AgentRuntimeResult> {
		if (!this.isTauriEnvironment) {
			return this.executeAgentWeb(request);
		}

		try {
			const bridgeRequest: BridgeRequest = {
				kind: "execute",
				request,
			};

			// Dynamic import to avoid bundling issues
			const { invoke } = await import("@tauri-apps/api/core");

			// Call the Rust backend which will delegate to the TS bridge
			const result = (await invoke(
				"execute_agent_via_bridge",
				{ request: bridgeRequest },
			)) as AgentRuntimeResult;

			return result;
		} catch (error) {
			// Convert error to AgentRuntimeResult format
			return {
				requestId: request.requestId,
				agentId: request.agentId,
				success: false,
				error: error instanceof Error ? error.message : String(error),
				duration: 0,
				completedAt: new Date().toISOString(),
			};
		}
	}

	/**
	 * Execute agent in web environment (fallback)
	 */
	private async executeAgentWeb(
		request: AgentRuntimeRequest,
	): Promise<AgentRuntimeResult> {
		// For web environment, we'll need to implement a different approach
		// For now, return an error
		return {
			requestId: request.requestId,
			agentId: request.agentId,
			success: false,
			error: "Web execution not yet implemented",
			duration: 0,
			completedAt: new Date().toISOString(),
		};
	}

	/**
	 * Get provider catalog via bridge
	 */
	public async getProviderCatalog(): Promise<any[]> {
		if (!this.isTauriEnvironment) {
			return [];
		}

		try {
			const bridgeRequest: BridgeRequest = {
				kind: "catalog",
			};

			// Dynamic import to avoid bundling issues
			const { invoke } = await import("@tauri-apps/api/core");

			const response = (await invoke(
				"get_bridge_catalog",
				{ request: bridgeRequest },
			)) as BridgeResponse;
			return response.providers || [];
		} catch (error) {
			console.error("Failed to get provider catalog:", error);
			return [];
		}
	}
}

// Export singleton instance
export const bridgeClient = BridgeClient.getInstance();
