import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import {
  getOpenCodeServerUrl,
  startOpenCodeServer,
  stopOpenCodeServer,
} from "../opencode-server";

describe("OpenCode Server Manager", () => {
  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  afterEach(async () => {
    await stopOpenCodeServer();
    jest.clearAllTimers();
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

      process.env.OPENCODE_PORT = undefined;
      process.env.OPENCODE_HOST = undefined;
    });

    it("should use default port when OPENCODE_PORT not set", () => {
      process.env.OPENCODE_PORT = undefined;
      process.env.OPENCODE_HOST = "127.0.0.1";

      const url = getOpenCodeServerUrl();
      expect(url).toBe("http://127.0.0.1:4096");
    });

    it("should use default host when OPENCODE_HOST not set", () => {
      process.env.OPENCODE_HOST = undefined;
      process.env.OPENCODE_PORT = "4096";

      const url = getOpenCodeServerUrl();
      expect(url).toBe("http://127.0.0.1:4096");
    });
  });
});
