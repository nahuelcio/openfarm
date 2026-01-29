import type { Result } from "@openfarm/result";
import { err, ok } from "@openfarm/result";
import { describe, expect, it } from "vitest";
import {
  chunk,
  filterAsync,
  mapAsync,
  parallel,
  retry,
  sequence,
  withTimeout,
} from "../src/index";

describe("Utils", () => {
  describe("chunk", () => {
    it("should chunk array into smaller arrays", () => {
      const array = [1, 2, 3, 4, 5, 6, 7];
      const result = chunk(array, 3);
      expect(result).toEqual([[1, 2, 3], [4, 5, 6], [7]]);
    });

    it("should handle empty array", () => {
      const result = chunk([], 3);
      expect(result).toEqual([]);
    });

    it("should handle chunk size larger than array", () => {
      const result = chunk([1, 2], 5);
      expect(result).toEqual([[1, 2]]);
    });
  });

  describe("retry", () => {
    it("should succeed on first attempt", async () => {
      let attempts = 0;
      const fn = async () => {
        attempts++;
        return "success";
      };

      const result = await retry(fn, { maxAttempts: 3 });
      expect(result).toBe("success");
      expect(attempts).toBe(1);
    });

    it("should retry on failure", async () => {
      let attempts = 0;
      const fn = async () => {
        attempts++;
        if (attempts < 3) {
          throw new Error("fail");
        }
        return "success";
      };

      const result = await retry(fn, { maxAttempts: 3 });
      expect(result).toBe("success");
      expect(attempts).toBe(3);
    });

    it("should throw after max attempts", async () => {
      const fn = async () => {
        throw new Error("always fail");
      };

      await expect(retry(fn, { maxAttempts: 3 })).rejects.toThrow(
        "always fail"
      );
    });
  });

  describe("withTimeout", () => {
    it("should resolve if operation completes in time", async () => {
      const promise = new Promise((resolve) =>
        setTimeout(() => resolve("done"), 50)
      );
      const result = await withTimeout(promise, 1000);
      expect(result).toBe("done");
    });

    it("should reject if operation times out", async () => {
      const promise = new Promise((resolve) =>
        setTimeout(() => resolve("done"), 500)
      );
      await expect(withTimeout(promise, 100)).rejects.toThrow(
        "Operation timed out"
      );
    });
  });

  describe("sequence", () => {
    it("should sequence results", async () => {
      const results: Promise<Result<number, Error>>[] = [
        Promise.resolve(ok(1)),
        Promise.resolve(ok(2)),
        Promise.resolve(ok(3)),
      ];
      const result = await sequence(results);
      expect(result).toEqual(ok([1, 2, 3]));
    });

    it("should return first error", async () => {
      const results: Promise<Result<number, string>>[] = [
        Promise.resolve(ok(1)),
        Promise.resolve(err("error")),
        Promise.resolve(ok(3)),
      ];
      const result = await sequence(results);
      expect(result).toEqual(err("error"));
    });
  });

  describe("parallel", () => {
    it("should run in parallel", async () => {
      const results: Promise<Result<number, Error>>[] = [
        Promise.resolve(ok(1)),
        Promise.resolve(ok(2)),
        Promise.resolve(ok(3)),
      ];
      const result = await parallel(results);
      expect(result).toEqual(ok([1, 2, 3]));
    });
  });

  describe("mapAsync", () => {
    it("should map array asynchronously", async () => {
      const array = [1, 2, 3];
      const result = await mapAsync(array, async (x) => ok(x * 2));
      expect(result).toEqual(ok([2, 4, 6]));
    });
  });

  describe("filterAsync", () => {
    it("should filter array asynchronously", async () => {
      const array = [1, 2, 3, 4, 5];
      const result = await filterAsync(array, async (x) => x > 2);
      expect(result).toEqual([3, 4, 5]);
    });
  });
});
