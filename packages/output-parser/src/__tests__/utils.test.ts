import { describe, expect, it } from "vitest";
import { hasAnsi, stripAnsi } from "../utils/ansi-stripper";
import { extractOutsideFences, isInsideCodeFence } from "../utils/code-fence";
import { DeduplicationSet, simpleHash } from "../utils/dedup";

describe("ansi-stripper", () => {
	describe("stripAnsi", () => {
		it("should remove color codes", () => {
			const colored = "\u001b[32mGreen\u001b[0m";
			expect(stripAnsi(colored)).toBe("Green");
		});

		it("should remove multiple codes", () => {
			const colored = "\u001b[1m\u001b[32mBold Green\u001b[0m";
			expect(stripAnsi(colored)).toBe("Bold Green");
		});

		it("should leave plain text unchanged", () => {
			const plain = "Just plain text";
			expect(stripAnsi(plain)).toBe("Just plain text");
		});

		it("should handle empty string", () => {
			expect(stripAnsi("")).toBe("");
		});
	});

	describe("hasAnsi", () => {
		it("should return true for colored text", () => {
			expect(hasAnsi("\u001b[32mGreen\u001b[0m")).toBe(true);
		});

		it("should return false for plain text", () => {
			expect(hasAnsi("Plain text")).toBe(false);
		});
	});
});

describe("code-fence", () => {
	describe("isInsideCodeFence", () => {
		it("should return true for position inside fence", () => {
			const text = "```\ncode\n```";
			expect(isInsideCodeFence(text, 5)).toBe(true);
		});

		it("should return false for position outside fence", () => {
			const text = "Text\n```\ncode\n```\nMore text";
			expect(isInsideCodeFence(text, 0)).toBe(false);
		});

		it("should handle multiple fences", () => {
			const text = "```\nfirst\n```\nText\n```\nsecond\n```";
			// Find position of "second" inside the second fence
			const secondPos = text.indexOf("second");
			expect(isInsideCodeFence(text, secondPos)).toBe(true);
			// Verify "Text" is outside fences
			const textPos = text.indexOf("Text");
			expect(isInsideCodeFence(text, textPos)).toBe(false);
		});
	});

	describe("extractOutsideFences", () => {
		it("should replace fences with spaces", () => {
			const text = "```\ncode\n```";
			const result = extractOutsideFences(text);
			expect(result).not.toContain("code");
			expect(result.length).toBe(text.length);
		});

		it("should keep text outside fences", () => {
			const text = "Hello\n```\ncode\n```\nWorld";
			const result = extractOutsideFences(text);
			expect(result).toContain("Hello");
			expect(result).toContain("World");
		});
	});
});

describe("dedup", () => {
	describe("DeduplicationSet", () => {
		it("should add and check items", () => {
			const set = new DeduplicationSet();
			set.add("hash1");
			expect(set.has("hash1")).toBe(true);
			expect(set.has("hash2")).toBe(false);
		});

		it("should checkAndAdd correctly", () => {
			const set = new DeduplicationSet();
			expect(set.checkAndAdd("hash1")).toBe(false); // Nuevo
			expect(set.checkAndAdd("hash1")).toBe(true); // Duplicado
		});

		it("should clear all items", () => {
			const set = new DeduplicationSet();
			set.add("hash1");
			set.clear();
			expect(set.has("hash1")).toBe(false);
			expect(set.size).toBe(0);
		});

		it("should track size", () => {
			const set = new DeduplicationSet();
			set.add("hash1");
			set.add("hash2");
			expect(set.size).toBe(2);
		});

		it("should expire old items", async () => {
			const set = new DeduplicationSet(10); // 10ms window
			set.add("hash1");
			expect(set.has("hash1")).toBe(true);

			// Esperar a que expire
			await new Promise((resolve) => setTimeout(resolve, 20));

			// Al agregar otro item, se dispara la limpieza
			set.add("hash2");
			expect(set.has("hash1")).toBe(false);
		});
	});

	describe("simpleHash", () => {
		it("should generate consistent hashes", () => {
			const hash1 = simpleHash("test");
			const hash2 = simpleHash("test");
			expect(hash1).toBe(hash2);
		});

		it("should generate different hashes for different inputs", () => {
			const hash1 = simpleHash("test1");
			const hash2 = simpleHash("test2");
			expect(hash1).not.toBe(hash2);
		});

		it("should return hexadecimal string", () => {
			const hash = simpleHash("test");
			expect(hash).toMatch(/^[0-9a-f]+$/);
		});
	});
});
