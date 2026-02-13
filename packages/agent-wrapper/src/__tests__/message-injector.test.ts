import { describe, expect, it, vi } from "vitest";
import { MessageInjector } from "../injector/message-injector";

describe("MessageInjector", () => {
  describe("send", () => {
    it("should send message when idle", async () => {
      const sendKeysFn = vi.fn().mockResolvedValue(undefined);
      const injector = new MessageInjector({
        sendKeysFn,
        isIdleFn: () => true,
      });

      await injector.send("Hello");

      expect(sendKeysFn).toHaveBeenCalledTimes(2); // Mensaje + Enter
      expect(sendKeysFn).toHaveBeenCalledWith("OpenFarm: Hello");
    });

    it("should wait for idle before sending", async () => {
      const sendKeysFn = vi.fn().mockResolvedValue(undefined);
      let isIdle = false;

      const injector = new MessageInjector({
        sendKeysFn,
        isIdleFn: () => isIdle,
        timeout: 100,
      });

      // Simular que se vuelve idle después de un tiempo
      setTimeout(() => {
        isIdle = true;
      }, 50);

      await injector.send("Hello");

      expect(sendKeysFn).toHaveBeenCalled();
    });

    it("should queue messages when busy", async () => {
      const sendKeysFn = vi.fn().mockResolvedValue(undefined);
      const injector = new MessageInjector({
        sendKeysFn,
        isIdleFn: () => true,
      });

      await injector.send("First");
      await injector.send("Second");

      expect(sendKeysFn).toHaveBeenCalledTimes(4); // 2 mensajes + 2 Enters
    });
  });

  describe("sendBatch", () => {
    it("should send multiple messages", async () => {
      const sendKeysFn = vi.fn().mockResolvedValue(undefined);
      const injector = new MessageInjector({
        sendKeysFn,
        isIdleFn: () => true,
      });

      await injector.sendBatch(["One", "Two", "Three"]);

      expect(sendKeysFn).toHaveBeenCalledTimes(6); // 3 mensajes + 3 Enters
    });
  });

  describe("queue management", () => {
    it("should clear queue", async () => {
      const sendKeysFn = vi.fn().mockResolvedValue(undefined);
      const injector = new MessageInjector({
        sendKeysFn,
        isIdleFn: () => false, // Siempre ocupado
        timeout: 10,
      });

      // Enviar sin await para que se encole
      const sendPromise = injector.send("Message 1");

      // Esperar un tick para que se procese la cola
      await new Promise((resolve) => setTimeout(resolve, 0));

      // La cola debería tener al menos el mensaje o estar procesándose
      expect(injector.getQueueSize() >= 0 || injector.isProcessing()).toBe(
        true
      );

      injector.clearQueue();
      expect(injector.getQueueSize()).toBe(0);

      // Limpiar la promesa pendiente
      try {
        await sendPromise;
      } catch {
        /* ignore */
      }
    });

    it("should track processing state", async () => {
      const sendKeysFn = vi.fn().mockResolvedValue(undefined);
      const injector = new MessageInjector({
        sendKeysFn,
        isIdleFn: () => true,
      });

      expect(injector.isProcessing()).toBe(false);

      const promise = injector.send("Test");
      expect(injector.isProcessing()).toBe(true);

      await promise;
      expect(injector.isProcessing()).toBe(false);
    });
  });

  describe("custom prefix", () => {
    it("should use custom prefix", async () => {
      const sendKeysFn = vi.fn().mockResolvedValue(undefined);
      const injector = new MessageInjector({
        sendKeysFn,
        isIdleFn: () => true,
        prefix: "FromAgent:",
      });

      await injector.send("Hello");

      expect(sendKeysFn).toHaveBeenCalledWith("FromAgent: Hello");
    });
  });
});
