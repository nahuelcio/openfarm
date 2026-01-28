export type IntegrationType = "github" | "azure" | "gitlab" | "bitbucket";

export interface Integration {
  id: string;
  type: IntegrationType;
  credentials: string;
  workspace?: string;
}

export interface PlatformAdapter {
  getName(): string;
  getWorkItem(id: string): Promise<unknown>;
  createWorkItem(data: unknown): Promise<unknown>;
  updateWorkItem(id: string, data: unknown): Promise<unknown>;
}

export interface GitAdapter {
  clone(url: string, targetDir: string): Promise<unknown>;
  createWorktree(repoPath: string, branch: string): Promise<string>;
  getDiff(worktreePath: string): Promise<string>;
  commit(worktreePath: string, message: string): Promise<void>;
  status(repoPath: string): Promise<unknown>;
}

export interface GitHubAdapter {
  getWorkItem(id: string): Promise<unknown>;
  createPR(data: unknown): Promise<unknown>;
  getFile(path: string, branch?: string): Promise<string>;
}
