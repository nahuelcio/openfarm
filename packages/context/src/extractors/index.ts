import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type {
  FileStructureData,
  GitCommit,
  GitHistory,
  PackageJsonData,
  RawRepositoryData,
} from "../types/index.js";

export interface Extractor {
  extract(
    projectPath: string
  ): Promise<RawRepositoryData[keyof RawRepositoryData]>;
}

export class GitExtractor implements Extractor {
  async extract(projectPath: string): Promise<GitHistory | undefined> {
    try {
      const { simpleGit } = await import("simple-git");
      const git = simpleGit(projectPath);

      const log = await git.log({ maxCount: 20 });
      const branches = await git.branch();

      const recentCommits: GitCommit[] = log.all.map((commit) => ({
        sha: commit.hash,
        message: commit.message,
        author: commit.author_name,
        date: commit.date,
      }));

      const contributors = [...new Set(log.all.map((c) => c.author_name))];

      return {
        recentCommits,
        contributors,
        branchCount: branches.all.length,
      };
    } catch {
      return undefined;
    }
  }
}

export class PackageJsonExtractor implements Extractor {
  async extract(projectPath: string): Promise<PackageJsonData | undefined> {
    try {
      const packageJsonPath = join(projectPath, "package.json");
      const content = await readFile(packageJsonPath, "utf-8");
      const pkg = JSON.parse(content);

      const packageManager = this.detectPackageManager(pkg);

      return {
        name: pkg.name,
        version: pkg.version || "unknown",
        packageManager,
        scripts: pkg.scripts || {},
        dependencies: pkg.dependencies || {},
        devDependencies: pkg.devDependencies || {},
      };
    } catch {
      return undefined;
    }
  }

  private detectPackageManager(pkg: Record<string, unknown>): string {
    if (pkg.packageManager) {
      const pm = pkg.packageManager as string;
      if (pm.startsWith("bun@")) {
        return "bun";
      }
      if (pm.startsWith("pnpm@")) {
        return "pnpm";
      }
      if (pm.startsWith("yarn@")) {
        return "yarn";
      }
    }

    const devDeps = pkg.devDependencies as Record<string, unknown> | undefined;
    if (devDeps?.turbo) {
      return "bun";
    }

    return "npm";
  }
}

export class FileStructureExtractor implements Extractor {
  async extract(projectPath: string): Promise<FileStructureData | undefined> {
    try {
      const { glob } = await import("fast-glob");

      const directories = await glob("*/", {
        cwd: projectPath,
        onlyDirectories: true,
      });

      const keyFiles = await glob(
        [
          "package.json",
          "tsconfig*.json",
          "biome.jsonc",
          "README.md",
          "AGENTS.md",
          "turbo.json",
          "bunfig.toml",
        ],
        {
          cwd: projectPath,
        }
      );

      const testFiles = await glob(
        ["**/*.test.ts", "**/*.test.tsx", "**/*.spec.ts", "**/*.spec.tsx"],
        {
          cwd: projectPath,
        }
      );

      const configFiles = await glob(["**/package.json", "**/tsconfig*.json"], {
        cwd: projectPath,
        ignore: ["node_modules/**"],
      });

      return {
        directories: directories.filter(
          (d: string) => !d.startsWith("node_modules")
        ),
        keyFiles,
        testFiles: testFiles.slice(0, 50),
        configFiles: configFiles.slice(0, 30),
      };
    } catch {
      return undefined;
    }
  }
}
