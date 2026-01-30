/**
 * Unit tests for HttpCommunicationStrategy.
 *
 * Tests HTTP communication with mocked fetch to avoid external dependencies.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CommunicationRequest } from "../../provider-system/types";
import {
  type HttpAuthConfig,
  HttpCommunicationStrategy,
  type HttpConfig,
} from "../http-strategy";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("HttpCommunicationStrategy", () => {
  let strategy: HttpCommunicationStrategy;
  let baseConfig: HttpConfig;

  beforeEach(() => {
    baseConfig = {
      baseUrl: "https://api.example.com",
      timeout: 5000,
      enableLogging: false,
    };
    strategy = new HttpCommunicationStrategy(baseConfig);
    mockFetch.mockClear();
  });

  describe("constructor", () => {
    it("should initialize with default configuration", () => {
      const strategy = new HttpCommunicationStrategy({
        baseUrl: "https://test.com",
      });
      expect(strategy.type).toBe("http");
    });
  });

  describe("execute", () => {
    it("should execute successful GET request", async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        headers: new Map([["content-type", "application/json"]]),
        text: vi.fn().mockResolvedValue('{"success": true}'),
      };
      mockFetch.mockResolvedValue(mockResponse);

      const request: CommunicationRequest = {
        endpoint: "/test",
        method: "GET",
      };

      const response = await strategy.execute(request);

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.example.com/test",
        expect.objectContaining({
          method: "GET",
          headers: {},
        })
      );

      expect(response.success).toBe(true);
      expect(response.status).toBe(200);
      expect(response.body).toBe('{"success": true}');
    });

    it("should execute POST request with JSON body", async () => {
      const mockResponse = {
        ok: true,
        status: 201,
        headers: new Map(),
        text: vi.fn().mockResolvedValue('{"id": 123}'),
      };
      mockFetch.mockResolvedValue(mockResponse);

      const request: CommunicationRequest = {
        endpoint: "/create",
        method: "POST",
        body: { name: "test" },
      };

      await strategy.execute(request);

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.example.com/create",
        expect.objectContaining({
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: '{"name":"test"}',
        })
      );
    });

    it("should handle HTTP error responses", async () => {
      const mockResponse = {
        ok: false,
        status: 404,
        headers: new Map(),
        text: vi.fn().mockResolvedValue("Not Found"),
      };
      mockFetch.mockResolvedValue(mockResponse);

      const response = await strategy.execute({
        endpoint: "/nonexistent",
        method: "GET",
      });

      expect(response.success).toBe(false);
      expect(response.status).toBe(404);
      expect(response.body).toBe("Not Found");
    });

    it("should handle network errors", async () => {
      mockFetch.mockRejectedValue(new TypeError("Failed to fetch"));

      const response = await strategy.execute({
        endpoint: "/test",
        method: "GET",
      });

      expect(response.success).toBe(false);
      expect(response.status).toBe(0);
      expect(response.error).toBe("Network error - unable to connect");
    });
  });

  describe("authentication", () => {
    it("should add Bearer token authentication", async () => {
      const authConfig: HttpAuthConfig = {
        type: "bearer",
        token: "test-token-123",
      };

      const strategy = new HttpCommunicationStrategy({
        ...baseConfig,
        auth: authConfig,
      });

      const mockResponse = {
        ok: true,
        status: 200,
        headers: new Map(),
        text: vi.fn().mockResolvedValue("{}"),
      };
      mockFetch.mockResolvedValue(mockResponse);

      await strategy.execute({ endpoint: "/auth-test", method: "GET" });

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.example.com/auth-test",
        expect.objectContaining({
          headers: {
            Authorization: "Bearer test-token-123",
          },
        })
      );
    });

    it("should add Basic authentication", async () => {
      const authConfig: HttpAuthConfig = {
        type: "basic",
        username: "user",
        password: "pass",
      };

      const strategy = new HttpCommunicationStrategy({
        ...baseConfig,
        auth: authConfig,
      });

      const mockResponse = {
        ok: true,
        status: 200,
        headers: new Map(),
        text: vi.fn().mockResolvedValue("{}"),
      };
      mockFetch.mockResolvedValue(mockResponse);

      await strategy.execute({ endpoint: "/auth-test", method: "GET" });

      const expectedCredentials = btoa("user:pass");
      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.example.com/auth-test",
        expect.objectContaining({
          headers: {
            Authorization: `Basic ${expectedCredentials}`,
          },
        })
      );
    });

    it("should add API key authentication", async () => {
      const authConfig: HttpAuthConfig = {
        type: "api-key",
        apiKey: "secret-key",
        apiKeyHeader: "X-API-Key",
      };

      const strategy = new HttpCommunicationStrategy({
        ...baseConfig,
        auth: authConfig,
      });

      const mockResponse = {
        ok: true,
        status: 200,
        headers: new Map(),
        text: vi.fn().mockResolvedValue("{}"),
      };
      mockFetch.mockResolvedValue(mockResponse);

      await strategy.execute({ endpoint: "/auth-test", method: "GET" });

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.example.com/auth-test",
        expect.objectContaining({
          headers: {
            "X-API-Key": "secret-key",
          },
        })
      );
    });
  });

  describe("testConnection", () => {
    it("should return true for successful connection test", async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        headers: new Map(),
        text: vi.fn().mockResolvedValue("OK"),
      };
      mockFetch.mockResolvedValue(mockResponse);

      const result = await strategy.testConnection();

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.example.com/health",
        expect.objectContaining({
          method: "GET",
        })
      );
    });

    it("should return false for network errors", async () => {
      mockFetch.mockRejectedValue(new TypeError("Failed to fetch"));

      const result = await strategy.testConnection();

      expect(result).toBe(false);
    });
  });

  describe("URL building", () => {
    it("should build URLs correctly", async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        headers: new Map(),
        text: vi.fn().mockResolvedValue("{}"),
      };
      mockFetch.mockResolvedValue(mockResponse);

      await strategy.execute({ endpoint: "/test", method: "GET" });

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.example.com/test",
        expect.any(Object)
      );
    });

    it("should handle empty endpoint", async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        headers: new Map(),
        text: vi.fn().mockResolvedValue("{}"),
      };
      mockFetch.mockResolvedValue(mockResponse);

      await strategy.execute({ endpoint: "", method: "GET" });

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.example.com",
        expect.any(Object)
      );
    });
  });

  describe("headers", () => {
    it("should merge default headers with request headers", async () => {
      const strategy = new HttpCommunicationStrategy({
        ...baseConfig,
        defaultHeaders: {
          "User-Agent": "OpenFarm SDK",
          Accept: "application/json",
        },
      });

      const mockResponse = {
        ok: true,
        status: 200,
        headers: new Map(),
        text: vi.fn().mockResolvedValue("{}"),
      };
      mockFetch.mockResolvedValue(mockResponse);

      await strategy.execute({
        endpoint: "/test",
        method: "GET",
        headers: {
          "X-Custom": "value",
          Accept: "text/plain", // Should override default
        },
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.example.com/test",
        expect.objectContaining({
          headers: {
            "User-Agent": "OpenFarm SDK",
            Accept: "text/plain", // Request header overrides default
            "X-Custom": "value",
          },
        })
      );
    });
  });

  describe("body handling", () => {
    it("should handle string body", async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        headers: new Map(),
        text: vi.fn().mockResolvedValue("{}"),
      };
      mockFetch.mockResolvedValue(mockResponse);

      await strategy.execute({
        endpoint: "/test",
        method: "POST",
        body: "raw string data",
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.example.com/test",
        expect.objectContaining({
          body: "raw string data",
        })
      );
    });

    it("should not include body for GET requests", async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        headers: new Map(),
        text: vi.fn().mockResolvedValue("{}"),
      };
      mockFetch.mockResolvedValue(mockResponse);

      await strategy.execute({
        endpoint: "/test",
        method: "GET",
        body: { should: "be ignored" },
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.example.com/test",
        expect.not.objectContaining({
          body: expect.anything(),
        })
      );
    });
  });
});
