import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CommandParser } from "../../../output-parser/src";
import { OutputMonitor } from "../monitor/output-monitor";

describe("OutputMonitor", () => {
  let parser: CommandParser;

  beforeEach(() => {
    parser = new CommandParser();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("start/stop", () => {
    it("should start and stop monitoring", () => {
      const monitor = new OutputMonitor({
        captureFn: vi.fn().mockResolvedValue(""),
        parser,
        interval: 100,
      });

      expect(monitor.isRunning()).toBe(false);

      monitor.start();
      expect(monitor.isRunning()).toBe(true);

      monitor.stop();
      expect(monitor.isRunning()).toBe(false);
    });

    it("should not start twice", () => {
      const monitor = new OutputMonitor({
        captureFn: vi.fn().mockResolvedValue(""),
        parser,
      });

      monitor.start();
      monitor.start(); // No debería lanzar error

      expect(monitor.isRunning()).toBe(true);
      monitor.stop();
    });
  });

  describe("output detection", () => {
    it("should detect new output", async () => {
      let output = "";
      const onOutput = vi.fn();

      const monitor = new OutputMonitor({
        captureFn: vi.fn().mockImplementation(() => {
          output += "New line\n";
          return Promise.resolve(output);
        }),
        parser,
        onOutput,
      });

      await monitor.checkNow();
      expect(onOutput).toHaveBeenCalledWith("New line\n");

      await monitor.checkNow();
      expect(onOutput).toHaveBeenCalledWith("New line\n");
    });

    it("should not call onOutput for empty content", async () => {
      const onOutput = vi.fn();

      const monitor = new OutputMonitor({
        captureFn: vi.fn().mockResolvedValue("   "), // Solo espacios
        parser,
        onOutput,
      });

      await monitor.checkNow();
      expect(onOutput).not.toHaveBeenCalled();
    });
  });

  describe("command detection", () => {
    it("should detect commands in output", async () => {
      const onCommand = vi.fn();

      const monitor = new OutputMonitor({
        captureFn: vi.fn().mockResolvedValue("->openfarm:Bob Hello"),
        parser,
        onCommand,
      });

      await monitor.checkNow();

      expect(onCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "Bob",
          body: "Hello",
        })
      );
    });
  });

  describe("error handling", () => {
    it("should call onError when capture fails", async () => {
      const onError = vi.fn();

      const monitor = new OutputMonitor({
        captureFn: vi.fn().mockRejectedValue(new Error("Capture failed")),
        parser,
        onError,
      });

      await monitor.checkNow();

      expect(onError).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe("buffer management", () => {
    it("should track last output", async () => {
      const monitor = new OutputMonitor({
        captureFn: vi.fn().mockResolvedValue("Output content"),
        parser,
      });

      await monitor.checkNow();

      expect(monitor.getLastOutput()).toBe("Output content");
    });

    it("should clear buffer", async () => {
      const monitor = new OutputMonitor({
        captureFn: vi.fn().mockResolvedValue("Content"),
        parser,
      });

      await monitor.checkNow();
      monitor.clearBuffer();

      expect(monitor.getLastOutput()).toBe("");
    });
  });
});
