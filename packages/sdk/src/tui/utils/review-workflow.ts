import { useAgentPoolStore } from "./agent-pool";

export interface DiffResult {
  diff: string;
  files: string[];
  filesAdded: string[];
  filesModified: string[];
  filesDeleted: string[];
  additions: number;
  deletions: number;
}

export interface MergeResult {
  success: boolean;
  commitSha?: string;
  message?: string;
  error?: string;
}

async function runGitCommand(
  cwd: string,
  command: string
): Promise<{ success: boolean; output: string; error?: string }> {
  try {
    const { execSync } = await import("node:child_process");
    const output = execSync(command, {
      cwd,
      encoding: "utf-8",
      stdio: "pipe",
    });
    return { success: true, output: output.trim() };
  } catch (error) {
    return {
      success: false,
      output: "",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function getAgentDiff(
  agentId: string
): Promise<DiffResult | null> {
  const poolStore = useAgentPoolStore.getState();
  const agent = poolStore.getAgent(agentId);

  if (!agent?.worktreePath) {
    console.error("[ReviewWorkflow] Agent or worktree not found");
    return null;
  }

  const worktreePath = agent.worktreePath;
  const branchName = agent.branchName;

  if (!branchName) {
    console.error("[ReviewWorkflow] Branch name not found");
    return null;
  }

  const mainBranch = "main";
  const diffResult = await runGitCommand(
    worktreePath,
    `git diff ${mainBranch}...HEAD --stat`
  );

  if (!diffResult.success) {
    const fallbackDiff = await runGitCommand(
      worktreePath,
      "git diff HEAD~1 HEAD --stat"
    );
    if (!fallbackDiff.success) {
      console.error("[ReviewWorkflow] Failed to get diff:", fallbackDiff.error);
      return null;
    }
    return parseDiffStat(fallbackDiff.output);
  }

  return parseDiffStat(diffResult.output);
}

function parseDiffStat(output: string): DiffResult {
  const lines = output.split("\n").filter((l) => l.trim());
  const files: string[] = [];
  let additions = 0;
  let deletions = 0;

  for (const line of lines.slice(0, -1)) {
    const match = line.match(/\s+(.+?)\s+\|\s+(\d+)/);
    if (match) {
      const file = match[1].trim();
      files.push(file);

      const addMatch = line.match(/\+(\d+)/);
      const delMatch = line.match(/-(\d+)/);

      if (addMatch) {
        additions += Number.parseInt(addMatch[1], 10);
      }
      if (delMatch) {
        deletions += Number.parseInt(delMatch[1], 10);
      }
    }
  }

  return {
    diff: output,
    files,
    filesAdded: files.filter((f) => f.startsWith("new file")),
    filesModified: files.filter(
      (f) => !(f.startsWith("new file") || f.startsWith("deleted"))
    ),
    filesDeleted: files.filter((f) => f.startsWith("deleted")),
    additions,
    deletions,
  };
}

export async function approveAgent(agentId: string): Promise<MergeResult> {
  const poolStore = useAgentPoolStore.getState();
  const agent = poolStore.getAgent(agentId);

  if (!(agent?.worktreePath && agent.branchName)) {
    return { success: false, error: "Agent or workspace not found" };
  }

  const worktreePath = agent.worktreePath;
  const branchName = agent.branchName;
  const mainBranch = "main";

  const diffResult = await getAgentDiff(agentId);
  if (!diffResult || diffResult.files.length === 0) {
    return { success: false, error: "No changes to merge" };
  }

  const addResult = await runGitCommand(worktreePath, "git add -A");
  if (!addResult.success) {
    return { success: false, error: `git add failed: ${addResult.error}` };
  }

  const commitResult = await runGitCommand(
    worktreePath,
    `git commit -m "Agent ${agentId.slice(0, 8)}: ${agent.config.task.slice(0, 50)}"`
  );

  if (!commitResult.success) {
    return {
      success: false,
      error: `git commit failed: ${commitResult.error}`,
    };
  }

  const { execSync } = await import("node:child_process");
  let mainRepo: string;
  try {
    mainRepo = execSync("git rev-parse --show-toplevel", {
      encoding: "utf-8",
    }).trim();
  } catch {
    return { success: false, error: "Could not find main repository" };
  }

  const checkoutResult = await runGitCommand(
    mainRepo,
    `git checkout ${mainBranch}`
  );
  if (!checkoutResult.success) {
    return {
      success: false,
      error: `Checkout main failed: ${checkoutResult.error}`,
    };
  }

  const mergeResult = await runGitCommand(
    mainRepo,
    `git merge ${branchName} --no-ff -m "Merge agent ${agentId.slice(0, 8)}: ${agent.config.task.slice(0, 40)}"`
  );

  if (!mergeResult.success) {
    await runGitCommand(mainRepo, "git merge --abort");
    return {
      success: false,
      error: `Merge conflict: ${mergeResult.error}. Please resolve manually.`,
    };
  }

  const logResult = await runGitCommand(mainRepo, "git log -1 --oneline");
  const commitSha = logResult.success
    ? logResult.output.split(" ")[0]
    : undefined;

  poolStore.updateAgent(agentId, {
    status: "completed",
  });

  return {
    success: true,
    commitSha,
    message: `Merged ${diffResult.files.length} files (+${diffResult.additions} -${diffResult.deletions})`,
  };
}

export async function rejectAgent(
  agentId: string,
  reason: string
): Promise<{ success: boolean }> {
  const poolStore = useAgentPoolStore.getState();
  const agent = poolStore.getAgent(agentId);

  if (!agent) {
    return { success: false };
  }

  poolStore.updateAgent(agentId, {
    status: "failed",
    error: `Rejected: ${reason}`,
  });

  return { success: true };
}

export async function cleanupAfterMerge(
  agentId: string
): Promise<{ success: boolean; error?: string }> {
  const poolStore = useAgentPoolStore.getState();
  const agent = poolStore.getAgent(agentId);

  if (!agent?.branchName) {
    return { success: false, error: "Agent not found" };
  }

  const mainRepo = agent.config.workspace;
  const branchName = agent.branchName;

  await runGitCommand(mainRepo, `git branch -D ${branchName}`);

  poolStore.cleanupAgent(agentId);

  return { success: true };
}
