import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

export interface RepoConfig {
  repoUrl: string;
  branch?: string;
  targetDir?: string;
}

export class RepoManager {
  private baseDir: string;

  constructor(baseDir: string) {
    this.baseDir = baseDir;
  }

  clone(config: RepoConfig): string {
    const targetDir =
      config.targetDir ||
      path.join(this.baseDir, this.getRepoName(config.repoUrl));

    if (fs.existsSync(targetDir)) {
      console.log(`Repository already exists at ${targetDir}`);
      return targetDir;
    }

    let command = `git clone ${config.repoUrl} ${targetDir}`;
    if (config.branch) {
      command += ` --branch ${config.branch}`;
    }

    execSync(command, { stdio: "inherit" });
    return targetDir;
  }

  checkout(repoPath: string, branch: string): void {
    execSync(`git checkout ${branch}`, { cwd: repoPath, stdio: "inherit" });
  }

  getCurrentBranch(repoPath: string): string {
    return execSync("git rev-parse --abbrev-ref HEAD", {
      cwd: repoPath,
      encoding: "utf-8",
    }).trim();
  }

  getStatus(repoPath: string): string {
    return execSync("git status", { cwd: repoPath, encoding: "utf-8" });
  }

  private getRepoName(repoUrl: string): string {
    return path.basename(repoUrl, ".git");
  }
}
