import { describe, expect, it, vi } from "vitest";

const mockSql = vi.fn().mockResolvedValue([]);

// Mock bun SQL with better-sqlite3 interface
const mockDb = {
  prepare: vi.fn().mockImplementation(() => mockSql),
  exec: vi.fn().mockResolvedValue([]),
  query: vi.fn().mockResolvedValue([]),
  all: vi.fn().mockResolvedValue([]),
  get: vi.fn().mockResolvedValue([]),
};

vi.mock("bun", () => mockDb);

describe("db", () => {
  it("should have mock db setup", () => {
    expect(mockDb).toBeDefined();
  });
});
