import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { OpenCodeExecutor } from "../opencode";

/**
 * E2E Tests for OpenCodeExecutor
 *
 * PREREQUISITES FOR LOCAL MODE:
 * - bunx and opencode-ai must be installed
 * - Credentials configured via environment variables:
 *   - ANTHROPIC_API_KEY, COPILOT_TOKEN, OPENROUTER_API_KEY, or ZAI_API_KEY
 * - NO SERVER REQUIRED! Local mode runs standalone CLI
 *
 * PREREQUISITES FOR CLOUD MODE:
 * - Server must be running on specified baseUrl
 */

describe("OpenCodeExecutor E2E Tests", () => {
  describe("Local Mode (CLI - Standalone)", () => {
    let executor: OpenCodeExecutor;

    beforeAll(async () => {
      executor = new OpenCodeExecutor({ mode: "local" });
      console.log("\nℹ️  Local mode uses standalone CLI (no server needed)\n");
    });

    it(
      "should always return true for testConnection in local mode",
      async () => {
        const connected = await executor.testConnection();
        expect(connected).toBe(true);
      },
      10000
    );

    it(
      "should execute a simple task via CLI standalone",
      async () => {
        const result = await executor.execute({
          task: 'Create a simple response saying "Hello from OpenCode"',
          model: "github-copilot/gpt-5-mini",
        });

        expect(result).toBeDefined();
        expect(result.duration).toBeGreaterThan(0);

        // The task might fail if credentials are not configured
        // So we check both success and failure cases
        if (result.success) {
          expect(result.output).toBeDefined();
          expect(result.output).toContain("OpenCode execution completed");
        } else {
          expect(result.error).toBeDefined();
          console.log(
            "Task failed (likely missing env vars like ANTHROPIC_API_KEY):",
            result.error
          );
        }
      },
      120000 // 2 minute timeout for real execution
    );

    it(
      "should return properly formatted ExecutionResult",
      async () => {
        const result = await executor.execute({
          task: "Respond with a brief greeting",
          model: "github-copilot/gpt-5-mini",
        });

        // Verify result structure regardless of success/failure
        expect(result).toMatchObject({
          success: expect.any(Boolean),
          duration: expect.any(Number),
        });

        if (result.success) {
          expect(result.output).toBeDefined();
          expect(typeof result.output).toBe("string");
          expect(result.tokens).toBeGreaterThanOrEqual(0);
          expect(result.error).toBeUndefined();
        } else {
          expect(result.error).toBeDefined();
        }
      },
      120000
    );

    it(
      "should handle CLI spawn errors gracefully",
      async () => {
        // This test verifies error handling without needing the server
        const result = await executor.execute({
          task: "Test task",
        });

        // Should return a valid ExecutionResult even on error
        expect(result).toBeDefined();
        expect(result.duration).toBeGreaterThan(0);
        expect(typeof result.success).toBe("boolean");

        if (!result.success) {
          expect(result.error).toBeDefined();
        }
      },
      10000
    );
  });

  describe("Cloud Mode (HTTP)", () => {
    it("should require baseUrl for cloud mode", async () => {
      const executor = new OpenCodeExecutor({ mode: "cloud" });

      const result = await executor.execute({
        task: "Test task",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("baseUrl is required");
    });
  });

  describe("Configuration", () => {
    it("should use correct default configuration", () => {
      const executor = new OpenCodeExecutor({ mode: "local" });
      expect(executor.type).toBe("opencode");
    });

    it("should use default mode as local", () => {
      const executor = new OpenCodeExecutor();
      expect(executor.type).toBe("opencode");
    });
  });
});
