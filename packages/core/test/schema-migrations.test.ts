import { describe, expect, it, vi } from "vitest";
import { addColumnSafely } from "../src/db/utils/add-column-safely";

/**
 * Tests for schema-migrations addColumnSafely helper.
 *
 * These tests follow TDD RED -> GREEN -> REFACTOR cycle:
 * - RED: Write failing tests first
 * - GREEN: Implement function to make tests pass
 * - REFACTOR: Refactor code to use the helper
 */

describe("schema-migrations", () => {
  describe("addColumnSafely", () => {
    it("should add column to table that doesn't have it yet", async () => {
      const mockDb = {
        exec: vi.fn().mockResolvedValue([]),
      };

      await addColumnSafely(
        mockDb as any,
        "test_table",
        "new_column",
        "new_column_def TEXT"
      );

      expect(mockDb.exec).toHaveBeenCalledWith(
        "ALTER TABLE test_table ADD COLUMN new_column new_column_def TEXT"
      );
    });

    it("should handle duplicate column error gracefully", async () => {
      const mockDb = {
        exec: vi
          .fn()
          .mockRejectedValue(new Error("duplicate column name: new_column")),
      };

      // Should not throw when column already exists (handled gracefully)
      await expect(
        addColumnSafely(mockDb as any, "test_table", "new_column", "TEXT")
      ).resolves.toBeUndefined();
    });

    it("should handle unknown database errors", async () => {
      const mockDb = {
        exec: vi
          .fn()
          .mockRejectedValue(new Error("database connection failed")),
      };

      await expect(
        addColumnSafely(mockDb as any, "test_table", "new_column", "TEXT")
      ).rejects.toThrow("database connection failed");
    });
  });
});
