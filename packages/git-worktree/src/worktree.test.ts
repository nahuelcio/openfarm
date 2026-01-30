import { describe, expect, it, vi } from "vitest";
import type { GitExecFunction } from "./types";
import {
  createWorktree,
  getCurrentWorktree,
  listWorktrees,
  pruneWorktrees,
  removeWorktree,
} from "./worktree";

// Mock git execution function
const createMockGitExec = (
  responses: Record<string, string>
): GitExecFunction => {
  return vi.fn(async (args: string[]) => {
    const command = args.join(" ");
    const response = responses[command];
    if (response === undefined) {
      throw new Error(`Unexpected git command: ${command}`);
    }
    return { stdout: response, stderr: "" };
  });
};

describe("listWorktrees", () => {
  it("should parse worktree list output correctly", async () => {
    const mockOutput = `worktree /path/to/main
HEAD 1234567890abcdef
branch refs/heads/main

worktree /path/to/feature
HEAD abcdef1234567890
branch refs/heads/feature-branch

worktree /path/to/bare
HEAD 9876543210fedcba
bare`;

    const mockGitExec = createMockGitExec({
      "worktree list --porcelain": mockOutput,
    });

    const result = await listWorktrees(
      "/repo",
      { includeStale: true },
      mockGitExec
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toHaveLength(3);
      expect(result.value[0]).toEqual({
        path: "/path/to/main",
        branch: "main",
        commit: "1234567890abcdef",
        isMain: false,
        exists: false, // existsSync will return false in test
      });
      expect(result.value[2].isMain).toBe(true);
    }
  });

  it("should handle empty worktree list", async () => {
    const mockGitExec = createMockGitExec({
      "worktree list --porcelain": "",
    });

    const result = await listWorktrees("/repo", {}, mockGitExec);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toHaveLength(0);
    }
  });

  it("should handle git command failure", async () => {
    const mockGitExec: GitExecFunction = vi
      .fn()
      .mockRejectedValue(new Error("Not a git repository"));

    const result = await listWorktrees("/repo", {}, mockGitExec);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain("Not a git repository");
    }
  });
});

describe("createWorktree", () => {
  it("should create worktree with new branch", async () => {
    const mockGitExec: GitExecFunction = vi
      .fn()
      .mockResolvedValueOnce({ stdout: "", stderr: "" }) // worktree add command
      .mockResolvedValueOnce({
        // worktree list command
        stdout: `worktree /path/to/worktree
HEAD abcdef1234567890
branch refs/heads/feature-branch`,
        stderr: "",
      });

    const result = await createWorktree(
      "/repo",
      {
        path: "/path/to/worktree",
        branch: "feature-branch",
        createBranch: true,
      },
      mockGitExec
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.path).toBe("/path/to/worktree");
      expect(result.value.branch).toBe("feature-branch");
    }
  });

  it("should create worktree from existing branch", async () => {
    const mockGitExec: GitExecFunction = vi
      .fn()
      .mockResolvedValueOnce({ stdout: "", stderr: "" }) // worktree add command
      .mockResolvedValueOnce({
        // worktree list command
        stdout: `worktree /path/to/worktree
HEAD 1234567890abcdef
branch refs/heads/existing-branch`,
        stderr: "",
      });

    const result = await createWorktree(
      "/repo",
      {
        path: "/path/to/worktree",
        branch: "existing-branch",
      },
      mockGitExec
    );

    expect(result.ok).toBe(true);
  });
});

describe("removeWorktree", () => {
  it("should remove worktree successfully", async () => {
    const mockGitExec = createMockGitExec({
      "worktree remove /path/to/worktree": "",
    });

    const result = await removeWorktree(
      "/repo",
      "/path/to/worktree",
      false,
      mockGitExec
    );

    expect(result.ok).toBe(true);
  });

  it("should force remove worktree", async () => {
    const mockGitExec = createMockGitExec({
      "worktree remove --force /path/to/worktree": "",
    });

    const result = await removeWorktree(
      "/repo",
      "/path/to/worktree",
      true,
      mockGitExec
    );

    expect(result.ok).toBe(true);
  });
});

describe("pruneWorktrees", () => {
  it("should prune worktrees successfully", async () => {
    const mockGitExec = createMockGitExec({
      "worktree prune": "",
    });

    const result = await pruneWorktrees("/repo", mockGitExec);

    expect(result.ok).toBe(true);
  });
});

describe("getCurrentWorktree", () => {
  it("should get current worktree info", async () => {
    const mockGitExec = createMockGitExec({
      "rev-parse --git-dir": ".git/worktrees/feature",
      "rev-parse --show-toplevel": "/path/to/worktree",
      "rev-parse --abbrev-ref HEAD": "feature-branch",
      "rev-parse HEAD": "abcdef1234567890",
    });

    const result = await getCurrentWorktree("/path/to/worktree", mockGitExec);

    expect(result.ok).toBe(true);
    if (result.ok && result.value) {
      expect(result.value.path).toBe("/path/to/worktree");
      expect(result.value.branch).toBe("feature-branch");
      expect(result.value.commit).toBe("abcdef1234567890");
      expect(result.value.isMain).toBe(false);
    }
  });

  it("should return null for non-git directory", async () => {
    const mockGitExec: GitExecFunction = vi
      .fn()
      .mockRejectedValue(new Error("Not a git repository"));

    const result = await getCurrentWorktree("/not/git", mockGitExec);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBeNull();
    }
  });
});
