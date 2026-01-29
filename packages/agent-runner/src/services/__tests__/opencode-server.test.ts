import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import {
  getOpenCodeServerUrl,
  startOpenCodeServer,
  stopOpenCodeServer,
} from "../opencode-server";

// Mock the core module to avoid Bun dependency in tests
vi.mock("@openfarm/core", () => ({
  OpenCodeConfigService: {
    create: vi.fn().mockResolvedValue({
      resolveOpenCodeConfig: vi.fn().mockResolvedValue({
        server: { defaultProvider: "copilot", defaultModel: "copilot/gpt-4o" },
        providers: {
          copilot: { token: null, apiBase: null },
          anthropic: { apiKey: null, apiBase: null },
          openrouter: { apiKey: null, apiBase: null },
          zai: { apiKey: null, apiBase: null },
        },
      }),
    }),
  },
}));

describe("OpenCode Server Manager", () => {
  const originalEnv = process.env;

  beforeAll(() => {
    vi.useFakeTimers();
  });

  afterAll(() => {
    vi.useRealTimers();
    process.env = originalEnv;
  });

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(async () => {
    await stopOpenCodeServer();
    vi.clearAllTimers();
  });

  describe("startOpenCodeServer", () => {
    it("should throw error if server is already running", async () => {
      await startOpenCodeServer({ port: 4142, host: "127.0.0.1" });

      await expect(
        startOpenCodeServer({ port: 4142, host: "127.0.0.1" })
      ).rejects.toThrow("OpenCode server is already running");
    });
  });

  describe("stopOpenCodeServer", () => {
    it("should handle gracefully when server is not running", async () => {
      await expect(stopOpenCodeServer()).resolves.toBeUndefined();
    });
  });

  describe("getOpenCodeServerUrl", () => {
    it("should use OPENCODE_PORT environment variable", () => {
      process.env.OPENCODE_PORT = "9999";
      process.env.OPENCODE_HOST = "localhost";

      const url = getOpenCodeServerUrl();
      expect(url).toBe("http://localhost:9999");
    });

    it("should use default port when OPENCODE_PORT not set", () => {
      // biome-ignore lint/performance/noDelete: delete is needed to remove env var
      delete process.env.OPENCODE_PORT;
      process.env.OPENCODE_HOST = "127.0.0.1";

      const url = getOpenCodeServerUrl();
      expect(url).toBe("http://127.0.0.1:4096");
    });

    it("should use default host when OPENCODE_HOST not set", () => {
      // biome-ignore lint/performance/noDelete: delete is needed to remove env var
      delete process.env.OPENCODE_HOST;
      process.env.OPENCODE_PORT = "4096";

      const url = getOpenCodeServerUrl();
      expect(url).toBe("http://127.0.0.1:4096");
    });
  });
});
