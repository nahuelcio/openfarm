import type { GitConfig } from "@openfarm/core/types/git";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  checkoutBranch,
  type ExecFunction,
  type FileSystem,
} from "../src/index";

describe("checkoutBranch", () => {
  const mockConfig: GitConfig = {
    repoPath: "/test/repo",
    repoUrl: "https://dev.azure.com/org/project/_git/repo",
    gitUserEmail: "test@example.com",
    gitUserName: "Test User",
  };

  const mockFs: FileSystem = {
    existsSync: vi.fn(),
  };

  const mockExec: ExecFunction = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return error when repository directory does not exist", async () => {
    (mockFs.existsSync as any).mockReturnValue(false);

    const result = await checkoutBranch(
      mockConfig,
      "feature-branch",
      "dev",
      mockFs,
      mockExec
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect((result as any).error.message).toContain(
        "Repository directory does not exist"
      );
    }
  });

  it("should return error when path exists but is not a git repository", async () => {
    (mockFs.existsSync as any).mockReturnValue(true);
    (mockExec as any).mockRejectedValue(
      new Error("fatal: not a git repository")
    );

    const result = await checkoutBranch(
      mockConfig,
      "feature-branch",
      "dev",
      mockFs,
      mockExec
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect((result as any).error.message).toContain(
        "not a valid git repository"
      );
    }
  });

  it("should return ok when already on target branch", async () => {
    (mockFs.existsSync as any).mockReturnValue(true);
    (mockExec as any)
      .mockResolvedValueOnce({ stdout: "", stderr: "" }) // rev-parse --git-dir
      .mockResolvedValueOnce({ stdout: "", stderr: "" }) // git config user.email
      .mockResolvedValueOnce({ stdout: "", stderr: "" }) // git config user.name
      .mockResolvedValueOnce({ stdout: "feature-branch\n", stderr: "" }) // rev-parse --abbrev-ref HEAD
      .mockResolvedValueOnce({ stdout: "", stderr: "" }); // pull

    const result = await checkoutBranch(
      mockConfig,
      "feature-branch",
      "dev",
      mockFs,
      mockExec
    );

    expect(result.ok).toBe(true);
  });

  it("should checkout default branch successfully", async () => {
    (mockFs.existsSync as any).mockReturnValue(true);
    (mockExec as any)
      .mockResolvedValueOnce({ stdout: "", stderr: "" }) // rev-parse --git-dir
      .mockResolvedValueOnce({ stdout: "", stderr: "" }) // git config user.email
      .mockResolvedValueOnce({ stdout: "", stderr: "" }) // git config user.name
      .mockResolvedValueOnce({ stdout: "other-branch\n", stderr: "" }) // rev-parse --abbrev-ref HEAD
      .mockResolvedValueOnce({ stdout: "", stderr: "" }) // checkout
      .mockResolvedValueOnce({ stdout: "", stderr: "" }); // pull

    const result = await checkoutBranch(
      mockConfig,
      "dev",
      "dev",
      mockFs,
      mockExec
    );

    expect(result.ok).toBe(true);
  });

  it("should handle worktree conflicts gracefully", async () => {
    (mockFs.existsSync as any).mockReturnValue(true);
    (mockExec as any)
      .mockResolvedValueOnce({ stdout: "", stderr: "" }) // rev-parse --git-dir
      .mockResolvedValueOnce({ stdout: "", stderr: "" }) // git config user.email
      .mockResolvedValueOnce({ stdout: "", stderr: "" }) // git config user.name
      .mockResolvedValueOnce({ stdout: "other-branch\n", stderr: "" }) // rev-parse --abbrev-ref HEAD
      .mockRejectedValueOnce(
        new Error("fatal: 'dev' is already used by worktree")
      ); // checkout

    const result = await checkoutBranch(
      mockConfig,
      "dev",
      "dev",
      mockFs,
      mockExec
    );

    expect(result.ok).toBe(true);
  });
});
