import { join, relative } from "node:path";
import type { AgentConfiguration } from "@openfarm/core/types/domain";
import type { FileSystem } from "@openfarm/core/types/runtime";
import { defaultFileSystem } from "@openfarm/core/types/runtime";
import { err, ok, type Result } from "@openfarm/result";
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
 * Helper function to validate rules before execution
 * Refactored to use functional style and receive dependencies
 */
export const validateRules = (
  repoPath: string,
  rules: AgentConfiguration["rules"],
  fs: FileSystem = defaultFileSystem
): Result<void> => {
  if (!rules) {
    return ok(undefined);
  }

  try {
    const allFiles = getAllFiles(repoPath, repoPath, fs);

    // Check blocked patterns
    if (rules.blockedFilePatterns && rules.blockedFilePatterns.length > 0) {
      const blockedFiles = allFiles.filter((file) =>
        rules.blockedFilePatterns?.some((pattern) =>
          matchesPattern(file, pattern)
        )
      );
      if (blockedFiles.length > 0) {
        return err(
          new Error(
            `Blocked files detected: ${blockedFiles.slice(0, 5).join(", ")}`
          )
        );
      }
    }

    // Check blocked directories
    if (rules.blockedDirectories && rules.blockedDirectories.length > 0) {
      const blockedDirs = allFiles.filter((file) =>
        rules.blockedDirectories?.some((dir) => file.startsWith(`${dir}/`))
      );
      if (blockedDirs.length > 0) {
        return err(
          new Error(
            `Blocked directories detected: ${blockedDirs.slice(0, 5).join(", ")}`
          )
        );
      }
    }

    return ok(undefined);
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
};
