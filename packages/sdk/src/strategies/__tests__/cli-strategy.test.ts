/**
 * Unit tests for CliCommunicationStrategy.
 *
 * Tests CLI communication with mocked child_process to avoid external dependencies.
 */

import type { ChildProcess } from "node:child_process";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock child_process module
vi.mock("node:child_process", () => ({
  spawn: vi.fn(),
}));

import { spawn } from "node:child_process";
import { CliCommunicationStrategy, type CliConfig } from "../cli-strategy";

// Mock spawn function type
let mockSpawn: ReturnType<typeof vi.fn>;

// Mock process object
const mockProcess = {
  cwd: vi.fn(() => "/mock/cwd"),
  env: { PATH: "/usr/bin", HOME: "/home/user" },
};
vi.stubGlobal("process", mockProcess);

describe("CliCommunicationStrategy", () => {
  let strategy: CliCommunicationStrategy;
  let baseConfig: CliConfig;
  let mockChild: Partial<ChildProcess>;

  beforeEach(() => {
    baseConfig = {
      executable: "test-command",
      timeout: 5000,
      enableLogging: false,
    };
    strategy = new CliCommunicationStrategy(baseConfig);

    // Initialize mockSpawn
    mockSpawn = spawn as unknown as ReturnType<typeof vi.fn>;
    
    // Reset mocks
    mockSpawn.mockClear();

    // Create mock child process
    mockChild = {
      stdout: {
        setEncoding: vi.fn(),
        on: vi.fn(),
      } as any,
      stderr: {
        setEncoding: vi.fn(),
        on: vi.fn(),
      } as any,
      stdin: {
        write: vi.fn(),
        end: vi.fn(),
      } as any,
      on: vi.fn(),
      kill: vi.fn(),
      killed: false,
    };
  });

  describe("constructor", () => {
    it("should initialize with default configuration", () => {
      const strategy = new CliCommunicationStrategy({
        executable: "test-cmd",
      });
      expect(strategy.type).toBe("cli");
    });

    it("should merge configuration with defaults", () => {
      const config: CliConfig = {
        executable: "custom-cmd",
        defaultArgs: ["--verbose"],
        timeout: 10_000,
      };

      const strategy = new CliCommunicationStrategy(config);
      expect(strategy.type).toBe("cli");
    });
  });

  describe("execute", () => {
    it("should execute successful command", async () => {
      mockSpawn.mockReturnValue(mockChild);

      // Set up successful execution
      const executePromise = strategy.execute({
        args: ["--help"],
      });

      // Simulate stdout data
      const stdoutCallback = (mockChild.stdout!.on as any).mock.calls.find(
        (call: any[]) => call[0] === "data"
      )?.[1];
      if (stdoutCallback) {
        stdoutCallback("Command output\n");
      }

      // Simulate process close
      const closeCallback = (mockChild.on as any).mock.calls.find(
        (call: any[]) => call[0] === "close"
      )?.[1];
      if (closeCallback) {
        closeCallback(0, null); // Exit code 0, no signal
      }

      const response = await executePromise;

      expect(mockSpawn).toHaveBeenCalledWith(
        "test-command",
        ["--help"],
        expect.objectContaining({
          cwd: "/mock/cwd",
          stdio: ["pipe", "pipe", "pipe"],
        })
      );

      expect(response.success).toBe(true);
      expect(response.status).toBe(0);
      expect(response.body).toBe("Command output\n");
      expect(response.duration).toBeGreaterThanOrEqual(0);
    });

    it("should handle command with arguments", async () => {
      mockSpawn.mockReturnValue(mockChild);

      const executePromise = strategy.execute({
        args: ["--input", "file.txt", "--output", "result.txt"],
      });

      // Simulate process close
      const closeCallback = (mockChild.on as any).mock.calls.find(
        (call: any[]) => call[0] === "close"
      )?.[1];
      if (closeCallback) {
        closeCallback(0, null);
      }

      await executePromise;

      expect(mockSpawn).toHaveBeenCalledWith(
        "test-command",
        ["--input", "file.txt", "--output", "result.txt"],
        expect.any(Object)
      );
    });

    it("should handle command with default arguments", async () => {
      const strategyWithDefaults = new CliCommunicationStrategy({
        executable: "test-cmd",
        defaultArgs: ["--verbose", "--format=json"],
      });

      mockSpawn.mockReturnValue(mockChild);

      const executePromise = strategyWithDefaults.execute({
        args: ["--input", "test.txt"],
      });

      // Simulate process close
      const closeCallback = (mockChild.on as any).mock.calls.find(
        (call: any[]) => call[0] === "close"
      )?.[1];
      if (closeCallback) {
        closeCallback(0, null);
      }

      await executePromise;

      expect(mockSpawn).toHaveBeenCalledWith(
        "test-cmd",
        ["--verbose", "--format=json", "--input", "test.txt"],
        expect.any(Object)
      );
    });

    it("should handle working directory", async () => {
      mockSpawn.mockReturnValue(mockChild);

      const executePromise = strategy.execute({
        args: ["--help"],
        workingDirectory: "/custom/path",
      });

      // Simulate process close
      const closeCallback = (mockChild.on as any).mock.calls.find(
        (call: any[]) => call[0] === "close"
      )?.[1];
      if (closeCallback) {
        closeCallback(0, null);
      }

      await executePromise;

      expect(mockSpawn).toHaveBeenCalledWith(
        "test-command",
        ["--help"],
        expect.objectContaining({
          cwd: "/custom/path",
        })
      );
    });

    it("should handle environment variables", async () => {
      mockSpawn.mockReturnValue(mockChild);

      const executePromise = strategy.execute({
        args: ["--help"],
        env: {
          CUSTOM_VAR: "value",
          DEBUG: "true",
        },
      });

      // Simulate process close
      const closeCallback = (mockChild.on as any).mock.calls.find(
        (call: any[]) => call[0] === "close"
      )?.[1];
      if (closeCallback) {
        closeCallback(0, null);
      }

      await executePromise;

      expect(mockSpawn).toHaveBeenCalledWith(
        "test-command",
        ["--help"],
        expect.objectContaining({
          env: expect.objectContaining({
            PATH: "/usr/bin", // Inherited
            HOME: "/home/user", // Inherited
            CUSTOM_VAR: "value", // Request-specific
            DEBUG: "true", // Request-specific
          }),
        })
      );
    });

    it("should handle command failure", async () => {
      mockSpawn.mockReturnValue(mockChild);

      const executePromise = strategy.execute({
        args: ["--invalid-flag"],
      });

      // Simulate stderr data
      const stderrCallback = (mockChild.stderr!.on as any).mock.calls.find(
        (call: any[]) => call[0] === "data"
      )?.[1];
      if (stderrCallback) {
        stderrCallback("Error: Invalid flag\n");
      }

      // Simulate process close with error
      const closeCallback = (mockChild.on as any).mock.calls.find(
        (call: any[]) => call[0] === "close"
      )?.[1];
      if (closeCallback) {
        closeCallback(1, null); // Exit code 1
      }

      const response = await executePromise;

      expect(response.success).toBe(false);
      expect(response.status).toBe(1);
      expect(response.error).toBe("Error: Invalid flag");
    });

    it("should handle process timeout", async () => {
      const shortTimeoutStrategy = new CliCommunicationStrategy({
        executable: "test-command",
        timeout: 100, // Very short timeout
      });

      mockSpawn.mockReturnValue(mockChild);

      const executePromise = shortTimeoutStrategy.execute({
        args: ["--slow-operation"],
      });

      // Don't simulate process close to trigger timeout
      // Wait for timeout to occur
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Simulate timeout kill
      const closeCallback = (mockChild.on as any).mock.calls.find(
        (call: any[]) => call[0] === "close"
      )?.[1];
      if (closeCallback) {
        closeCallback(null, "SIGTERM"); // Killed by signal
      }

      const response = await executePromise;

      expect(response.success).toBe(false);
      expect(response.error).toContain("Process timed out");
      expect(response.metadata?.timedOut).toBe(true);
      expect(mockChild.kill).toHaveBeenCalledWith("SIGTERM");
    });

    it("should handle stdin input", async () => {
      mockSpawn.mockReturnValue(mockChild);

      const executePromise = strategy.execute({
        args: ["--read-stdin"],
        body: "input data for command",
      });

      // Simulate process close
      const closeCallback = (mockChild.on as any).mock.calls.find(
        (call: any[]) => call[0] === "close"
      )?.[1];
      if (closeCallback) {
        closeCallback(0, null);
      }

      await executePromise;

      expect(mockChild.stdin!.write).toHaveBeenCalledWith(
        "input data for command",
        "utf8"
      );
      expect(mockChild.stdin!.end).toHaveBeenCalled();
    });

    it("should handle JSON input", async () => {
      mockSpawn.mockReturnValue(mockChild);

      const executePromise = strategy.execute({
        args: ["--read-json"],
        body: { key: "value", number: 42 },
      });

      // Simulate process close
      const closeCallback = (mockChild.on as any).mock.calls.find(
        (call: any[]) => call[0] === "close"
      )?.[1];
      if (closeCallback) {
        closeCallback(0, null);
      }

      await executePromise;

      expect(mockChild.stdin!.write).toHaveBeenCalledWith(
        '{"key":"value","number":42}',
        "utf8"
      );
    });

    it("should handle spawn errors", async () => {
      mockSpawn.mockImplementation(() => {
        throw new Error("ENOENT: command not found");
      });

      const response = await strategy.execute({
        args: ["--help"],
      });

      expect(response.success).toBe(false);
      expect(response.status).toBe(127); // Command not found
      expect(response.error).toContain("Command not found");
    });

    it("should handle process errors", async () => {
      mockSpawn.mockReturnValue(mockChild);

      const executePromise = strategy.execute({
        args: ["--help"],
      });

      // Simulate process error
      const errorCallback = (mockChild.on as any).mock.calls.find(
        (call: any[]) => call[0] === "error"
      )?.[1];
      if (errorCallback) {
        errorCallback(new Error("Process failed to start"));
      }

      const response = await executePromise;

      expect(response.success).toBe(false);
      expect(response.error).toContain("Process error");
    });
  });

  describe("testConnection", () => {
    it("should return true for successful connection test", async () => {
      mockSpawn.mockReturnValue(mockChild);

      const testPromise = strategy.testConnection();

      // Simulate process close with success
      const closeCallback = (mockChild.on as any).mock.calls.find(
        (call: any[]) => call[0] === "close"
      )?.[1];
      if (closeCallback) {
        closeCallback(0, null);
      }

      const result = await testPromise;

      expect(result).toBe(true);
      expect(mockSpawn).toHaveBeenCalledWith(
        "test-command",
        ["--version"],
        expect.any(Object)
      );
    });

    it("should return false for command not found", async () => {
      mockSpawn.mockReturnValue(mockChild);

      const testPromise = strategy.testConnection();

      // Simulate command not found
      const closeCallback = (mockChild.on as any).mock.calls.find(
        (call: any[]) => call[0] === "close"
      )?.[1];
      if (closeCallback) {
        closeCallback(127, null); // Command not found
      }

      const result = await testPromise;

      expect(result).toBe(false);
    });

    it("should return true for non-zero exit but command exists", async () => {
      mockSpawn.mockReturnValue(mockChild);

      const testPromise = strategy.testConnection();

      // Simulate command exists but --version not supported
      const closeCallback = (mockChild.on as any).mock.calls.find(
        (call: any[]) => call[0] === "close"
      )?.[1];
      if (closeCallback) {
        closeCallback(1, null); // Non-zero but not 127
      }

      const result = await testPromise;

      expect(result).toBe(true); // Command exists, just doesn't support --version
    });

    it("should return false for spawn errors", async () => {
      mockSpawn.mockImplementation(() => {
        throw new Error("ENOENT");
      });

      const result = await strategy.testConnection();

      expect(result).toBe(false);
    });
  });

  describe("buffer management", () => {
    it("should handle large stdout output", async () => {
      const strategyWithSmallBuffer = new CliCommunicationStrategy({
        executable: "test-command",
        maxBufferSize: 100, // Very small buffer
      });

      mockSpawn.mockReturnValue(mockChild);

      const executePromise = strategyWithSmallBuffer.execute({
        args: ["--large-output"],
      });

      // Simulate large stdout data
      const stdoutCallback = (mockChild.stdout!.on as any).mock.calls.find(
        (call: any[]) => call[0] === "data"
      )?.[1];
      if (stdoutCallback) {
        // Send data that exceeds buffer size
        stdoutCallback("A".repeat(150));
      }

      // Process should be killed due to buffer overflow
      expect(mockChild.kill).toHaveBeenCalledWith("SIGTERM");

      // Simulate process close after kill
      const closeCallback = (mockChild.on as any).mock.calls.find(
        (call: any[]) => call[0] === "close"
      )?.[1];
      if (closeCallback) {
        closeCallback(null, "SIGTERM");
      }

      const response = await executePromise;

      expect(response.body).toContain("[OUTPUT TRUNCATED]");
    });

    it("should handle large stderr output", async () => {
      const strategyWithSmallBuffer = new CliCommunicationStrategy({
        executable: "test-command",
        maxBufferSize: 100,
        captureStderr: true,
      });

      mockSpawn.mockReturnValue(mockChild);

      const executePromise = strategyWithSmallBuffer.execute({
        args: ["--large-error"],
      });

      // Simulate large stderr data
      const stderrCallback = (mockChild.stderr!.on as any).mock.calls.find(
        (call: any[]) => call[0] === "data"
      )?.[1];
      if (stderrCallback) {
        stderrCallback("E".repeat(150));
      }

      // Process should be killed due to buffer overflow
      expect(mockChild.kill).toHaveBeenCalledWith("SIGTERM");

      // Simulate process close after kill
      const closeCallback = (mockChild.on as any).mock.calls.find(
        (call: any[]) => call[0] === "close"
      )?.[1];
      if (closeCallback) {
        closeCallback(null, "SIGTERM");
      }

      const response = await executePromise;

      expect(response.error).toContain("[ERROR OUTPUT TRUNCATED]");
    });
  });

  describe("configuration options", () => {
    it("should respect captureStderr setting", async () => {
      const strategyNoStderr = new CliCommunicationStrategy({
        executable: "test-command",
        captureStderr: false,
      });

      mockSpawn.mockReturnValue(mockChild);

      const executePromise = strategyNoStderr.execute({
        args: ["--help"],
      });

      // Simulate process close
      const closeCallback = (mockChild.on as any).mock.calls.find(
        (call: any[]) => call[0] === "close"
      )?.[1];
      if (closeCallback) {
        closeCallback(0, null);
      }

      await executePromise;

      // stderr.on should not be called when captureStderr is false
      expect(mockChild.stderr!.on).not.toHaveBeenCalled();
    });

    it("should use custom encoding", async () => {
      const strategyCustomEncoding = new CliCommunicationStrategy({
        executable: "test-command",
        encoding: "latin1",
      });

      mockSpawn.mockReturnValue(mockChild);

      const executePromise = strategyCustomEncoding.execute({
        args: ["--help"],
      });

      // Simulate process close
      const closeCallback = (mockChild.on as any).mock.calls.find(
        (call: any[]) => call[0] === "close"
      )?.[1];
      if (closeCallback) {
        closeCallback(0, null);
      }

      await executePromise;

      expect(mockChild.stdout!.setEncoding).toHaveBeenCalledWith("latin1");
      expect(mockChild.stderr!.setEncoding).toHaveBeenCalledWith("latin1");
    });

    it("should use custom kill signal", async () => {
      const strategyCustomSignal = new CliCommunicationStrategy({
        executable: "test-command",
        timeout: 100,
        killSignal: "SIGKILL",
      });

      mockSpawn.mockReturnValue(mockChild);

      const executePromise = strategyCustomSignal.execute({
        args: ["--slow"],
      });

      // Wait for timeout
      await new Promise((resolve) => setTimeout(resolve, 150));

      expect(mockChild.kill).toHaveBeenCalledWith("SIGKILL");

      // Simulate process close
      const closeCallback = (mockChild.on as any).mock.calls.find(
        (call: any[]) => call[0] === "close"
      )?.[1];
      if (closeCallback) {
        closeCallback(null, "SIGKILL");
      }

      await executePromise;
    });

    it("should handle shell option", async () => {
      const strategyWithShell = new CliCommunicationStrategy({
        executable: "echo",
        shell: true,
      });

      mockSpawn.mockReturnValue(mockChild);

      const executePromise = strategyWithShell.execute({
        args: ["hello world"],
      });

      // Simulate process close
      const closeCallback = (mockChild.on as any).mock.calls.find(
        (call: any[]) => call[0] === "close"
      )?.[1];
      if (closeCallback) {
        closeCallback(0, null);
      }

      await executePromise;

      expect(mockSpawn).toHaveBeenCalledWith(
        "echo",
        ["hello world"],
        expect.objectContaining({
          shell: true,
        })
      );
    });
  });

  describe("environment variable handling", () => {
    it("should inherit environment by default", async () => {
      mockSpawn.mockReturnValue(mockChild);

      const executePromise = strategy.execute({
        args: ["--help"],
      });

      // Simulate process close
      const closeCallback = (mockChild.on as any).mock.calls.find(
        (call: any[]) => call[0] === "close"
      )?.[1];
      if (closeCallback) {
        closeCallback(0, null);
      }

      await executePromise;

      expect(mockSpawn).toHaveBeenCalledWith(
        "test-command",
        ["--help"],
        expect.objectContaining({
          env: expect.objectContaining({
            PATH: "/usr/bin",
            HOME: "/home/user",
          }),
        })
      );
    });

    it("should not inherit environment when disabled", async () => {
      const strategyNoInherit = new CliCommunicationStrategy({
        executable: "test-command",
        inheritEnv: false,
      });

      mockSpawn.mockReturnValue(mockChild);

      const executePromise = strategyNoInherit.execute({
        args: ["--help"],
      });

      // Simulate process close
      const closeCallback = (mockChild.on as any).mock.calls.find(
        (call: any[]) => call[0] === "close"
      )?.[1];
      if (closeCallback) {
        closeCallback(0, null);
      }

      await executePromise;

      expect(mockSpawn).toHaveBeenCalledWith(
        "test-command",
        ["--help"],
        expect.objectContaining({
          env: expect.not.objectContaining({
            PATH: "/usr/bin",
            HOME: "/home/user",
          }),
        })
      );
    });

    it("should merge default and request environment variables", async () => {
      const strategyWithDefaults = new CliCommunicationStrategy({
        executable: "test-command",
        defaultEnv: {
          DEFAULT_VAR: "default_value",
          OVERRIDE_ME: "default",
        },
      });

      mockSpawn.mockReturnValue(mockChild);

      const executePromise = strategyWithDefaults.execute({
        args: ["--help"],
        env: {
          REQUEST_VAR: "request_value",
          OVERRIDE_ME: "overridden",
        },
      });

      // Simulate process close
      const closeCallback = (mockChild.on as any).mock.calls.find(
        (call: any[]) => call[0] === "close"
      )?.[1];
      if (closeCallback) {
        closeCallback(0, null);
      }

      await executePromise;

      expect(mockSpawn).toHaveBeenCalledWith(
        "test-command",
        ["--help"],
        expect.objectContaining({
          env: expect.objectContaining({
            DEFAULT_VAR: "default_value",
            REQUEST_VAR: "request_value",
            OVERRIDE_ME: "overridden", // Request should override default
          }),
        })
      );
    });
  });
});
