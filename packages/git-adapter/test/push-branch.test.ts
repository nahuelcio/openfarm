import type { GitConfig } from "@openfarm/core/types/git";
import { type ExecFunction, type FileSystem, pushBranch } from "../src/index";

describe("pushBranch", () => {
  const mockConfig: GitConfig = {
    repoPath: "/test/repo",
    repoUrl: "https://dev.azure.com/org/project/_git/repo",
    gitUserEmail: "test@example.com",
    gitUserName: "Test User",
  };

  const mockFs: FileSystem = {
    existsSync: jest.fn(),
  };

  const mockExec: ExecFunction = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return error when repository directory does not exist", async () => {
    (mockFs.existsSync as jest.Mock).mockReturnValue(false);

    const result = await pushBranch(
      mockConfig,
      "feature-branch",
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

  it("should push branch successfully without PAT", async () => {
    (mockFs.existsSync as jest.Mock).mockReturnValue(true);
    (mockExec as jest.Mock)
      .mockResolvedValueOnce({ stdout: "", stderr: "" }) // git config user.email
      .mockResolvedValueOnce({ stdout: "", stderr: "" }) // git config user.name
      .mockResolvedValueOnce({ stdout: "", stderr: "" }); // push

    const result = await pushBranch(
      mockConfig,
      "feature-branch",
      mockFs,
      mockExec
    );

    expect(result.ok).toBe(true);
    expect(mockExec).toHaveBeenCalledWith(
      "git -C /test/repo push -u origin feature-branch --force"
    );
  });

  it("should update remote URL with PAT for Azure DevOps", async () => {
    const configWithPat: GitConfig = {
      ...mockConfig,
      pat: "test-pat-token",
    };
    (mockFs.existsSync as jest.Mock).mockReturnValue(true);
    (mockExec as jest.Mock)
      .mockResolvedValueOnce({ stdout: "", stderr: "" }) // git config user.email
      .mockResolvedValueOnce({ stdout: "", stderr: "" }) // git config user.name
      .mockResolvedValueOnce({ stdout: "", stderr: "" }) // remote set-url
      .mockResolvedValueOnce({ stdout: "", stderr: "" }); // push

    const result = await pushBranch(
      configWithPat,
      "feature-branch",
      mockFs,
      mockExec
    );

    expect(result.ok).toBe(true);
    expect(mockExec).toHaveBeenCalledWith(
      expect.stringContaining("git -C /test/repo remote set-url origin")
    );
  });

  it("should return error when push fails", async () => {
    (mockFs.existsSync as jest.Mock).mockReturnValue(true);
    (mockExec as jest.Mock)
      .mockResolvedValueOnce({ stdout: "", stderr: "" }) // git config user.email
      .mockResolvedValueOnce({ stdout: "", stderr: "" }) // git config user.name
      .mockRejectedValueOnce(new Error("push failed")); // push

    const result = await pushBranch(
      mockConfig,
      "feature-branch",
      mockFs,
      mockExec
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect((result as any).error.message).toContain("Failed to push branch");
    }
  });
});
