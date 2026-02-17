/**
 * Unified Output Parser for All Providers
 *
 * Replaces duplicated parsing logic across Claude/OpenCode/external providers.
 * Extracts tokens, costs, files, commands from any provider output format.
 */

export interface UnifiedParseResult {
	tokensInput: number;
	tokensOutput: number;
	cost: number;
	files: string[];
	commands: string[];
}

export interface RuntimeStatsAccumulator {
	tokensInput: number;
	tokensOutput: number;
	cost: number;
	seenFiles: Set<string>;
	seenCommands: Set<string>;
}

// Known key patterns for different providers
export const INPUT_TOKEN_KEYS = new Set([
	"input_tokens",
	"inputTokens",
	"prompt_tokens",
	"promptTokens",
	"tokens_input",
	"tokensInput",
]);

export const OUTPUT_TOKEN_KEYS = new Set([
	"output_tokens",
	"outputTokens",
	"completion_tokens",
	"completionTokens",
	"tokens_output",
	"tokensOutput",
]);

export const CREDIT_KEYS = new Set([
	"credits_spent",
	"creditsSpent",
	"total_usd",
	"totalUSD",
	"cost_usd",
	"costUSD",
	"total_cost",
	"totalCost",
	"cost",
]);

export const FILE_PATH_KEYS = new Set([
	"filePath",
	"file_path",
	"path",
	"targetPath",
]);
export const COMMAND_KEYS = new Set(["command", "cmd"]);

/**
 * Parse provider output and extract unified statistics
 */
export function parseProviderOutput(
	raw: string,
	stats: RuntimeStatsAccumulator,
): void {
	if (!raw || raw.trim().length === 0) {
		return;
	}

	for (const line of raw.replaceAll("\r\n", "\n").split("\n")) {
		parseProviderLine(line, stats);
	}
}

/**
 * Parse a single line from provider output
 */
function parseProviderLine(
	line: string,
	stats: RuntimeStatsAccumulator,
): void {
	const event = parseJsonRecord(line);
	if (!event) {
		return;
	}

	// Track files
	const fileCandidates: string[] = [];
	collectStringsByKeys(event, FILE_PATH_KEYS, fileCandidates);
	for (const filePath of fileCandidates) {
		if (!stats.seenFiles.has(filePath)) {
			stats.seenFiles.add(filePath);
		}
	}

	// Track commands  
	const commandCandidates: string[] = [];
	collectStringsByKeys(event, COMMAND_KEYS, commandCandidates);
	for (const command of commandCandidates) {
		if (!stats.seenCommands.has(command)) {
			stats.seenCommands.add(command);
		}
	}

	// Track input tokens
	const inputCandidates: number[] = [];
	collectNumbersByKeys(event, INPUT_TOKEN_KEYS, inputCandidates);
	if (inputCandidates.length > 0) {
		stats.tokensInput = Math.max(stats.tokensInput, ...inputCandidates);
	}

	// Track output tokens
	const outputCandidates: number[] = [];
	collectNumbersByKeys(event, OUTPUT_TOKEN_KEYS, outputCandidates);
	if (outputCandidates.length > 0) {
		stats.tokensOutput = Math.max(stats.tokensOutput, ...outputCandidates);
	}

	// Track costs
	const costCandidates: number[] = [];
	collectNumbersByKeys(event, CREDIT_KEYS, costCandidates);
	if (costCandidates.length > 0) {
		stats.cost = Math.max(stats.cost, ...costCandidates);
	}
}

/**
 * Parse JSON record from line, returns null if not valid JSON
 */
export function parseJsonRecord(line: string): Record<string, unknown> | null {
	const trimmed = line.trim();
	if (!(trimmed.startsWith("{") && trimmed.endsWith("}"))) {
		return null;
	}

	try {
		const parsed = JSON.parse(trimmed) as unknown;
		return asRecord(parsed);
	} catch {
		return null;
	}
}

/**
 * Type guard for record objects
 */
export function asRecord(value: unknown): Record<string, unknown> | null {
	if (value && typeof value === "object" && !Array.isArray(value)) {
		return value as Record<string, unknown>;
	}
	return null;
}

/**
 * Recursively collect numbers by known keys
 */
export function collectNumbersByKeys(
	value: unknown,
	keys: Set<string>,
	sink: number[],
): void {
	if (value === null || value === undefined) {
		return;
	}
	if (
		typeof value === "string" ||
		typeof value === "number" ||
		typeof value === "boolean"
	) {
		return;
	}
	if (Array.isArray(value)) {
		for (const item of value) {
			collectNumbersByKeys(item, keys, sink);
		}
		return;
	}

	const record = asRecord(value);
	if (!record) {
		return;
	}

	for (const [key, nested] of Object.entries(record)) {
		if (keys.has(key)) {
			const parsed = toFiniteNumber(nested);
			if (parsed !== null) {
				sink.push(parsed);
			}
		}
		collectNumbersByKeys(nested, keys, sink);
	}
}

/**
 * Recursively collect strings by known keys
 */
export function collectStringsByKeys(
	value: unknown,
	keys: Set<string>,
	sink: string[],
): void {
	if (value === null || value === undefined) {
		return;
	}
	if (
		typeof value === "string" ||
		typeof value === "number" ||
		typeof value === "boolean"
	) {
		return;
	}
	if (Array.isArray(value)) {
		for (const item of value) {
			collectStringsByKeys(item, keys, sink);
		}
		return;
	}

	const record = asRecord(value);
	if (!record) {
		return;
	}

	for (const [key, nested] of Object.entries(record)) {
		if (keys.has(key) && typeof nested === "string") {
			const clean = nested.trim();
			if (clean.length > 0) {
				sink.push(clean);
			}
		}
		collectStringsByKeys(nested, keys, sink);
	}
}

/**
 * Detects whether a parsed event represents tool activity.
 */
export function hasToolSignal(event: Record<string, unknown>): boolean {
	const type = typeof event.type === "string" ? event.type : "";
	const item = asRecord(event.item);
	const part = asRecord(event.part);
	const itemType = typeof item?.type === "string" ? item.type.toLowerCase() : "";

	return (
		type === "tool_use" ||
		type === "tool_call" ||
		itemType.includes("tool") ||
		(typeof part?.tool === "string" && part.tool.trim().length > 0)
	);
}

function toFiniteNumber(value: unknown): number | null {
	if (typeof value === "number" && Number.isFinite(value)) {
		return value;
	}
	if (typeof value === "string") {
		const parsed = Number(value);
		if (Number.isFinite(parsed)) {
			return parsed;
		}
	}
	return null;
}
