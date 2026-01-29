import {
  CLAUDE_DEFAULT_MODEL,
  CLAUDE_SUPPORTED_MODELS,
} from "@openfarm/config";
import type {
  ChangesSummary,
  CodingEngine,
} from "@openfarm/core/types/adapters";
import type { Result } from "@openfarm/result";
import { executeClaudeCodeProcess } from "./claude-code-process";
import type { ClaudeCodeOptions, ClaudeCodeProcessConfig } from "./types";

export * from "./claude-code-process";
export * from "./types";

/**
 * ClaudeCodeCodingEngine implements the CodingEngine interface using Claude Code CLI.
 *
 * Claude Code is Anthropic's official coding agent that runs locally and uses
 * Claude models for code understanding and generation.
 *
 * @example
 * ```typescript
 * const engine = new ClaudeCodeCodingEngine({
 *   model: 'claude-sonnet-4-20250514',
 *   onLog: (msg) => console.log(msg)
 * });
 *
 * const result = await engine.applyChanges(
 *   'Add error handling to the login function',
 *   './my-repo'
 * );
 * ```
 */
export class ClaudeCodeCodingEngine implements CodingEngine {
  constructor(private readonly options: ClaudeCodeOptions = {}) {}

  /**
   * Returns the name of this coding engine.
   */
  getName(): string {
    return "Claude Code";
  }

  /**
   * Returns the list of supported models.
   * Claude Code supports various Claude models.
   */
  async getSupportedModels(): Promise<string[]> {
    return [...CLAUDE_SUPPORTED_MODELS];
  }

  /**
   * Applies code changes using Claude Code CLI.
   *
   * @param instruction - Instruction describing what changes to make
   * @param repoPath - Path to the repository
   * @param contextFiles - Optional array of files to include in context
   * @returns Result containing changes summary
   */
  async applyChanges(
    instruction: string,
    repoPath: string,
    contextFiles: string[] = []
  ): Promise<Result<ChangesSummary>> {
    const {
      model = process.env.CLAUDE_DEFAULT_MODEL || CLAUDE_DEFAULT_MODEL,
      previewMode = false,
      chatOnly = false,
      rules,
      maxTokens,
      allowedTools,
      disallowedTools,
      mcpServers,
      containerName,
      podName,
      namespace,
      ephemeral,
      jobId,
      maxTurns,
      apiTimeout,
      apiBaseUrl,
      onLog,
      onChanges,
      onChatMessage,
    } = this.options;

    // Build allowed tools based on mode
    let tools = allowedTools;
    if (chatOnly && !tools) {
      // In chat-only mode, only allow read operations
      tools = ["Read", "Glob", "Grep", "LS"];
    }

    const config: ClaudeCodeProcessConfig = {
      model,
      previewMode,
      chatOnly,
      rules,
      maxTokens,
      allowedTools: tools,
      disallowedTools,
      mcpServers,
      containerName,
      podName,
      namespace,
      ephemeral,
      jobId,
      maxTurns,
      apiTimeout,
      apiBaseUrl,
      onLog,
      onChanges,
      onChatMessage,
      cwd: repoPath,
    };

    return executeClaudeCodeProcess(
      config,
      instruction,
      repoPath,
      contextFiles
    );
  }
}
