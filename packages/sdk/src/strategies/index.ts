/**
 * Communication strategies for provider system.
 *
 * Reusable communication patterns that providers can use
 * to interact with external services and tools.
 */

export {
  CliCommunicationStrategy,
  type CliConfig,
} from "./cli-strategy";
export {
  type HttpAuthConfig,
  HttpCommunicationStrategy,
  type HttpConfig,
} from "./http-strategy";
export type {
  CliExecutionOptions,
  CommunicationRequest,
  CommunicationResponse,
  CommunicationStrategy,
  HttpRequestOptions,
} from "./types";
