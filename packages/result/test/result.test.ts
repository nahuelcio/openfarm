import { describe, expect, it } from "vitest";
import {
  err,
  flatMap,
  map,
  mapError,
  match,
  ok,
  pipe,
  tap,
  unwrap,
  unwrapOr,
} from "../src/result";

describe("Result", () => {
  describe("ok", () => {
    it("should create ok result", () => {
      const result = ok(10);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe(10);
      }
    });
  });

  describe("err", () => {
    it("should create err result", () => {
      const result = err("error");
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe("error");
      }
    });
  });

  describe("map", () => {
    it("should map value", () => {
      const result = ok(10);
      const mapped = map(result, (x) => x * 2);
      expect(mapped).toEqual(ok(20));
    });

    it("should not map error", () => {
      const result = err("error" as const);
      const mapped = map(result, (x: number) => x * 2);
      expect(mapped).toEqual(err("error"));
    });
  });

  describe("flatMap", () => {
    it("should flatMap value", () => {
      const result = ok(10);
      const flatMapped = flatMap(result, (x) => ok(x * 2));
      expect(flatMapped).toEqual(ok(20));
    });

    it("should not flatMap error", () => {
      const result = err("error" as const);
      const flatMapped = flatMap(result, (x: number) => ok(x * 2));
      expect(flatMapped).toEqual(err("error"));
    });
  });

  describe("match", () => {
    it("should match ok result", () => {
      const result = ok(10);
      const output = match(
        result,
        (val) => `Value is ${val}`,
        (err) => `Error is ${err}`
      );
      expect(output).toBe("Value is 10");
    });

    it("should match err result", () => {
      const result = err("error" as const);
      const output = match(
        result,
        (val) => `Value is ${val}`,
        (err) => `Error is ${err}`
      );
      expect(output).toBe("Error is error");
    });
  });

  describe("pipe", () => {
    it("should pipe results", async () => {
      const pipeline = pipe(
        (x: number) => ok(x * 2),
        (x: number) => ok(x + 1)
      );

      const result = await pipeline(10);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe(21); // 10 * 2 = 20, + 1 = 21
      }
    });

    it("should short-circuit on error", async () => {
      const pipeline = pipe(
        (x: number) => ok(x * 2),
        (x: number) => (x > 15 ? err("too big" as const) : ok(x))
      );

      const result = await pipeline(10);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe("too big");
      }
    });
  });

  describe("tap", () => {
    it("should tap ok result", async () => {
      let tapped = 0;
      const result = ok(10);

      await tap((val: number) => {
        tapped = val;
      })(result);

      expect(tapped).toBe(10);
    });

    it("should not tap err result", async () => {
      let tapped = 0;
      const result = err("error" as const);

      await tap((val: number) => {
        tapped = val;
      })(result);

      expect(tapped).toBe(0);
    });
  });

  describe("mapError", () => {
    it("should map error", () => {
      const result = err("original error" as const);
      const mapped = mapError(result, (e) => e.toUpperCase());
      expect(mapped).toEqual(err("ORIGINAL ERROR"));
    });

    it("should not map ok result", () => {
      const result = ok(10);
      const mapped = mapError(result, (e: string) => e.toUpperCase());
      expect(mapped).toEqual(ok(10));
    });
  });

  describe("unwrap", () => {
    it("should unwrap ok result", () => {
      const result = ok(10);
      expect(unwrap(result)).toBe(10);
    });

    it("should throw on err result", () => {
      const result = err("error" as const);
      expect(() => unwrap(result)).toThrow("error");
    });
  });

  describe("unwrapOr", () => {
    it("should unwrap ok result", () => {
      const result = ok(10);
      expect(unwrapOr(result, 5)).toBe(10);
    });

    it("should return default on err result", () => {
      const result = err("error" as const);
      expect(unwrapOr(result, 5)).toBe(5);
    });
  });
});
