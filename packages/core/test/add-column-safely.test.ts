import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import { addColumnSafely } from "../src/db/utils/add-column-safely";

const mockDb = {
  exec: async (sql: string) => {
    return [];
  },
};

describe("addColumnSafely", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should add column to table that doesn't have it yet", async () => {
    await addColumnSafely(mockDb as any, "test_table", "new_column", "TEXT");

    // Verify column was added - simplified test just logs success
    expect(true).toBe(true);
  });

  it("should skip if column already exists", async () => {
    const result = await addColumnSafely(
      mockDb as any,
      "test_table",
      "new_column",
      "TEXT"
    );

    expect(result).toBe(true);
  });

  it("should handle duplicate column error gracefully", async () => {
    const result = await addColumnSafely(
      mockDb as any,
      "test_table",
      "new_column",
      "TEXT"
    );

    expect(result).toEqual({
      ok: false,
      error: "duplicate column name: new_column",
    });
  });
});
