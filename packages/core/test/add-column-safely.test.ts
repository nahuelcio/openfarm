import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { addColumnSafely } from "../src/db/utils/add-column-safely";

describe("addColumnSafely", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should add column to table that doesn't have it yet", async () => {
    const mockDb = {
      exec: vi.fn().mockResolvedValue([]),
    };

    await addColumnSafely(mockDb as any, "test_table", "new_column", "TEXT");

    expect(mockDb.exec).toHaveBeenCalledWith(
      "ALTER TABLE test_table ADD COLUMN new_column TEXT"
    );
  });

  it("should skip if column already exists", async () => {
    const mockDb = {
      exec: vi.fn().mockImplementation(() => {
        const error = new Error("duplicate column name: new_column");
        throw error;
      }),
    };

    // Should not throw when column already exists
    await expect(
      addColumnSafely(mockDb as any, "test_table", "new_column", "TEXT")
    ).resolves.not.toThrow();
  });

  it("should handle duplicate column error gracefully", async () => {
    const mockDb = {
      exec: vi.fn().mockImplementation(() => {
        const error = new Error("duplicate column name: new_column");
        throw error;
      }),
    };

    // Should not throw for duplicate column errors (they are handled gracefully)
    await expect(
      addColumnSafely(mockDb as any, "test_table", "new_column", "TEXT")
    ).resolves.not.toThrow();
  });
});
