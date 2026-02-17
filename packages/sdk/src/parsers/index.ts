/**
 * Response parsers for provider system.
 *
 * Reusable parsing patterns that providers can use
 * to process responses from external services and tools.
 */

// Parser implementations
export { JsonResponseParser } from "./json-parser";
export { StreamResponseParser } from "./stream-parser";
export {
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
} from "./unified-parser";
export type {
	RuntimeStatsAccumulator as UnifiedRuntimeStatsAccumulator,
	UnifiedParseResult,
} from "./unified-parser";
export type {
	CommunicationResponse,
	JsonParserOptions,
	ResponseParser,
	StreamEvent,
	StreamParseResult,
	StreamParserOptions,
} from "./types";
