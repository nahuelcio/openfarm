import type { ChangesSummary } from "@openfarm/core/types/adapters";
import type { ExecFunction } from "@openfarm/core/types/runtime";
import { err, ok, type Result } from "@openfarm/result";

/**
 * Parses git status output and extracts file changes.
 * This is a pure function with no side effects.
 *
 * @param gitStatusOutput - Output from `git status --porcelain`
 * @returns Object with arrays of modified, created, and deleted files
 *
 * @example
 * ```typescript
 * const changes = parseGitStatus('?? newfile.ts\n M modified.ts\n D deleted.ts');
 * // Returns: { modified: ['modified.ts'], created: ['newfile.ts'], deleted: ['deleted.ts'] }
 * ```
 */
export function parseGitStatus(gitStatusOutput: string): {
  modified: string[];
  created: string[];
  deleted: string[];
} {
  const statusLines = gitStatusOutput.trim().split("\n");

  const changes = statusLines.reduce(
    (acc, line) => {
      if (!line.trim()) {
        return acc;
      }

      const status = line.substring(0, 2);
      const file = line.substring(3).trim();

      if (status.startsWith("??")) {
        return {
          ...acc,
          created: [...acc.created, file],
        };
      }
      if (status.includes("D")) {
        return {
          ...acc,
          deleted: [...acc.deleted, file],
        };
      }
      if (status.includes("M") || status.includes("A")) {
        if (status.includes("A")) {
          return {
            ...acc,
            created: [...acc.created, file],
          };
        }
        return {
          ...acc,
          modified: [...acc.modified, file],
        };
      }

      return acc;
    },
    {
      modified: [] as string[],
      created: [] as string[],
      deleted: [] as string[],
    }
  );

  return changes;
}

/**
 * Builds summary text from changes.
 * This is a pure function with no side effects.
 *
 * @param changes - Changes summary object
 * @returns Summary text string
 *
 * @example
 * ```typescript
 * const summary = buildChangesSummary({
 *   filesModified: ['file1.ts'],
 *   filesCreated: ['file2.ts'],
 *   filesDeleted: []
 * });
 * // Returns: 'Modified: 1 file(s), Created: 1 file(s)'
 * ```
 */
export function buildChangesSummary(changes: {
  filesModified?: string[];
  filesCreated?: string[];
  filesDeleted?: string[];
}): string {
  const summaryParts: string[] = [];

  if (changes.filesModified && changes.filesModified.length > 0) {
    summaryParts.push(`Modified: ${changes.filesModified.length} file(s)`);
  }
  if (changes.filesCreated && changes.filesCreated.length > 0) {
    summaryParts.push(`Created: ${changes.filesCreated.length} file(s)`);
  }
  if (changes.filesDeleted && changes.filesDeleted.length > 0) {
    summaryParts.push(`Deleted: ${changes.filesDeleted.length} file(s)`);
  }

  return summaryParts.length > 0
    ? summaryParts.join(", ")
    : "No changes detected";
}

/**
 * Captures changes from git repository.
 * This function reads git status and diff to build a changes summary.
 *
 * @param repoPath - Path to repository
 * @param execAsync - Exec function for running git commands
 * @param previewMode - Whether in preview mode
 * @returns Result with changes summary
 *
 * @example
 * ```typescript
 * const result = await captureGitChanges(
 *   './repo',
 *   execAsync,
 *   false,
 * );
 * ```
 */
export async function captureGitChanges(
  repoPath: string,
  execAsync: ExecFunction,
  previewMode: boolean
): Promise<Result<ChangesSummary>> {
  try {
    const { stdout: gitStatus } = await execAsync("git", [
      "-C",
      repoPath,
      "status",
      "--porcelain",
    ]);

    const changes: ChangesSummary = {
      filesModified: [],
      filesCreated: [],
      filesDeleted: [],
      diff: "",
      summary: "",
    };

    if (gitStatus.trim()) {
      const parsedChanges = parseGitStatus(gitStatus);
      changes.filesModified = parsedChanges.modified;
      changes.filesCreated = parsedChanges.created;
      changes.filesDeleted = parsedChanges.deleted;

      // Try to get diff
      try {
        const { stdout: gitDiff } = await execAsync("git", [
          "-C",
          repoPath,
          "diff",
          "HEAD",
        ]);
        changes.diff = gitDiff;
      } catch {
        try {
          const { stdout: gitDiff } = await execAsync("git", [
            "-C",
            repoPath,
            "diff",
          ]);
          changes.diff = gitDiff;
        } catch {
          // No diff available
        }
      }
    }

    changes.summary = buildChangesSummary(changes);

    return ok(changes);
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
}
