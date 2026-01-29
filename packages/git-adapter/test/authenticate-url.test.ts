import { describe, expect, it } from "vitest";
import { authenticateAzureDevOpsUrl } from "../src/index";

describe("authenticateAzureDevOpsUrl", () => {
  it("should return URL unchanged when no PAT is provided", () => {
    const url = "https://dev.azure.com/org/project/_git/repo";
    expect(authenticateAzureDevOpsUrl(url)).toBe(url);
    expect(authenticateAzureDevOpsUrl(url, undefined)).toBe(url);
  });

  it("should return URL unchanged when already authenticated", () => {
    const url = "https://pat@dev.azure.com/org/project/_git/repo";
    expect(authenticateAzureDevOpsUrl(url, "new-pat")).toBe(url);
  });

  it("should return URL unchanged for non-Azure DevOps URLs", () => {
    const url = "https://github.com/owner/repo.git";
    expect(authenticateAzureDevOpsUrl(url, "pat")).toBe(url);
  });

  it("should authenticate Azure DevOps URL with PAT", () => {
    const url = "https://dev.azure.com/org/project/_git/repo";
    const pat = "test-pat-token";
    const result = authenticateAzureDevOpsUrl(url, pat);
    expect(result).toContain(pat);
    expect(result).toContain("dev.azure.com");
  });

  it("should authenticate visualstudio.com URL with PAT", () => {
    const url = "https://org.visualstudio.com/project/_git/repo";
    const pat = "test-pat-token";
    const result = authenticateAzureDevOpsUrl(url, pat);
    expect(result).toContain(pat);
    expect(result).toContain("visualstudio.com");
  });

  it("should handle URL parsing errors gracefully", () => {
    const url = "not-a-valid-url";
    const pat = "test-pat";
    // Should not throw, but may return modified URL
    expect(() => authenticateAzureDevOpsUrl(url, pat)).not.toThrow();
  });
});
