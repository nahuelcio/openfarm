import type { DiffChange, DiffFile, DiffStats } from "../types";

// TODO: Move to @openfarm/git-diff when splitting repos
export class DiffAnalyzer {
  analyzeComplexity(diffChange: DiffChange): {
    complexity: "low" | "medium" | "high";
    score: number;
    factors: string[];
  } {
    const factors: string[] = [];
    let score = 0;

    // File count factor
    if (diffChange.totalFiles > 20) {
      score += 30;
      factors.push(`Many files changed (${diffChange.totalFiles})`);
    } else if (diffChange.totalFiles > 10) {
      score += 15;
      factors.push(`Multiple files changed (${diffChange.totalFiles})`);
    }

    // Change size factor
    const totalChanges = diffChange.totalAdditions + diffChange.totalDeletions;
    if (totalChanges > 1000) {
      score += 40;
      factors.push(`Large change size (${totalChanges} lines)`);
    } else if (totalChanges > 500) {
      score += 20;
      factors.push(`Medium change size (${totalChanges} lines)`);
    }

    // Binary files factor
    const binaryFiles = diffChange.files.filter((f) => f.isBinary).length;
    if (binaryFiles > 0) {
      score += 10;
      factors.push(`Binary files included (${binaryFiles})`);
    }

    // New/deleted files factor
    const newFiles = diffChange.files.filter((f) => f.isNew).length;
    const deletedFiles = diffChange.files.filter((f) => f.isDeleted).length;
    if (newFiles + deletedFiles > 5) {
      score += 15;
      factors.push(`Many new/deleted files (${newFiles + deletedFiles})`);
    }

    // File type diversity
    const extensions = new Set(
      diffChange.files.map((f) => this.getFileExtension(f.path))
    );
    if (extensions.size > 5) {
      score += 10;
      factors.push(`Multiple file types (${extensions.size})`);
    }

    // Determine complexity level
    let complexity: "low" | "medium" | "high";
    if (score >= 60) {
      complexity = "high";
    } else if (score >= 30) {
      complexity = "medium";
    } else {
      complexity = "low";
    }

    return { complexity, score, factors };
  }

  getStats(diffChange: DiffChange): DiffStats {
    const binaryFiles = diffChange.files.filter((f) => f.isBinary).length;

    return {
      additions: diffChange.totalAdditions,
      deletions: diffChange.totalDeletions,
      changes: diffChange.totalAdditions + diffChange.totalDeletions,
      files: diffChange.totalFiles,
      binaryFiles,
    };
  }

  findLargeFiles(diffChange: DiffChange, threshold = 100): DiffFile[] {
    return diffChange.files
      .filter((file) => {
        const changes = file.additions + file.deletions;
        return changes >= threshold;
      })
      .sort((a, b) => {
        const aChanges = a.additions + a.deletions;
        const bChanges = b.additions + b.deletions;
        return bChanges - aChanges;
      });
  }

  categorizeChanges(diffChange: DiffChange): {
    codeFiles: DiffFile[];
    configFiles: DiffFile[];
    documentationFiles: DiffFile[];
    testFiles: DiffFile[];
    otherFiles: DiffFile[];
  } {
    const codeExtensions = [
      "ts",
      "js",
      "tsx",
      "jsx",
      "py",
      "java",
      "cpp",
      "c",
      "cs",
      "go",
      "rs",
      "php",
    ];
    const configExtensions = [
      "json",
      "yaml",
      "yml",
      "toml",
      "ini",
      "env",
      "config",
    ];
    const docExtensions = ["md", "txt", "rst", "adoc"];
    const testPatterns = [/\.test\./, /\.spec\./, /test/, /tests/, /__tests__/];

    const categories = {
      codeFiles: [] as DiffFile[],
      configFiles: [] as DiffFile[],
      documentationFiles: [] as DiffFile[],
      testFiles: [] as DiffFile[],
      otherFiles: [] as DiffFile[],
    };

    for (const file of diffChange.files) {
      const ext = this.getFileExtension(file.path);
      const path = file.path.toLowerCase();

      if (testPatterns.some((pattern) => pattern.test(path))) {
        categories.testFiles.push(file);
      } else if (codeExtensions.includes(ext)) {
        categories.codeFiles.push(file);
      } else if (configExtensions.includes(ext)) {
        categories.configFiles.push(file);
      } else if (docExtensions.includes(ext)) {
        categories.documentationFiles.push(file);
      } else {
        categories.otherFiles.push(file);
      }
    }

    return categories;
  }

