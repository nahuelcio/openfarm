import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import type { ProjectContext } from "../types";

async function detectWorkspaceName(cwd: string): Promise<string | undefined> {
  try {
    const pkgRaw = await readFile(path.join(cwd, "package.json"), "utf-8");
    const pkg = JSON.parse(pkgRaw) as { name?: string };
    return pkg.name;
  } catch (_error) {
    return undefined;
  }
}

async function detectPackageManager(cwd: string): Promise<string | undefined> {
  try {
    const pkgRaw = await readFile(path.join(cwd, "package.json"), "utf-8");
    const pkg = JSON.parse(pkgRaw) as { packageManager?: string };
    return pkg.packageManager;
  } catch (_error) {
    return undefined;
  }
}

async function detectTopLevelDirs(cwd: string): Promise<string[]> {
  try {
    const entries = await readdir(cwd, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .filter((name) => !name.startsWith("."))
      .slice(0, 20);
  } catch (_error) {
    return [];
  }
}

export async function detectProjectContext(
  cwd: string
): Promise<ProjectContext> {
  const [workspaceName, packageManager, topLevelDirs] = await Promise.all([
    detectWorkspaceName(cwd),
    detectPackageManager(cwd),
    detectTopLevelDirs(cwd),
  ]);

  return {
    cwd,
    workspaceName,
    packageManager,
    topLevelDirs,
  };
}

export function formatContextForPrompt(context: ProjectContext): string {
  const dirs = context.topLevelDirs.join(", ") || "(none)";
  const workspaceName = context.workspaceName ?? "(unknown)";
  const packageManager = context.packageManager ?? "(unknown)";
  return [
    `Workspace: ${workspaceName}`,
    `Package manager: ${packageManager}`,
    `Top-level dirs: ${dirs}`,
    `CWD: ${context.cwd}`,
  ].join("\n");
}
