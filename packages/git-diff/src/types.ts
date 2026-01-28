// Git Diff Types
// Future: Part of @openfarm/git-diff

export type ChangeType =
  | "added"
  | "modified"
  | "deleted"
  | "renamed"
  | "copied";

export interface DiffLine {
  type: "added" | "removed" | "context";
  content: string;
  lineNumber?: number;
  oldLineNumber?: number;
  newLineNumber?: number;
}

export interface DiffFile {
  path: string;
  oldPath?: string;
  changeType: ChangeType;
  additions: number;
  deletions: number;
  lines: DiffLine[];
  isBinary: boolean;
  isNew: boolean;
  isDeleted: boolean;
  isRenamed: boolean;
}

export interface DiffChange {
  files: DiffFile[];
  totalAdditions: number;
  totalDeletions: number;
  totalFiles: number;
}

export interface DiffSummary {
  filesChanged: number;
  insertions: number;
  deletions: number;
  fileTypes: Record<string, number>;
  largestFiles: Array<{
    path: string;
    changes: number;
  }>;
}

export interface DiffStats {
  additions: number;
  deletions: number;
  changes: number;
  files: number;
  binaryFiles: number;
}