  detectPatterns(diffChange: DiffChange): {
    patterns: string[];
    confidence: number;
  } {
    const patterns: string[] = [];
    let confidence = 0;

    // Refactoring pattern
    const renamedFiles = diffChange.files.filter((f) => f.isRenamed).length;
    if (renamedFiles > 0) {
      patterns.push("File renaming/restructuring");
      confidence += 20;
    }

    // Feature addition pattern
    const newFiles = diffChange.files.filter((f) => f.isNew).length;
    if (newFiles > 2) {
      patterns.push("Feature addition");
      confidence += 30;
    }

    // Bug fix pattern
    const totalChanges = diffChange.totalAdditions + diffChange.totalDeletions;
    if (totalChanges < 50 && diffChange.totalFiles < 5) {
      patterns.push("Bug fix");
      confidence += 25;
    }

    // Configuration change pattern
    const categories = this.categorizeChanges(diffChange);
    if (categories.configFiles.length > categories.codeFiles.length) {
      patterns.push("Configuration change");
      confidence += 20;
    }

    // Documentation update pattern
    if (
      categories.documentationFiles.length > 0 &&
      categories.codeFiles.length === 0
    ) {
      patterns.push("Documentation update");
      confidence += 40;
    }

    // Test addition pattern
    if (categories.testFiles.length > 0) {
      patterns.push("Test changes");
      confidence += 15;
    }

    // Major refactoring pattern
    if (diffChange.totalFiles > 10 && totalChanges > 500) {
      patterns.push("Major refactoring");
      confidence += 35;
    }

    return {
      patterns,
      confidence: Math.min(confidence, 100),
    };
  }

  getRiskAssessment(diffChange: DiffChange): {
    risk: "low" | "medium" | "high";
    score: number;
    reasons: string[];
  } {
    const reasons: string[] = [];
    let score = 0;

    // Large changes are risky
    const totalChanges = diffChange.totalAdditions + diffChange.totalDeletions;
    if (totalChanges > 1000) {
      score += 40;
      reasons.push("Large number of changes");
    }

    // Many files changed
    if (diffChange.totalFiles > 15) {
      score += 30;
      reasons.push("Many files modified");
    }

    // Binary files
    const binaryFiles = diffChange.files.filter((f) => f.isBinary).length;
    if (binaryFiles > 0) {
      score += 20;
      reasons.push("Binary files changed");
    }

    // Deleted files
    const deletedFiles = diffChange.files.filter((f) => f.isDeleted).length;
    if (deletedFiles > 0) {
      score += 15;
      reasons.push("Files deleted");
    }

    // Configuration files changed
    const categories = this.categorizeChanges(diffChange);
    if (categories.configFiles.length > 0) {
      score += 10;
      reasons.push("Configuration files modified");
    }

    // Core files changed (common critical file patterns)
    const coreFilePatterns = [
      /package\.json/,
      /Dockerfile/,
      /\.env/,
      /config/,
      /settings/,
    ];
    const coreFilesChanged = diffChange.files.some((f) =>
      coreFilePatterns.some((pattern) => pattern.test(f.path))
    );
    if (coreFilesChanged) {
      score += 25;
      reasons.push("Core system files modified");
    }

    let risk: "low" | "medium" | "high";
    if (score >= 70) {
      risk = "high";
    } else if (score >= 35) {
      risk = "medium";
    } else {
      risk = "low";
    }

    return { risk, score, reasons };
  }

  private getFileExtension(filePath: string): string {
    const lastDot = filePath.lastIndexOf(".");
    if (lastDot === -1 || lastDot === filePath.length - 1) {
      return "no-extension";
    }
    return filePath.substring(lastDot + 1).toLowerCase();
  }

  // Utility methods
  getChangeRatio(diffChange: DiffChange): {
    additionRatio: number;
    deletionRatio: number;
  } {
    const total = diffChange.totalAdditions + diffChange.totalDeletions;
    if (total === 0) {
      return { additionRatio: 0, deletionRatio: 0 };
    }

    return {
      additionRatio: diffChange.totalAdditions / total,
      deletionRatio: diffChange.totalDeletions / total,
    };
  }

  getTopChangedFiles(
    diffChange: DiffChange,
    limit = 5
  ): Array<{
    file: DiffFile;
    changes: number;
    percentage: number;
  }> {
    const totalChanges = diffChange.totalAdditions + diffChange.totalDeletions;

    return diffChange.files
      .map((file) => ({
        file,
        changes: file.additions + file.deletions,
        percentage:
          totalChanges > 0
            ? ((file.additions + file.deletions) / totalChanges) * 100
            : 0,
      }))
      .sort((a, b) => b.changes - a.changes)
      .slice(0, limit);
  }

  summarizeByDirectory(diffChange: DiffChange): Record<
    string,
    {
      files: number;
      additions: number;
      deletions: number;
    }
  > {
    const directories: Record<
      string,
      { files: number; additions: number; deletions: number }
    > = {};

    for (const file of diffChange.files) {
      const dir = file.path.includes("/")
        ? file.path.substring(0, file.path.lastIndexOf("/"))
        : ".";

      if (!directories[dir]) {
        directories[dir] = { files: 0, additions: 0, deletions: 0 };
      }

      directories[dir].files++;
      directories[dir].additions += file.additions;
      directories[dir].deletions += file.deletions;
    }

    return directories;
  }
}
