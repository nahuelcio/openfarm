import { z } from "zod";

/**
 * Agent Runtime Protocol v1
 *
 * This file defines the contract between the Rust backend and TypeScript runtime.
 * All agent execution communications must conform to this schema.
 */

export const AgentRuntimeRequestSchema = z.object({
	/** Request identifier for tracing */
	requestId: z.string(),
	/** Agent identifier */
	agentId: z.string(),
	/** Provider to use for execution */
	provider: z.enum(["claude-code", "codex", "opencode"]),
	/** Model to use (optional, uses provider default) */
	model: z.string().optional(),
	/** Agent mode/mode configuration (optional) */
	agentMode: z.string().optional(),
	/** Task/prompt to execute */
	task: z.string(),
	/** Workspace context (optional) */
	workspace: z.string().optional(),
	/** Additional context (optional) */
	context: z.string().optional(),
	/** Attachments for the task */
	attachments: z
		.array(
			z.object({
				id: z.string(),
				name: z.string(),
				type: z.enum(["image", "code", "document", "other"]),
				size: z.string(),
			}),
		)
		.optional(),
});

export type AgentRuntimeRequest = z.infer<typeof AgentRuntimeRequestSchema>;

export const ExecutionStatisticsSchema = z.object({
	creditsSpent: z.number(),
	toolCalls: z.number(),
	model: z.string(),
	filesChanged: z.number(),
	processesCreated: z.number(),
	requestId: z.string(),
	tokensInput: z.number(),
	tokensOutput: z.number(),
	duration: z.number(),
});

export type ExecutionStatistics = z.infer<typeof ExecutionStatisticsSchema>;

export const AgentRuntimeEventSchema = z.object({
	/** Event type for routing */
	eventType: z.enum([
		"agent:started",
		"agent:output",
		"agent:completed",
		"agent:failed",
		"agent:diff-updated",
		"agent:statistics",
	]),
	/** Agent identifier */
	agentId: z.string(),
	/** Request identifier */
	requestId: z.string(),
	/** Event timestamp (ISO 8601) */
	timestamp: z.string(),
	/** Event payload */
	data: z.object({
		/** Output chunk for agent:output events */
		output: z.string().optional(),
		/** Error message for agent:failed events */
		error: z.string().optional(),
		/** Execution statistics for agent:completed events */
		statistics: ExecutionStatisticsSchema.optional(),
		/** Diff information for agent:diff-updated events */
		diff: z
			.object({
				filename: z.string(),
				path: z.string(),
				status: z.enum(["added", "modified", "deleted"]),
				linesAdded: z.number(),
				linesRemoved: z.number(),
			})
			.optional(),
	}),
});

export type AgentRuntimeEvent = z.infer<typeof AgentRuntimeEventSchema>;

export const AgentRuntimeResultSchema = z.object({
	/** Request identifier */
	requestId: z.string(),
	/** Agent identifier */
	agentId: z.string(),
	/** Whether execution succeeded */
	success: z.boolean(),
	/** Final output (if successful) */
	output: z.string().optional(),
	/** Error message (if failed) */
	error: z.string().optional(),
	/** Total execution duration in milliseconds */
	duration: z.number(),
	/** Final execution statistics */
	statistics: ExecutionStatisticsSchema.optional(),
	/** Completion timestamp (ISO 8601) */
	completedAt: z.string(),
});

export type AgentRuntimeResult = z.infer<typeof AgentRuntimeResultSchema>;

/**
 * Bridge communication protocol for Rust->TS communication
 */
export const BridgeRequestSchema = z.object({
	/** Request type */
	kind: z.enum(["execute", "catalog"]),
	/** Agent execution request (for kind: execute) */
	request: AgentRuntimeRequestSchema.optional(),
});

export type BridgeRequest = z.infer<typeof BridgeRequestSchema>;

export const BridgeResponseSchema = z.object({
	/** Response type */
	type: z.enum(["catalog", "log", "result", "error"]),
	/** Provider catalog (for type: catalog) */
	providers: z
		.array(
			z.object({
				id: z.enum(["claude-code", "codex", "opencode"]),
				name: z.string(),
				description: z.string(),
				color: z.string(),
				connected: z.boolean(),
				apiKey: z.string(),
				models: z.array(
					z.object({
						id: z.string(),
						name: z.string(),
						description: z.string(),
					}),
				),
				defaultModel: z.string(),
				agents: z
					.array(
						z.object({
							id: z.string(),
							name: z.string(),
							description: z.string(),
						}),
					)
					.optional(),
				defaultAgent: z.string().optional(),
			}),
		)
		.optional(),
	/** Log chunk (for type: log) */
	chunk: z.string().optional(),
	/** Execution result (for type: result) */
	success: z.boolean().optional(),
	output: z.string().optional(),
	error: z.string().optional(),
	duration: z.number().optional(),
	statistics: ExecutionStatisticsSchema.optional(),
	/** Error message (for type: error) */
	message: z.string().optional(),
});

export type BridgeResponse = z.infer<typeof BridgeResponseSchema>;

/**
 * Protocol version information
 */
export const PROTOCOL_VERSION = "v1" as const;

/**
 * Validation helpers
 */
export function validateRuntimeRequest(data: unknown): AgentRuntimeRequest {
	return AgentRuntimeRequestSchema.parse(data);
}

export function validateRuntimeEvent(data: unknown): AgentRuntimeEvent {
	return AgentRuntimeEventSchema.parse(data);
}

export function validateRuntimeResult(data: unknown): AgentRuntimeResult {
	return AgentRuntimeResultSchema.parse(data);
}

export function validateBridgeRequest(data: unknown): BridgeRequest {
	return BridgeRequestSchema.parse(data);
}

export function validateBridgeResponse(data: unknown): BridgeResponse {
	return BridgeResponseSchema.parse(data);
}

/**
 * Type guards for runtime checking
 */
export function isRuntimeRequest(data: unknown): data is AgentRuntimeRequest {
	return AgentRuntimeRequestSchema.safeParse(data).success;
}

export function isRuntimeEvent(data: unknown): data is AgentRuntimeEvent {
	return AgentRuntimeEventSchema.safeParse(data).success;
}

export function isRuntimeResult(data: unknown): data is AgentRuntimeResult {
	return AgentRuntimeResultSchema.safeParse(data).success;
}

export function isBridgeRequest(data: unknown): data is BridgeRequest {
	return BridgeRequestSchema.safeParse(data).success;
}

export function isBridgeResponse(data: unknown): data is BridgeResponse {
	return BridgeResponseSchema.safeParse(data).success;
}
