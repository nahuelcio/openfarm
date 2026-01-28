import * as dbExports from "../../src/db/index";

describe("DB Exports", () => {
  it("should export db alias", () => {
    // This test will fail until we actually export it
    expect(dbExports).toHaveProperty("db");
  });
});
