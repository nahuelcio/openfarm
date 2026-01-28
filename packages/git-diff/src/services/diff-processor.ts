import type {
  ChangeType,
  DiffChange,
  DiffFile,
  DiffLine,
  DiffSummary,
} from "../types";

// TODO: Move to @openfarm/git-diff when splitting repos
export class DiffProcessor {
  parseDiff(diffText: string): DiffChange {
    const files: DiffFile[] = [];
    const lines = diffText.split("\n");

    let currentFile: Partial<DiffFile> | null = null;
    let currentLines: DiffLine[] = [];
    let oldLineNumber = 0;
    let newLineNumber = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;

      // File header
      if (line.startsWith("diff --git")) {
        // Save previous file
        if (currentFile) {
          files.push(this.completeFile(currentFile, currentLines));
        }

        // Start new file
        currentFile = {
          lines: [],
          additions: 0,
          deletions: 0,
          isBinary: false,
          isNew: false,
          isDeleted: false,
          isRenamed: false,
        };
        currentLines = [];

        // Extract file paths
        const match = line.match(/diff --git a\/(.+) b\/(.+)/);
        if (match) {
          currentFile.oldPath = match[1];
          currentFile.path = match[2];
        }
      }
      // File mode changes
      else if (line.startsWith("new file mode")) {
        if (currentFile) {
          currentFile.isNew = true;
          currentFile.changeType = "added";
        }
      } else if (line.startsWith("deleted file mode")) {
        if (currentFile) {
          currentFile.isDeleted = true;
          currentFile.changeType = "deleted";
        }
      } else if (
        line.startsWith("rename from") ||
        line.startsWith("rename to")
      ) {
        if (currentFile) {
          currentFile.isRenamed = true;
          currentFile.changeType = "renamed";
        }
      }
      // Binary file
      else if (line.includes("Binary files") && line.includes("differ")) {
        if (currentFile) {
          currentFile.isBinary = true;
        }
      }
      // Hunk header
      else if (line.startsWith("@@")) {
        const match = line.match(/@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
        if (match && match[1] && match[2]) {
          oldLineNumber = Number.parseInt(match[1]);
          newLineNumber = Number.parseInt(match[2]);
        }
      }
      // Content lines
      else if (line.startsWith("+") && !line.startsWith("+++")) {
        const diffLine: DiffLine = {
          type: "added",
          content: line.substring(1),
          newLineNumber: newLineNumber++,
        };
        currentLines.push(diffLine);
        if (currentFile)
          currentFile.additions = (currentFile.additions || 0) + 1;
      } else if (line.startsWith("-") && !line.startsWith("---")) {
        const diffLine: DiffLine = {
          type: "removed",
          content: line.substring(1),
          oldLineNumber: oldLineNumber++,
        };
        currentLines.push(diffLine);
        if (currentFile)
          currentFile.deletions = (currentFile.deletions || 0) + 1;
      } else if (line.startsWith(" ")) {
        const diffLine: DiffLine = {
          type: "context",
          content: line.substring(1),
          oldLineNumber: oldLineNumber++,
          newLineNumber: newLineNumber++,
        };
        currentLines.push(diffLine);
      }
    }

    // Save last file
    if (currentFile) {
      files.push(this.completeFile(currentFile, currentLines));
    }

    const totalAdditions = files.reduce((sum, file) => sum + file.additions, 0);
    const totalDeletions = files.reduce((sum, file) => sum + file.deletions, 0);

    return {
      files,
      totalAdditions,
      totalDeletions,
      totalFiles: files.length,
    };
  }

  extractModifiedFiles(diffChange: DiffChange): string[] {
    return diffChange.files.map((file) => file.path);
  }

