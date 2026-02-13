import type {
  CommunicationRequest,
  CommunicationResponse,
  CommunicationStrategy,
  ConfigurationManager,
  StreamResponseParser,
} from "@openfarm/sdk";
import { describe, expect, it, vi } from "vitest";
import { ClaudeProvider } from "./claude-provider";

function createCommunicationResponse(
  overrides: Partial<CommunicationResponse> = {}
): CommunicationResponse {
  return {
    status: 0,
    body: "",
    success: true,
    ...overrides,
  };
}

function createConfigManager(): ConfigurationManager {
  return {
    validate: vi.fn(() => true),
    getValidationErrors: vi.fn(() => []),
    getDefaults: vi.fn(() => ({})),
    mergeWithDefaults: vi.fn(() => ({})),
    getSchema: vi.fn(() => ({})),
  };
}

describe("ClaudeProvider", () => {
  it("executes with expected args and claude env", async () => {
    const execute = vi
      .fn<(request: CommunicationRequest) => Promise<CommunicationResponse>>()
      .mockResolvedValueOnce(
        createCommunicationResponse({ body: "claude 1.0.0" })
      )
      .mockResolvedValueOnce(
        createCommunicationResponse({ body: "updated files" })
      );

    const provider = new ClaudeProvider(
      {
        type: "cli",
        execute,
        testConnection: vi.fn(async () => true),
      } as CommunicationStrategy,
      {
        type: "stream",
        parse: vi.fn(async () => "updated files"),
        canHandle: vi.fn(() => true),
      } as StreamResponseParser,
      createConfigManager(),
      { timeout: 30_000 }
    );

    const result = await provider.execute({
      task: "refactor service",
      workspace: "/tmp/project",
      model: "claude-sonnet-4",
      verbose: true,
    });

    const request = execute.mock.calls[1]?.[0];
    expect(result.success).toBe(true);
    expect(request?.args).toEqual([
      "-p",
      "refactor service",
      "--allowedTools",
      "Read,Edit,Write,Bash,Glob,Grep,LS,Task,URLFetch",
      "--verbose",
      "--model",
      "claude-sonnet-4",
    ]);
    expect(request?.env).toEqual({
      CLAUDE_CODE_DISABLE_PROMPTS: "1",
    });
  });

  it("keeps success when parser fails and response body is empty", async () => {
    const execute = vi
      .fn<(request: CommunicationRequest) => Promise<CommunicationResponse>>()
      .mockResolvedValueOnce(
        createCommunicationResponse({ body: "claude 1.0.0" })
      )
      .mockResolvedValueOnce(createCommunicationResponse({ body: "" }));

    const logs: string[] = [];
    const provider = new ClaudeProvider(
      {
        type: "cli",
        execute,
        testConnection: vi.fn(async () => true),
      } as CommunicationStrategy,
      {
        type: "stream",
        parse: vi.fn(async () => {
          throw new Error("parse failed");
        }),
        canHandle: vi.fn(() => true),
      } as StreamResponseParser,
      createConfigManager()
    );

    const result = await provider.execute({
      task: "make changes",
      workspace: "/tmp/project",
      onLog: (msg) => logs.push(msg),
    });

    expect(result.success).toBe(true);
    expect(result.output).toBe("Claude command completed successfully");
    expect(logs.some((msg) => msg.includes("Parser failed"))).toBe(true);
  });

  it("fails when claude CLI is not available", async () => {
    const execute = vi
      .fn<(request: CommunicationRequest) => Promise<CommunicationResponse>>()
      .mockResolvedValueOnce(
        createCommunicationResponse({ success: false, error: "not found" })
      );

    const provider = new ClaudeProvider(
      {
        type: "cli",
        execute,
        testConnection: vi.fn(async () => true),
      } as CommunicationStrategy,
      {
        type: "stream",
        parse: vi.fn(async () => ""),
        canHandle: vi.fn(() => true),
      } as StreamResponseParser,
      createConfigManager()
    );

    const result = await provider.execute({
      task: "make changes",
      workspace: "/tmp/project",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Claude Code CLI not found");
  });
});
