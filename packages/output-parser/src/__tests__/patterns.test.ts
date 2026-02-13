import { describe, expect, it } from "vitest";
import {
  OPENFARM_BLOCK_PATTERN,
  OPENFARM_FENCED_PATTERN,
  OPENFARM_INLINE_PATTERN,
  RELAY_COMPAT_PATTERN,
} from "../patterns";

describe("Patterns", () => {
  describe("OPENFARM_INLINE_PATTERN", () => {
    it("should match basic command", () => {
      const match = "->openfarm:Bob Hello".match(OPENFARM_INLINE_PATTERN);
      expect(match).not.toBeNull();
      expect(match?.[1]).toBe("Bob");
      expect(match?.[2]).toBe("Hello");
    });

    it("should match with > prefix", () => {
      const match = "> ->openfarm:Alice Message".match(OPENFARM_INLINE_PATTERN);
      expect(match).not.toBeNull();
      expect(match?.[1]).toBe("Alice");
    });

    it("should match with $ prefix", () => {
      const match = "$ ->openfarm:Charlie Test".match(OPENFARM_INLINE_PATTERN);
      expect(match).not.toBeNull();
    });

    it("should match with bullet prefix", () => {
      const match = "● ->openfarm:Dave Hi".match(OPENFARM_INLINE_PATTERN);
      expect(match).not.toBeNull();
    });

    it("should not match without prefix", () => {
      const match = "hello openfarm:Bob".match(OPENFARM_INLINE_PATTERN);
      expect(match).toBeNull();
    });
  });

  describe("OPENFARM_FENCED_PATTERN", () => {
    it("should match fenced command", () => {
      const text = `->openfarm:Bob <<<
Multi
Line
>>>`;
      const matches = Array.from(text.matchAll(OPENFARM_FENCED_PATTERN));
      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0][1]).toBe("Bob");
      expect(matches[0][2]).toContain("Multi");
    });

    it("should match with content containing special chars", () => {
      const text = `->openfarm:Alice <<<
Code: function test() { return 1; }
>>>`;
      const matches = Array.from(text.matchAll(OPENFARM_FENCED_PATTERN));
      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0][2]).toContain("function");
    });
  });

  describe("OPENFARM_BLOCK_PATTERN", () => {
    it("should match JSON block", () => {
      const text = '[[OPENFARM]]{"to":"Bob"}[[/OPENFARM]]';
      const matches = Array.from(text.matchAll(OPENFARM_BLOCK_PATTERN));
      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0][1]).toBe('{"to":"Bob"}');
    });

    it("should match block with complex JSON", () => {
      const text =
        '[[OPENFARM]]{"to":"Alice","body":"Hello","data":{"key":"value"}}[[/OPENFARM]]';
      const matches = Array.from(text.matchAll(OPENFARM_BLOCK_PATTERN));
      expect(matches).toHaveLength(1);
      expect(matches[0][1]).toContain("Alice");
    });

    it("should match multiple blocks", () => {
      const text = `
[[OPENFARM]]{"to":"A"}[[/OPENFARM]]
[[OPENFARM]]{"to":"B"}[[/OPENFARM]]
      `.trim();
      const matches = Array.from(text.matchAll(OPENFARM_BLOCK_PATTERN));
      expect(matches).toHaveLength(2);
    });
  });

  describe("RELAY_COMPAT_PATTERN", () => {
    it("should match relay command", () => {
      const match = "->relay:Bob Hello".match(RELAY_COMPAT_PATTERN);
      expect(match).not.toBeNull();
      expect(match?.[1]).toBe("Bob");
      expect(match?.[2]).toBe("Hello");
    });

    it("should match with prefix", () => {
      const match = "> ->relay:Alice Message".match(RELAY_COMPAT_PATTERN);
      expect(match).not.toBeNull();
    });
  });
});
