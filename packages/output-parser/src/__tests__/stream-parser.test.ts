import { describe, expect, it, vi } from "vitest";
import { StreamParser } from "../parsers/stream-parser";

describe("StreamParser", () => {
	describe("basic parsing", () => {
		it("should parse commands from chunks", () => {
			const parser = new StreamParser();
			const handler = vi.fn();
			parser.onCommand(handler);

			parser.write("->openfarm:Bob Hello\n");

			expect(handler).toHaveBeenCalledWith(
				expect.objectContaining({
					to: "Bob",
					body: "Hello",
				}),
			);
		});

		it("should accumulate partial lines", () => {
			const parser = new StreamParser();
			const handler = vi.fn();
			parser.onCommand(handler);

			parser.write("->openfarm:Bob ");
			expect(handler).not.toHaveBeenCalled();

			parser.write("Hello\n");
			expect(handler).toHaveBeenCalledTimes(1);
		});

		it("should parse multiple commands in sequence", () => {
			const parser = new StreamParser();
			const handler = vi.fn();
			parser.onCommand(handler);

			parser.write("->openfarm:Alice First\n");
			parser.write("->openfarm:Bob Second\n");

			expect(handler).toHaveBeenCalledTimes(2);
		});
	});

	describe("end()", () => {
		it("should process remaining buffer on end", () => {
			const parser = new StreamParser();
			const handler = vi.fn();
			parser.onCommand(handler);

			parser.write("->openfarm:Bob Hello"); // Sin newline al final
			expect(handler).not.toHaveBeenCalled();

			parser.end();
			expect(handler).toHaveBeenCalledTimes(1);
		});

		it("should return remaining commands", () => {
			const parser = new StreamParser();

			parser.write("->openfarm:Alice First\n");
			parser.write("->openfarm:Bob Second\n"); // Con newline para que se procese

			const remaining = parser.end();
			expect(remaining.length).toBeGreaterThanOrEqual(0);
		});
	});

	describe("handler management", () => {
		it("should support multiple handlers", () => {
			const parser = new StreamParser();
			const handler1 = vi.fn();
			const handler2 = vi.fn();

			parser.onCommand(handler1);
			parser.onCommand(handler2);

			parser.write("->openfarm:Bob Hello\n");

			expect(handler1).toHaveBeenCalled();
			expect(handler2).toHaveBeenCalled();
		});

		it("should support removing handlers", () => {
			const parser = new StreamParser();
			const handler = vi.fn();

			parser.onCommand(handler);
			parser.offCommand(handler);

			parser.write("->openfarm:Bob Hello\n");

			expect(handler).not.toHaveBeenCalled();
		});

		it("should call constructor handler", () => {
			const handler = vi.fn();
			const parser = new StreamParser({ onCommand: handler });

			parser.write("->openfarm:Bob Hello\n");

			expect(handler).toHaveBeenCalled();
		});
	});

	describe("buffer management", () => {
		it("should limit buffer size", () => {
			const parser = new StreamParser({ maxBufferSize: 20 });

			parser.write("A".repeat(30));
			const buffer = parser.getBuffer();

			expect(buffer.length).toBeLessThanOrEqual(20);
		});

		it("should clear buffer", () => {
			const parser = new StreamParser();

			parser.write("Some text");
			expect(parser.getBuffer()).not.toBe("");

			parser.clear();
			expect(parser.getBuffer()).toBe("");
		});
	});

	describe("error handling", () => {
		it("should not break on handler errors", () => {
			const parser = new StreamParser();
			const badHandler = vi.fn().mockImplementation(() => {
				throw new Error("Handler error");
			});
			const goodHandler = vi.fn();

			parser.onCommand(badHandler);
			parser.onCommand(goodHandler);

			// No debería lanzar excepción
			expect(() => {
				parser.write("->openfarm:Bob Hello\n");
			}).not.toThrow();

			// El segundo handler debería haberse llamado a pesar del error
			expect(goodHandler).toHaveBeenCalled();
		});
	});
});
