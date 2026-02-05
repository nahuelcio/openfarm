import type {
  CommunicationRequest,
  CommunicationResponse,
  CommunicationStrategy,
  ConfigurationManager,
  StreamResponseParser,
} from "@openfarm/sdk";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { OpenCodeProvider } from "./opencode-provider";

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

describe("OpenCodeProvider", () => {
  const originalEnv = {
    OPENCODE_SERVER_URL: process.env.OPENCODE_SERVER_URL,
    OPENCODE_FORMAT: process.env.OPENCODE_FORMAT,
    OPENCODE_AGENT: process.env.OPENCODE_AGENT,
  };

  const restoreEnv = () => {
    if (originalEnv.OPENCODE_SERVER_URL === undefined) {
      process.env.OPENCODE_SERVER_URL = undefined;
    } else {
      process.env.OPENCODE_SERVER_URL = originalEnv.OPENCODE_SERVER_URL;
    }

    if (originalEnv.OPENCODE_FORMAT === undefined) {
      process.env.OPENCODE_FORMAT = undefined;
    } else {
      process.env.OPENCODE_FORMAT = originalEnv.OPENCODE_FORMAT;
    }

    if (originalEnv.OPENCODE_AGENT === undefined) {
      process.env.OPENCODE_AGENT = undefined;
    } else {
      process.env.OPENCODE_AGENT = originalEnv.OPENCODE_AGENT;
    }
  };

  beforeEach(() => {
    restoreEnv();
  });

  it("runs opencode without attach by default", async () => {
    const execute = vi
      .fn<(request: CommunicationRequest) => Promise<CommunicationResponse>>()
      .mockResolvedValueOnce(createCommunicationResponse({ body: "1.1.52" }))
      .mockResolvedValueOnce(
        createCommunicationResponse({ body: "provider raw output" })
      );

    const communicationStrategy: CommunicationStrategy = {
      type: "cli",
      execute,
      testConnection: vi.fn(async () => true),
    };
    const responseParser: StreamResponseParser = {
      type: "stream",
      parse: vi.fn(async () => "parsed output"),
      canHandle: vi.fn(() => true),
    };
    const configManager: ConfigurationManager = {
      validate: vi.fn(() => true),
      getValidationErrors: vi.fn(() => []),
      getDefaults: vi.fn(() => ({})),
      mergeWithDefaults: vi.fn(() => ({})),
      getSchema: vi.fn(() => ({})),
    };

    const provider = new OpenCodeProvider(
      communicationStrategy,
      responseParser,
      configManager,
      { timeout: 10_000 },
      "bunx opencode-ai"
    );

    const result = await provider.execute({
      task: "escribir un cuento en .txt",
      workspace: "/tmp/openfarm",
      model: "zai/glm-4.7",
    });

    const executionRequest = execute.mock.calls[1]?.[0];

    expect(result.success).toBe(true);
    expect(result.output).toBe("parsed output");
    expect(executionRequest?.args).toEqual(["run", "--model", "zai/glm-4.7"]);
    expect(executionRequest?.workingDirectory).toBe("/tmp/openfarm");
  });

  it("uses attach/format/agent flags when environment variables are set", async () => {
    process.env.OPENCODE_SERVER_URL = "http://127.0.0.1:4096";
    process.env.OPENCODE_FORMAT = "json";
    process.env.OPENCODE_AGENT = "refactor-bot";

    const execute = vi
      .fn<(request: CommunicationRequest) => Promise<CommunicationResponse>>()
      .mockResolvedValueOnce(createCommunicationResponse({ body: "1.1.52" }))
      .mockResolvedValueOnce(createCommunicationResponse({ body: "ok" }));

    const provider = new OpenCodeProvider(
      {
        type: "cli",
        execute,
        testConnection: vi.fn(async () => true),
      },
      {
        type: "stream",
        parse: vi.fn(async () => "ok"),
        canHandle: vi.fn(() => true),
      },
      {
        validate: vi.fn(() => true),
        getValidationErrors: vi.fn(() => []),
        getDefaults: vi.fn(() => ({})),
        mergeWithDefaults: vi.fn(() => ({})),
        getSchema: vi.fn(() => ({})),
      },
      { timeout: 10_000 },
      "bunx opencode-ai"
    );

    await provider.execute({
      task: "run task",
      workspace: "/tmp/openfarm",
    });

    const executionRequest = execute.mock.calls[1]?.[0];

    expect(executionRequest?.args).toEqual([
      "run",
      "--attach",
      "http://127.0.0.1:4096",
      "--format",
      "json",
      "--agent",
      "refactor-bot",
    ]);
  });

  it("returns success with fallback output when parser fails and response body is empty", async () => {
    const execute = vi
      .fn<(request: CommunicationRequest) => Promise<CommunicationResponse>>()
      .mockResolvedValueOnce(createCommunicationResponse({ body: "1.1.52" }))
      .mockResolvedValueOnce(createCommunicationResponse({ body: "" }));

    const logs: string[] = [];
    const provider = new OpenCodeProvider(
      {
        type: "cli",
        execute,
        testConnection: vi.fn(async () => true),
      },
      {
        type: "stream",
        parse: vi.fn(async () => {
          throw new Error("Cannot parse response");
        }),
        canHandle: vi.fn(() => true),
      },
      {
        validate: vi.fn(() => true),
        getValidationErrors: vi.fn(() => []),
        getDefaults: vi.fn(() => ({})),
        mergeWithDefaults: vi.fn(() => ({})),
        getSchema: vi.fn(() => ({})),
      },
      { timeout: 10_000 },
      "bunx opencode-ai"
    );

    const result = await provider.execute({
      task: "write file",
      workspace: "/tmp/openfarm",
      onLog: (msg) => logs.push(msg),
    });

    expect(result.success).toBe(true);
    expect(result.output).toBe("OpenCode command completed successfully");
    expect(logs.some((msg) => msg.includes("response parser failed"))).toBe(
      true
    );
  });

  it("fails when OpenCode CLI is not available", async () => {
    const execute = vi
      .fn<(request: CommunicationRequest) => Promise<CommunicationResponse>>()
      .mockResolvedValueOnce(createCommunicationResponse({ success: false }));

    const provider = new OpenCodeProvider(
      {
        type: "cli",
        execute,
        testConnection: vi.fn(async () => true),
      },
      {
        type: "stream",
        parse: vi.fn(async () => ""),
        canHandle: vi.fn(() => true),
      },
      {
        validate: vi.fn(() => true),
        getValidationErrors: vi.fn(() => []),
        getDefaults: vi.fn(() => ({})),
        mergeWithDefaults: vi.fn(() => ({})),
        getSchema: vi.fn(() => ({})),
      },
      { timeout: 10_000 },
      "bunx opencode-ai"
    );

    const result = await provider.execute({ task: "write file" });

    expect(result.success).toBe(false);
    expect(result.error).toContain("OpenCode CLI not found");
    expect(result.output).toContain("bunx opencode-ai --version");
  });

  it("returns provider execution errors from CLI response", async () => {
    const execute = vi
      .fn<(request: CommunicationRequest) => Promise<CommunicationResponse>>()
      .mockResolvedValueOnce(createCommunicationResponse({ body: "1.1.52" }))
      .mockResolvedValueOnce(
        createCommunicationResponse({
          success: false,
          body: "stderr output",
          error: "execution failed",
        })
      );

    const provider = new OpenCodeProvider(
      {
        type: "cli",
        execute,
        testConnection: vi.fn(async () => true),
      },
      {
        type: "stream",
        parse: vi.fn(async () => ""),
        canHandle: vi.fn(() => true),
      },
      {
        validate: vi.fn(() => true),
        getValidationErrors: vi.fn(() => []),
        getDefaults: vi.fn(() => ({})),
        mergeWithDefaults: vi.fn(() => ({})),
        getSchema: vi.fn(() => ({})),
      },
      { timeout: 10_000 },
      "bunx opencode-ai"
    );

    const result = await provider.execute({ task: "write file" });

    expect(result.success).toBe(false);
    expect(result.error).toBe("execution failed");
    expect(result.output).toBe("stderr output");
  });
});
