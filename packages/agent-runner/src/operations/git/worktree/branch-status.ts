import type { ExecFunction, FileSystem } from "@openfarm/core/types/runtime";

/**
 * Checks if a branch exists locally and/or remotely
 */
export async function checkBranchExists(
  mainRepoPath: string,
  branchName: string,
  fs: FileSystem,
  execFn: ExecFunction
): Promise<{ local: boolean; remote: boolean }> {
  let local = false;
  let remote = false;

  // Verify main repository exists before checking branches
  if (!fs.existsSync(mainRepoPath)) {
    throw new Error(
      `Main repository does not exist: ${mainRepoPath}. Cannot check branches.`
    );
  }

  try {
    // Check local branches
    const { stdout: localBranches } = await execFn("git", [
      "-C",
      mainRepoPath,
      "branch",
      "--list",
      branchName,
    ]);
    local = localBranches.trim().length > 0;
  } catch {
    // Branch doesn't exist locally
  }

  try {
    // Check remote branches
    const { stdout: remoteBranches } = await execFn("git", [
      "-C",
      mainRepoPath,
      "branch",
      "-r",
      "--list",
      `origin/${branchName}`,
    ]);
    remote = remoteBranches.trim().length > 0;
  } catch {
    // Branch doesn't exist remotely
  }

  return { local, remote };
}
