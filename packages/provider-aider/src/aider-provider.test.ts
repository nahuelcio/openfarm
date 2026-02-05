import type {
  CommunicationRequest,
  CommunicationResponse,
  ConfigurationManager,
  StreamResponseParser,
} from "@openfarm/sdk";
import { describe, expect, it, vi } from "vitest";
import { AiderProvider } from "./aider-provider";

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

describe("AiderProvider", () => {
  it("executes with workspace and model args", async () => {
    const execute = vi
      .fn<(request: CommunicationRequest) => Promise<CommunicationResponse>>()
      .mockResolvedValueOnce(createCommunicationResponse({ body: "aider 0.1" }))
      .mockResolvedValueOnce(
        createCommunicationResponse({
          body: "Modified src/file.ts",
        })
      );

    const provider = new AiderProvider(
      {
        type: "cli",
        execute,
        testConnection: vi.fn(async () => true),
      },
      {
        type: "stream",
        parse: vi.fn(async () => "Modified src/file.ts"),
        canHandle: vi.fn(() => true),
      } as StreamResponseParser,
      createConfigManager(),
      { timeout: 30_000 }
    );

    const result = await provider.execute({
      task: "fix bug",
      workspace: "/tmp/project",
      model: "gpt-4o-mini",
    });

    const request = execute.mock.calls[1]?.[0];
    expect(result.success).toBe(true);
    expect(request?.workingDirectory).toBe("/tmp/project");
    expect(request?.args).toEqual([
      "--message",
      "fix bug",
      "--model",
      "gpt-4o-mini",
    ]);
    expect(result.output).toContain("Aider execution completed successfully");
  });

  it("fails when workspace is missing", async () => {
    const provider = new AiderProvider(
      {
        type: "cli",
        execute: vi.fn(async () => createCommunicationResponse()),
        testConnection: vi.fn(async () => true),
      },
      {
        type: "stream",
        parse: vi.fn(async () => ""),
        canHandle: vi.fn(() => true),
      } as StreamResponseParser,
      createConfigManager()
    );

    const result = await provider.execute({ task: "do work" });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Workspace path is required for Aider");
  });

  it("keeps success when parser fails and CLI response is empty", async () => {
    const execute = vi
      .fn<(request: CommunicationRequest) => Promise<CommunicationResponse>>()
      .mockResolvedValueOnce(createCommunicationResponse({ body: "aider 0.1" }))
      .mockResolvedValueOnce(createCommunicationResponse({ body: "" }));

    const logs: string[] = [];
    const provider = new AiderProvider(
      {
        type: "cli",
        execute,
        testConnection: vi.fn(async () => true),
      },
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
      task: "fix bug",
      workspace: "/tmp/project",
      onLog: (msg) => logs.push(msg),
    });

    expect(result.success).toBe(true);
    expect(result.output).toContain("Aider execution completed successfully");
    expect(logs.some((msg) => msg.includes("Parser failed"))).toBe(true);
  });

  it("fails when aider is not installed", async () => {
    const execute = vi
      .fn<(request: CommunicationRequest) => Promise<CommunicationResponse>>()
      .mockResolvedValueOnce(
        createCommunicationResponse({ success: false, error: "not found" })
      );

    const provider = new AiderProvider(
      {
        type: "cli",
        execute,
        testConnection: vi.fn(async () => true),
      },
      {
        type: "stream",
        parse: vi.fn(async () => ""),
        canHandle: vi.fn(() => true),
      } as StreamResponseParser,
      createConfigManager()
    );

    const result = await provider.execute({
      task: "fix bug",
      workspace: "/tmp/project",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Aider not found");
  });
});
