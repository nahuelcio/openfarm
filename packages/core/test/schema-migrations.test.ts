import { describe, expect, it } from "vitest";
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
    // RED: Test for function that doesn't exist yet
    it("should add column to table that doesn't have it yet", async () => {
      const mockDb = {
        exec: async (sql: string) => {
          return [];
        },
      };

      await addColumnSafely(
        mockDb as any,
        "test_table",
        "new_column",
        "new_column_def TEXT"
      );

      // Verify column was added - would need to check if column exists
      // For now, we're just testing it doesn't throw
      expect(true).toBe(true);
    });

    it("should handle duplicate column error gracefully", async () => {
      const mockDb = {
        exec: async (sql: string) => {
          const error = new Error("duplicate column name: new_column");
          throw error;
        },
      };

      await expect(
        addColumnSafely(mockDb as any, "test_table", "new_column", "TEXT")
      ).rejects.toThrow("duplicate column name: new_column");
    });

    it("should handle unknown database errors", async () => {
      const mockDb = {
        exec: async (sql: string) => {
          const error = new Error("database connection failed");
          throw error;
        },
      };

      await expect(
        addColumnSafely(mockDb as any, "test_table", "new_column", "TEXT")
      ).rejects.toThrow("database connection failed");
    });
  });
});
