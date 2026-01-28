import type { GitConfig } from "@openfarm/core/types/git";
import { createPr } from "../src/index";

describe("createPr", () => {
  const mockConfig: GitConfig = {
    repoPath: "/test/repo",
    repoUrl: "https://dev.azure.com/org/project/_git/repo",
    gitUserEmail: "test@example.com",
    gitUserName: "Test User",
  };

  it("should return simulated PR URL", async () => {
    const result = await createPr(
      mockConfig,
      "Test PR",
      "Test description",
      "feature-branch"
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toContain("feature-branch");
      expect(result.value).toContain("PR for");
    }
  });
});
