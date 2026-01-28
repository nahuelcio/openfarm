import { createDb } from "../src/db/connection";
import { getIntegrations } from "../src/db/integrations";

// Mock path and fs to avoid real disk access during tests
jest.mock("path", () => ({
  dirname: jest.fn().mockReturnValue("."),
  resolve: jest.fn().mockImplementation((p) => p),
}));

// Mock bun SQL
const mockSql = jest.fn().mockResolvedValue([]);
jest.mock(
  "bun",
  () => ({
    SQL: jest.fn().mockImplementation(() => mockSql),
  }),
  { virtual: true }
);

describe("Database", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should initialize database successfully", async () => {
    const result = await createDb({ dbPath: "test-db.sqlite" });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBeDefined();
    }
  });

  it("should retrieve integrations", async () => {
    const db = mockSql;
    mockSql.mockResolvedValueOnce([
      {
        id: "int-1",
        name: "Test Integration",
        type: "azure",
        credentials: "pat",
        organization: "org",
        created_at: new Date().toISOString(),
      },
    ]);

    const integrations = await getIntegrations(db);

    expect(integrations).toHaveLength(1);
    expect(integrations[0]?.id).toBe("int-1");
    expect(mockSql).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.stringContaining("SELECT * FROM integrations"),
      ])
    );
  });
});
