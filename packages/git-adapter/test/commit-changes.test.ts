import type { GitConfig } from "@openfarm/core/types/git";
import {
  commitChanges,
  type ExecFunction,
  type FileSystem,
} from "../src/index";

describe("commitChanges", () => {
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

    const result = await commitChanges(
      mockConfig,
      "Test commit message",
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

  it("should return error when there are no changes to commit", async () => {
    (mockFs.existsSync as jest.Mock).mockReturnValue(true);
    (mockExec as jest.Mock)
      .mockResolvedValueOnce({ stdout: "", stderr: "" }) // git config user.email
      .mockResolvedValueOnce({ stdout: "", stderr: "" }) // git config user.name
      .mockResolvedValueOnce({ stdout: "", stderr: "" }); // status --porcelain (no changes)

    const result = await commitChanges(
      mockConfig,
      "Test commit message",
      mockFs,
      mockExec
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain("No changes detected");
    }
  });

  it("should commit changes successfully", async () => {
    (mockFs.existsSync as jest.Mock).mockReturnValue(true);
    (mockExec as jest.Mock)
      .mockResolvedValueOnce({ stdout: "", stderr: "" }) // git config user.email
      .mockResolvedValueOnce({ stdout: "", stderr: "" }) // git config user.name
      .mockResolvedValueOnce({ stdout: "M file.txt\n", stderr: "" }) // status --porcelain (has changes)
      .mockResolvedValueOnce({ stdout: "", stderr: "" }) // add .
      .mockResolvedValueOnce({ stdout: "has changes\n", stderr: "" }) // diff --cached
      .mockResolvedValueOnce({ stdout: "", stderr: "" }); // commit

    const result = await commitChanges(
      mockConfig,
      "Test commit message",
      mockFs,
      mockExec
    );

    expect(result.ok).toBe(true);
    expect(mockExec).toHaveBeenCalledWith(
      expect.stringContaining(
        'git -C /test/repo commit -m "Test commit message"'
      )
    );
  });

  it("should return error when there is nothing to commit", async () => {
    (mockFs.existsSync as jest.Mock).mockReturnValue(true);
    (mockExec as jest.Mock)
      .mockResolvedValueOnce({ stdout: "", stderr: "" }) // git config user.email
      .mockResolvedValueOnce({ stdout: "", stderr: "" }) // git config user.name
      .mockResolvedValueOnce({ stdout: "M file.txt\n", stderr: "" }) // status --porcelain
      .mockResolvedValueOnce({ stdout: "", stderr: "" }) // add .
      .mockResolvedValueOnce({ stdout: "has changes\n", stderr: "" }) // diff --cached
      .mockRejectedValueOnce(
        new Error("nothing to commit, working tree clean")
      ); // commit

    const result = await commitChanges(
      mockConfig,
      "Test commit message",
      mockFs,
      mockExec
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain(
        "Git commit failed: No changes to commit"
      );
    }
  });

  it("should escape quotes in commit message", async () => {
    (mockFs.existsSync as jest.Mock).mockReturnValue(true);
    (mockExec as jest.Mock)
      .mockResolvedValueOnce({ stdout: "", stderr: "" }) // git config user.email
      .mockResolvedValueOnce({ stdout: "", stderr: "" }) // git config user.name
      .mockResolvedValueOnce({ stdout: "M file.txt\n", stderr: "" }) // status
      .mockResolvedValueOnce({ stdout: "", stderr: "" }) // add .
      .mockResolvedValueOnce({ stdout: "has changes\n", stderr: "" }) // diff
      .mockResolvedValueOnce({ stdout: "", stderr: "" }); // commit

    await commitChanges(mockConfig, 'Test "quoted" message', mockFs, mockExec);

    // Check that commit was called with escaped quotes
    const commitCall = (mockExec as jest.Mock).mock.calls.find((call) =>
      call[0].includes("commit -m")
    );
    expect(commitCall).toBeDefined();
    expect(commitCall?.[0]).toContain('Test \\"quoted\\" message');
  });
});