  generateSummary(diffChange: DiffChange): DiffSummary {
    const fileTypes: Record<string, number> = {};
    const fileSizes: Array<{ path: string; changes: number }> = [];

    for (const file of diffChange.files) {
      // Count file types
      const extension = this.getFileExtension(file.path);
      fileTypes[extension] = (fileTypes[extension] || 0) + 1;

      // Track file sizes
      const changes = file.additions + file.deletions;
      fileSizes.push({ path: file.path, changes });
    }

    // Sort by changes (largest first)
    const largestFiles = fileSizes
      .sort((a, b) => b.changes - a.changes)
      .slice(0, 5);

    return {
      filesChanged: diffChange.totalFiles,
      insertions: diffChange.totalAdditions,
      deletions: diffChange.totalDeletions,
      fileTypes,
      largestFiles,
    };
  }

  formatSummary(summary: DiffSummary): string {
    const parts: string[] = [];

    if (summary.filesChanged === 1) {
      parts.push("1 file changed");
    } else {
      parts.push(`${summary.filesChanged} files changed`);
    }

    if (summary.insertions > 0) {
      parts.push(`${summary.insertions} insertions(+)`);
    }

    if (summary.deletions > 0) {
      parts.push(`${summary.deletions} deletions(-)`);
    }

    return parts.join(", ");
  }

  getFileStats(file: DiffFile): {
    additions: number;
    deletions: number;
    changes: number;
  } {
    return {
      additions: file.additions,
      deletions: file.deletions,
      changes: file.additions + file.deletions,
    };
  }

  filterFilesByType(diffChange: DiffChange, extensions: string[]): DiffFile[] {
    return diffChange.files.filter((file) => {
      const ext = this.getFileExtension(file.path);
      return extensions.includes(ext);
    });
  }

  filterFilesByChangeType(
    diffChange: DiffChange,
    changeType: ChangeType
  ): DiffFile[] {
    return diffChange.files.filter((file) => file.changeType === changeType);
  }

  private completeFile(
    partialFile: Partial<DiffFile>,
    lines: DiffLine[]
  ): DiffFile {
    const changeType =
      partialFile.changeType || this.inferChangeType(partialFile);

    return {
      path: partialFile.path || "",
      oldPath: partialFile.oldPath,
      changeType,
      additions: partialFile.additions || 0,
      deletions: partialFile.deletions || 0,
      lines,
      isBinary: partialFile.isBinary,
      isNew: partialFile.isNew,
      isDeleted: partialFile.isDeleted,
      isRenamed: partialFile.isRenamed,
    };
  }

  private inferChangeType(file: Partial<DiffFile>): ChangeType {
    if (file.isNew) return "added";
    if (file.isDeleted) return "deleted";
    if (file.isRenamed) return "renamed";
    return "modified";
  }

  private getFileExtension(filePath: string): string {
    const lastDot = filePath.lastIndexOf(".");
    if (lastDot === -1 || lastDot === filePath.length - 1) {
      return "no-extension";
    }
    return filePath.substring(lastDot + 1).toLowerCase();
  }

  // Utility methods
  getTotalChanges(diffChange: DiffChange): number {
    return diffChange.totalAdditions + diffChange.totalDeletions;
  }

  getChangedFileCount(diffChange: DiffChange): number {
    return diffChange.totalFiles;
  }

  hasChanges(diffChange: DiffChange): boolean {
    return diffChange.totalFiles > 0;
  }

  getLargestFile(diffChange: DiffChange): DiffFile | null {
    if (diffChange.files.length === 0) return null;

    return diffChange.files.reduce((largest, current) => {
      const currentChanges = current.additions + current.deletions;
      const largestChanges = largest.additions + largest.deletions;
      return currentChanges > largestChanges ? current : largest;
    });
  }

  getFilesByExtension(diffChange: DiffChange): Record<string, DiffFile[]> {
    const grouped: Record<string, DiffFile[]> = {};

    for (const file of diffChange.files) {
      const ext = this.getFileExtension(file.path);
      if (!grouped[ext]) {
        grouped[ext] = [];
      }
      grouped[ext].push(file);
    }

    return grouped;
  }
}
