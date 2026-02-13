/**
 * Context Resolver Service
 *
 * Detects smart context for AI conversations.
 */

import { execSync } from "node:child_process";
import { statSync } from "node:fs";
import { join } from "node:path";

export interface SmartContext {
  recentFiles: string[];
  gitStatus: GitStatus;
  recentErrors: string[];
}

export interface GitStatus {
  branch: string;
  modified: string[];
  added: string[];
  deleted: string[];
  untracked: string[];
}

/**
 * Detects smart context from the workspace
 */
export async function detectSmartContext(
  workspace: string
): Promise<SmartContext> {
  const recentFiles = getRecentFiles(workspace, 10);
  const gitStatus = getGitStatus(workspace);
  const recentErrors = getRecentErrors(workspace);

  return {
    recentFiles,
    gitStatus,
    recentErrors,
  };
}

function getRecentFiles(workspace: string, limit: number): string[] {
  try {
    const output = execSync("git ls-files -m -o --exclude-standard", {
      cwd: workspace,
      encoding: "utf-8",
    });

    const files = output
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((f) => join(workspace, f));

    // Sort by modification time
    const withStats = files
      .map((path) => {
        try {
          const stats = statSync(path);
          return { path, mtime: stats.mtime };
        } catch {
          return { path, mtime: new Date(0) };
        }
      })
      .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

    return withStats.slice(0, limit).map((f) => f.path);
  } catch {
    return [];
  }
}

function getGitStatus(workspace: string): GitStatus {
  try {
    const branch = execSync("git branch --show-current", {
      cwd: workspace,
      encoding: "utf-8",
    }).trim();

    const status = execSync("git status --porcelain", {
      cwd: workspace,
      encoding: "utf-8",
    });

    const modified: string[] = [];
    const added: string[] = [];
    const deleted: string[] = [];
    const untracked: string[] = [];

    for (const line of status.trim().split("\n")) {
      if (!line) continue;

      const statusCode = line.slice(0, 2);
      const file = line.slice(3);

      if (statusCode.includes("M")) modified.push(file);
      else if (statusCode.includes("A")) added.push(file);
      else if (statusCode.includes("D")) deleted.push(file);
      else if (statusCode.includes("?")) untracked.push(file);
    }

    return { branch, modified, added, deleted, untracked };
  } catch {
    return {
      branch: "unknown",
      modified: [],
      added: [],
      deleted: [],
      untracked: [],
    };
  }
}

function getRecentErrors(workspace: string): string[] {
  const errors: string[] = [];

  // Check for TypeScript errors
  try {
    const output = execSync("bun run tsc --noEmit 2>&1 || true", {
      cwd: workspace,
      encoding: "utf-8",
      timeout: 30000,
    });

    const lines = output.split("\n");
    for (const line of lines) {
      if (line.includes("error TS")) {
        errors.push(line.slice(0, 100));
        if (errors.length >= 5) break;
      }
    }
  } catch {
    // Ignore
  }

  return errors;
}

/**
 * Builds context string for AI prompt
 */
export function buildContextPrompt(context: SmartContext): string {
  const parts: string[] = [];

  // Git context
  const git = context.gitStatus;
  parts.push(`Current branch: ${git.branch}`);

  if (git.modified.length > 0) {
    parts.push(`Modified files: ${git.modified.join(", ")}`);
  }

  // Recent files
  if (context.recentFiles.length > 0) {
    const fileList = context.recentFiles
      .map((f) => f.split("/").pop())
      .join(", ");
    parts.push(`Recently touched: ${fileList}`);
  }

  // Recent errors
  if (context.recentErrors.length > 0) {
    parts.push(`Recent errors:\n${context.recentErrors.join("\n")}`);
  }

  return parts.join("\n");
}
