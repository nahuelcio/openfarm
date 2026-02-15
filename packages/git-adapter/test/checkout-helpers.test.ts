import type { GitConfig } from "@openfarm/core/types/git";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  checkBranchExists,
  checkoutDefaultBranch,
  checkoutExistingBranch,
  configureGitUser,
  createBranch,
  type ExecFunction,
  type FileSystem,
  fetchAndPull,
  getCurrentBranch,
  handleWorktreeConflict,
  isDefaultBranch,
  isNoCommitError,
  isWorktreeConflict,
  pullBranch,
  switchToDefaultBranch,
  verifyGitRepository,
  verifyRepository,
} from "../src/index";

describe("checkout helper functions", () => {
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

  describe("verifyRepository", () => {
    it("should return ok when repository exists", () => {
      (mockFs.existsSync as any).mockReturnValue(true);

      const result = verifyRepository(mockConfig, mockFs);

      expect(result.ok).toBe(true);
    });

    it("should return error when repository does not exist", () => {
      (mockFs.existsSync as any).mockReturnValue(false);

      const result = verifyRepository(mockConfig, mockFs);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain(
          "Repository directory does not exist"
        );
        expect(result.error.message).toContain("/test/repo");
      }
    });
  });

  describe("verifyGitRepository", () => {
    it("should return ok when path is a git repository", async () => {
      (mockExec as any).mockResolvedValueOnce({ stdout: ".git", stderr: "" });

      const result = await verifyGitRepository(mockConfig, mockExec);

      expect(result.ok).toBe(true);
      expect(mockExec).toHaveBeenCalledWith(
        "git -C /test/repo rev-parse --git-dir"
      );
    });

    it("should return error when path is not a git repository", async () => {
      (mockExec as any).mockRejectedValueOnce(
        new Error("fatal: not a git repository")
      );

      const result = await verifyGitRepository(mockConfig, mockExec);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain("not a valid git repository");
      }
    });

    it("should return ok for other git errors (worktree issues)", async () => {
      (mockExec as any).mockRejectedValueOnce(
        new Error("some other git error")
      );

      const result = await verifyGitRepository(mockConfig, mockExec);

      expect(result.ok).toBe(true);
    });

    it("should handle 'No such file or directory' errors", async () => {
      (mockExec as any).mockRejectedValueOnce(
        new Error("fatal: No such file or directory")
      );

      const result = await verifyGitRepository(mockConfig, mockExec);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain("not a valid git repository");
      }
    });
  });

  describe("isWorktreeConflict", () => {
    it("should return true for 'already used by worktree' error", () => {
      expect(
        isWorktreeConflict(new Error("'main' is already used by worktree"))
      ).toBe(true);
    });

    it("should return true for 'is checked out at' error", () => {
      expect(
        isWorktreeConflict(new Error("'feature' is checked out at /path"))
      ).toBe(true);
    });

    it("should return false for other errors", () => {
      expect(isWorktreeConflict(new Error("branch not found"))).toBe(false);
      expect(isWorktreeConflict("random string")).toBe(false);
    });
  });

  describe("isNoCommitError", () => {
    it("should return true for 'nothing to commit'", () => {
      expect(isNoCommitError("nothing to commit, working tree clean")).toBe(
        true
      );
    });

    it("should return true for 'nothing added to commit'", () => {
      expect(isNoCommitError("nothing added to commit")).toBe(true);
    });

    it("should return false for other messages", () => {
      expect(isNoCommitError("commit failed for other reason")).toBe(false);
    });
  });

  describe("handleWorktreeConflict", () => {
    it("should return ok for worktree conflicts", () => {
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const error = new Error("'main' is already used by worktree");

      const result = handleWorktreeConflict("main", error);

      expect(result.ok).toBe(true);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Branch 'main' is used by another worktree")
      );

      consoleSpy.mockRestore();
    });

    it("should return error for non-worktree conflicts", () => {
      const error = new Error("branch not found");

      const result = handleWorktreeConflict("main", error);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toBe("branch not found");
      }
    });
  });

  describe("getCurrentBranch", () => {
    it("should return current branch name", async () => {
      (mockExec as any).mockResolvedValueOnce({
        stdout: "feature-branch\n",
        stderr: "",
      });

      const result = await getCurrentBranch(mockConfig, mockExec);

      expect(result).toBe("feature-branch");
    });

    it("should return empty string when command fails", async () => {
      (mockExec as any).mockRejectedValueOnce(new Error("not a git repo"));

      const result = await getCurrentBranch(mockConfig, mockExec);

      expect(result).toBe("");
    });

    it("should trim whitespace from branch name", async () => {
      (mockExec as any).mockResolvedValueOnce({
        stdout: "  main  \n",
        stderr: "",
      });

      const result = await getCurrentBranch(mockConfig, mockExec);

      expect(result).toBe("main");
    });
  });

  describe("checkBranchExists", () => {
    it("should return true when branch exists", async () => {
      (mockExec as any).mockResolvedValueOnce({
        stdout: "* feature-branch\n",
        stderr: "",
      });

      const result = await checkBranchExists(
        mockConfig,
        "feature-branch",
        mockExec
      );

      expect(result).toBe(true);
    });

    it("should return false when branch does not exist", async () => {
      (mockExec as any).mockResolvedValueOnce({ stdout: "", stderr: "" });

      const result = await checkBranchExists(
        mockConfig,
        "nonexistent",
        mockExec
      );

      expect(result).toBe(false);
    });

    it("should return false when command fails", async () => {
      (mockExec as any).mockRejectedValueOnce(new Error("git error"));

      const result = await checkBranchExists(mockConfig, "feature", mockExec);

      expect(result).toBe(false);
    });
  });

  describe("configureGitUser", () => {
    it("should configure git user with provided values", async () => {
      (mockExec as any).mockResolvedValue({ stdout: "", stderr: "" });

      await configureGitUser(mockConfig, mockExec);

      expect(mockExec).toHaveBeenCalledWith(
        'git -C /test/repo config user.email "test@example.com"'
      );
      expect(mockExec).toHaveBeenCalledWith(
        'git -C /test/repo config user.name "Test User"'
      );
    });

    it("should use defaults when config values not provided", async () => {
      const configWithoutUser: GitConfig = {
        repoPath: "/test/repo",
        repoUrl: "https://dev.azure.com/org/project/_git/repo",
      };
      (mockExec as any).mockResolvedValue({ stdout: "", stderr: "" });

      await configureGitUser(configWithoutUser, mockExec);

      expect(mockExec).toHaveBeenCalledWith(
        'git -C /test/repo config user.email "minions-farm@automated.local"'
      );
      expect(mockExec).toHaveBeenCalledWith(
        'git -C /test/repo config user.name "Minions Farm Agent"'
      );
    });

    it("should ignore config errors", async () => {
      (mockExec as any)
        .mockRejectedValueOnce(new Error("config error"))
        .mockResolvedValueOnce({ stdout: "", stderr: "" });

      // Should not throw even when config commands fail
      await configureGitUser(mockConfig, mockExec);

      // Verify both commands were attempted
      expect(mockExec).toHaveBeenCalledTimes(2);
    });
  });

  describe("isDefaultBranch", () => {
    it("should return true for configured default branch", () => {
      expect(isDefaultBranch("main", "main")).toBe(true);
      expect(isDefaultBranch("dev", "dev")).toBe(true);
    });

    it("should return true for 'main'", () => {
      expect(isDefaultBranch("main", "dev")).toBe(true);
    });

    it("should return true for 'master'", () => {
      expect(isDefaultBranch("master", "dev")).toBe(true);
    });

    it("should return false for feature branches", () => {
      expect(isDefaultBranch("feature-123", "main")).toBe(false);
      expect(isDefaultBranch("bugfix", "dev")).toBe(false);
    });
  });

  describe("pullBranch", () => {
    it("should pull from origin", async () => {
      (mockExec as any).mockResolvedValueOnce({ stdout: "", stderr: "" });

      await pullBranch(mockConfig, "main", mockExec);

      expect(mockExec).toHaveBeenCalledWith(
        "git -C /test/repo pull origin main"
      );
    });

    it("should ignore pull errors", async () => {
      (mockExec as any).mockRejectedValueOnce(new Error("merge conflict"));

      // Should not throw even when pull fails
      await pullBranch(mockConfig, "main", mockExec);

      // Verify pull was attempted
      expect(mockExec).toHaveBeenCalledWith(
        "git -C /test/repo pull origin main"
      );
    });
  });

  describe("checkoutDefaultBranch", () => {
    it("should checkout and pull default branch", async () => {
      (mockExec as any).mockResolvedValue({ stdout: "", stderr: "" });

      const result = await checkoutDefaultBranch(mockConfig, "main", mockExec);

      expect(result.ok).toBe(true);
      expect(mockExec).toHaveBeenCalledWith("git -C /test/repo checkout main");
      expect(mockExec).toHaveBeenCalledWith(
        "git -C /test/repo pull origin main"
      );
    });

    it("should return error on checkout failure", async () => {
      (mockExec as any).mockRejectedValueOnce(new Error("branch not found"));

      const result = await checkoutDefaultBranch(mockConfig, "main", mockExec);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain("branch not found");
      }
    });
  });

  describe("switchToDefaultBranch", () => {
    it("should switch to default branch", async () => {
      (mockExec as any).mockResolvedValueOnce({ stdout: "", stderr: "" });

      const result = await switchToDefaultBranch(mockConfig, "dev", mockExec);

      expect(result.ok).toBe(true);
      expect(mockExec).toHaveBeenCalledWith("git -C /test/repo checkout dev");
    });

    it("should fallback to main when default branch does not exist", async () => {
      (mockExec as any)
        .mockRejectedValueOnce(new Error("pathspec 'dev' did not match"))
        .mockResolvedValueOnce({ stdout: "", stderr: "" });

      const result = await switchToDefaultBranch(mockConfig, "dev", mockExec);

      expect(result.ok).toBe(true);
      expect(mockExec).toHaveBeenCalledWith("git -C /test/repo checkout dev");
      expect(mockExec).toHaveBeenCalledWith("git -C /test/repo checkout main");
    });

    it("should fallback to master when main does not exist", async () => {
      (mockExec as any)
        .mockRejectedValueOnce(new Error("pathspec 'dev' did not match"))
        .mockRejectedValueOnce(new Error("pathspec 'main' did not match"))
        .mockResolvedValueOnce({ stdout: "", stderr: "" });

      const result = await switchToDefaultBranch(mockConfig, "dev", mockExec);

      expect(result.ok).toBe(true);
      expect(mockExec).toHaveBeenCalledWith(
        "git -C /test/repo checkout master"
      );
    });

    it("should continue to next branch on worktree conflict", async () => {
      (mockExec as any)
        .mockRejectedValueOnce(new Error("'dev' is already used by worktree"))
        .mockResolvedValueOnce({ stdout: "", stderr: "" });

      const result = await switchToDefaultBranch(mockConfig, "dev", mockExec);

      expect(result.ok).toBe(true);
      expect(mockExec).toHaveBeenCalledTimes(2);
    });

    it("should return ok if all branches fail", async () => {
      (mockExec as any).mockRejectedValue(new Error("all failed"));

      const result = await switchToDefaultBranch(mockConfig, "dev", mockExec);

      expect(result.ok).toBe(true);
    });
  });

  describe("fetchAndPull", () => {
    it("should fetch and pull from origin", async () => {
      (mockExec as any).mockResolvedValue({ stdout: "", stderr: "" });

      await fetchAndPull(mockConfig, "main", mockExec);

      expect(mockExec).toHaveBeenCalledWith(
        "git -C /test/repo fetch origin main"
      );
      expect(mockExec).toHaveBeenCalledWith(
        "git -C /test/repo pull origin main"
      );
    });

    it("should ignore fetch errors", async () => {
      (mockExec as any)
        .mockRejectedValueOnce(new Error("network error"))
        .mockResolvedValueOnce({ stdout: "", stderr: "" });

      // Should not throw even when fetch fails
      await fetchAndPull(mockConfig, "main", mockExec);

      // Verify fetch was attempted and pull succeeded
      expect(mockExec).toHaveBeenCalledWith(
        "git -C /test/repo fetch origin main"
      );
      expect(mockExec).toHaveBeenCalledWith(
        "git -C /test/repo pull origin main"
      );
    });

    it("should fallback to main when branch fails", async () => {
      (mockExec as any)
        .mockResolvedValueOnce({ stdout: "", stderr: "" })
        .mockRejectedValueOnce(new Error("branch not found"))
        .mockResolvedValueOnce({ stdout: "", stderr: "" });

      await fetchAndPull(mockConfig, "feature", mockExec);

      expect(mockExec).toHaveBeenCalledWith(
        "git -C /test/repo pull origin feature"
      );
      expect(mockExec).toHaveBeenCalledWith(
        "git -C /test/repo pull origin main"
      );
    });

    it("should fallback to master when main fails", async () => {
      (mockExec as any)
        .mockResolvedValueOnce({ stdout: "", stderr: "" })
        .mockRejectedValueOnce(new Error("branch not found"))
        .mockRejectedValueOnce(new Error("branch not found"))
        .mockResolvedValueOnce({ stdout: "", stderr: "" });

      await fetchAndPull(mockConfig, "feature", mockExec);

      expect(mockExec).toHaveBeenCalledWith(
        "git -C /test/repo pull origin master"
      );
    });
  });

  describe("checkoutExistingBranch", () => {
    it("should checkout and pull existing branch", async () => {
      (mockExec as any).mockResolvedValue({ stdout: "", stderr: "" });

      const result = await checkoutExistingBranch(
        mockConfig,
        "feature-branch",
        mockExec
      );

      expect(result.ok).toBe(true);
      expect(mockExec).toHaveBeenCalledWith(
        "git -C /test/repo checkout feature-branch"
      );
      expect(mockExec).toHaveBeenCalledWith(
        "git -C /test/repo pull origin feature-branch"
      );
    });

    it("should return ok on worktree conflict", async () => {
      (mockExec as any).mockRejectedValueOnce(
        new Error("'feature-branch' is already used by worktree")
      );

      const result = await checkoutExistingBranch(
        mockConfig,
        "feature-branch",
        mockExec
      );

      expect(result.ok).toBe(true);
    });

    it("should return error on other failures", async () => {
      (mockExec as any).mockRejectedValueOnce(new Error("branch not found"));

      const result = await checkoutExistingBranch(
        mockConfig,
        "feature-branch",
        mockExec
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain("branch not found");
      }
    });
  });

  describe("createBranch", () => {
    it("should create new branch", async () => {
      (mockExec as any).mockResolvedValueOnce({ stdout: "", stderr: "" });

      const result = await createBranch(mockConfig, "new-feature", mockExec);

      expect(result.ok).toBe(true);
      expect(mockExec).toHaveBeenCalledWith(
        "git -C /test/repo checkout -b new-feature"
      );
    });

    it("should checkout existing branch if already exists", async () => {
      (mockExec as any)
        .mockRejectedValueOnce(
          new Error("fatal: A branch named 'existing' already exists")
        )
        .mockResolvedValueOnce({ stdout: "", stderr: "" })
        .mockResolvedValueOnce({ stdout: "", stderr: "" });

      const result = await createBranch(mockConfig, "existing", mockExec);

      expect(result.ok).toBe(true);
      expect(mockExec).toHaveBeenCalledWith(
        "git -C /test/repo checkout -b existing"
      );
      expect(mockExec).toHaveBeenCalledWith(
        "git -C /test/repo checkout existing"
      );
    });

    it("should return ok on worktree conflict", async () => {
      (mockExec as any).mockRejectedValueOnce(
        new Error("'new-feature' is already used by worktree")
      );

      const result = await createBranch(mockConfig, "new-feature", mockExec);

      expect(result.ok).toBe(true);
    });

    it("should return error on other failures", async () => {
      (mockExec as any).mockRejectedValueOnce(new Error("permission denied"));

      const result = await createBranch(mockConfig, "new-feature", mockExec);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain("permission denied");
      }
    });
  });
});
