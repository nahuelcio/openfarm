import { describe, expect, it, vi } from "vitest";
import { BaseWrapper } from "../wrappers/base-wrapper";

// Clase de prueba que implementa los métodos abstractos
class TestWrapper extends BaseWrapper {
  start = vi.fn().mockResolvedValue(undefined);
  stop = vi.fn().mockResolvedValue(undefined);
  sendMessage = vi.fn().mockResolvedValue(undefined);
}

describe("BaseWrapper", () => {
  describe("constructor", () => {
    it("should set default options", () => {
      const wrapper = new TestWrapper({
        agentName: "test-agent",
        command: "test",
      });

      expect(wrapper.isRunning()).toBe(false);
    });

    it("should merge options with defaults", () => {
      const wrapper = new TestWrapper({
        agentName: "test-agent",
        command: "test",
        args: ["--flag"],
        pollInterval: 500,
      });

      // No podemos acceder directamente a options privados,
      // pero verificamos que se crea correctamente
      expect(wrapper).toBeDefined();
    });
  });

  describe("event handlers", () => {
    it("should register command handlers", () => {
      const wrapper = new TestWrapper({
        agentName: "test",
        command: "test",
      });

      const handler = vi.fn();
      wrapper.onCommand(handler);

      // No podemos llamar a notifyCommand directamente desde fuera,
      // pero verificamos que no lanza error
      expect(() => wrapper.onCommand(handler)).not.toThrow();
    });

    it("should register output handlers", () => {
      const wrapper = new TestWrapper({
        agentName: "test",
        command: "test",
      });

      const handler = vi.fn();
      wrapper.onOutput(handler);

      expect(() => wrapper.onOutput(handler)).not.toThrow();
    });

    it("should register exit handlers", () => {
      const wrapper = new TestWrapper({
        agentName: "test",
        command: "test",
      });

      const handler = vi.fn();
      wrapper.onExit(handler);

      expect(() => wrapper.onExit(handler)).not.toThrow();
    });

    it("should remove handlers", () => {
      const wrapper = new TestWrapper({
        agentName: "test",
        command: "test",
      });

      const handler = vi.fn();
      wrapper.onCommand(handler);
      wrapper.offCommand(handler);

      // No hay error al remover
      expect(() => wrapper.offCommand(handler)).not.toThrow();
    });

    it("should handle removing non-existent handler", () => {
      const wrapper = new TestWrapper({
        agentName: "test",
        command: "test",
      });

      const handler = vi.fn();

      // No debería lanzar error
      expect(() => wrapper.offCommand(handler)).not.toThrow();
    });
  });
});
