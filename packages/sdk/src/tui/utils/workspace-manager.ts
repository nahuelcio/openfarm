import { create } from "zustand";
import { useAgentPoolStore } from "./agent-pool";

export interface Workspace {
  agentId: string;
  path: string;
  branchName: string;
  createdAt: Date;
  mainRepo: string;
}

interface WorkspaceManagerState {
  workspaces: Map<string, Workspace>;

  createWorkspace: (
    agentId: string,
    mainRepo: string
  ) => Promise<Workspace | null>;
  getWorkspace: (agentId: string) => Workspace | undefined;
  cleanupWorkspace: (agentId: string) => Promise<void>;
  cleanupAll: () => Promise<void>;
  cleanupOldWorkspaces: (maxAgeDays: number) => Promise<void>;
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

async function getGitRoot(repoPath: string): Promise<string | null> {
  const result = await runGitCommand(repoPath, "git rev-parse --show-toplevel");
  return result.success ? result.output : null;
}

function getTempDir(): string {
  const { tmpdir } = require("node:os");
  const { join } = require("node:path");
  return join(tmpdir(), "openfarm-worktrees");
}

export const useWorkspaceManagerStore = create<WorkspaceManagerState>(
  (set, get) => ({
    workspaces: new Map(),

    createWorkspace: async (agentId: string, mainRepo: string) => {
      const poolStore = useAgentPoolStore.getState();
      const agent = poolStore.getAgent(agentId);

      if (!agent) {
        console.error(`[WorkspaceManager] Agent ${agentId} not found`);
        return null;
      }

      const branchName = agent.branchName || `openfarm-${agentId.slice(-8)}`;
      const tempDir = getTempDir();
      const worktreePath = `${tempDir}/${agentId}`;

      const gitRoot = await getGitRoot(mainRepo);
      if (!gitRoot) {
        console.error(`[WorkspaceManager] Not a git repository: ${mainRepo}`);
        return null;
      }

      const branchResult = await runGitCommand(
        gitRoot,
        `git branch ${branchName}`
      );
      if (!branchResult.success) {
        const deleteResult = await runGitCommand(
          gitRoot,
          `git branch -D ${branchName}`
        );
        if (deleteResult.success) {
          const retryResult = await runGitCommand(
            gitRoot,
            `git branch ${branchName}`
          );
          if (!retryResult.success) {
            console.error(
              `[WorkspaceManager] Failed to create branch: ${branchResult.error}`
            );
            return null;
          }
        }
      }

      const worktreeResult = await runGitCommand(
        gitRoot,
        `git worktree add ${worktreePath} ${branchName}`
      );

      if (!worktreeResult.success) {
        console.error(
          `[WorkspaceManager] Failed to create worktree: ${worktreeResult.error}`
        );
        return null;
      }

      const workspace: Workspace = {
        agentId,
        path: worktreePath,
        branchName,
        createdAt: new Date(),
        mainRepo,
      };

      set((state) => {
        const newWorkspaces = new Map(state.workspaces);
        newWorkspaces.set(agentId, workspace);
        return { workspaces: newWorkspaces };
      });

      poolStore.updateAgent(agentId, {
        worktreePath,
        branchName,
      });

      console.log(`[WorkspaceManager] Created workspace: ${worktreePath}`);
      return workspace;
    },

    getWorkspace: (agentId: string) => {
      return get().workspaces.get(agentId);
    },

    cleanupWorkspace: async (agentId: string) => {
      const workspace = get().workspaces.get(agentId);
      if (!workspace) {
        return;
      }

      const gitRoot = await getGitRoot(workspace.mainRepo);
      if (gitRoot) {
        await runGitCommand(
          gitRoot,
          `git worktree remove ${workspace.path} --force`
        );
        await runGitCommand(gitRoot, `git branch -D ${workspace.branchName}`);
      }

      const { rmSync, existsSync } = await import("node:fs");
      if (existsSync(workspace.path)) {
        try {
          rmSync(workspace.path, { recursive: true, force: true });
        } catch (error) {
          console.error(
            `[WorkspaceManager] Failed to cleanup directory: ${error}`
          );
        }
      }

      set((state) => {
        const newWorkspaces = new Map(state.workspaces);
        newWorkspaces.delete(agentId);
        return { workspaces: newWorkspaces };
      });

      console.log(
        `[WorkspaceManager] Cleaned up workspace for agent: ${agentId}`
      );
    },

    cleanupAll: async () => {
      const { workspaces } = get();
      for (const agentId of workspaces.keys()) {
        await get().cleanupWorkspace(agentId);
      }
    },

    cleanupOldWorkspaces: async (maxAgeDays: number) => {
      const { workspaces } = get();
      const now = Date.now();
      const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;

      for (const [agentId, workspace] of workspaces) {
        const age = now - workspace.createdAt.getTime();
        if (age > maxAgeMs) {
          await get().cleanupWorkspace(agentId);
        }
      }
    },
  })
);
