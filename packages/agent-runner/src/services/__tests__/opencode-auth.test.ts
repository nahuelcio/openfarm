import { describe, expect, it, jest } from "@jest/globals";
import {
  getOpenCodeAuthAdapter,
  resetOpenCodeAuthAdapter,
} from "../opencode-auth";

describe("OpenCode Auth Adapter", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    resetOpenCodeAuthAdapter();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  describe("getOpenCodeAuthAdapter", () => {
    it("should create singleton instance", () => {
      const adapter1 = getOpenCodeAuthAdapter();
      const adapter2 = getOpenCodeAuthAdapter();

      expect(adapter1).toBe(adapter2);
    });
  });

  describe("isReady", () => {
    it("should return false when server is not running", async () => {
      global.fetch = jest.fn(() => Promise.reject(new Error("offline"))) as any;

      const adapter = getOpenCodeAuthAdapter();
      const ready = await adapter.isReady();

      expect(ready).toBe(false);
    });
  });

  describe("getAuthStatus", () => {
    it("should return authenticated status when models endpoint is accessible", async () => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          headers: new Headers({ "content-type": "application/json" }),
          json: async () => ({ data: [] }),
        } as Response)
      );
      const mockFetch = global.fetch as jest.Mock;

      const adapter = getOpenCodeAuthAdapter();
      const status = await adapter.getAuthStatus();

      expect(status.isAuthenticated).toBe(true);
      expect(status.needsAuth).toBe(false);

      mockFetch.mockRestore();
    }, 5000);

    it("should return needs auth status when models endpoint returns 401", async () => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: false,
          status: 401,
          headers: new Headers({ "content-type": "application/json" }),
          json: async () => ({
            isAuthenticated: false,
            needsAuth: true,
          }),
        } as Response)
      );
      const mockFetch = global.fetch as jest.Mock;

      const adapter = getOpenCodeAuthAdapter();
      const status = await adapter.getAuthStatus();

      expect(status.isAuthenticated).toBe(false);
      expect(status.needsAuth).toBe(true);

      mockFetch.mockRestore();
    }, 5000);
  });

  describe("getDeviceCode", () => {
    it("should return device code when available", async () => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: async () => ({
            userCode: "ABCD-EFGH",
            deviceCode: "test-device-code",
            verificationUri: "https://github.com/login/device",
            expiresIn: 900,
            interval: 5,
          }),
        } as Response)
      );
      const mockFetch = global.fetch as jest.Mock;

      const adapter = getOpenCodeAuthAdapter();
      const deviceCode = await adapter.getDeviceCode();

      expect(deviceCode).not.toBeNull();
      expect(deviceCode?.code).toBe("ABCD-EFGH");

      mockFetch.mockRestore();
    }, 5000);
  });
});
