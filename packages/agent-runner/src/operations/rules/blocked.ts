import { join, relative } from "node:path";
import type { AgentConfiguration } from "@openfarm/core/types/domain";
import type { FileSystem } from "@openfarm/core/types/runtime";
import { defaultFileSystem } from "@openfarm/core/types/runtime";
import { matchesPattern } from "@openfarm/utils";

const getAllFiles = (
  dir: string,
  baseDir: string,
  fs: FileSystem
): string[] => {
  try {
    const list = fs.readdirSync(dir);

    return list
      .filter((file) => file !== ".git")
      .reduce<string[]>((acc, file) => {
        const filePath = join(dir, file);
        const stat = fs.statSync(filePath);
        const relativePath = relative(baseDir, filePath);

        if (stat.isDirectory()) {
          return acc.concat(getAllFiles(filePath, baseDir, fs));
        }
        return acc.concat([relativePath]);
      }, []);
  } catch {
    return [];
  }
};

/**
 * Helper function to get blocked files/directories (without blocking the job)
 * Refactored to use functional style and receive dependencies
 */
export const getBlockedResources = (
  repoPath: string,
  rules: AgentConfiguration["rules"],
  fs: FileSystem = defaultFileSystem
): { blockedFiles: string[]; blockedDirs: string[] } => {
  if (!rules) {
    return { blockedFiles: [], blockedDirs: [] };
  }

  try {
    const allFiles = getAllFiles(repoPath, repoPath, fs);

    // Check blocked patterns using filter (immutable)
    const blockedFiles =
      rules.blockedFilePatterns && rules.blockedFilePatterns.length > 0
        ? allFiles.filter((file) =>
            rules.blockedFilePatterns?.some((pattern) =>
              matchesPattern(file, pattern)
            )
          )
        : [];

    // Check blocked directories using filter (immutable)
    const blockedDirs =
      rules.blockedDirectories && rules.blockedDirectories.length > 0
        ? allFiles.filter((file) =>
            rules.blockedDirectories?.some((dir) => file.startsWith(`${dir}/`))
          )
        : [];

    return { blockedFiles, blockedDirs };
  } catch (error) {
    console.error("Error getting blocked resources:", error);
    return { blockedFiles: [], blockedDirs: [] };
  }
};
