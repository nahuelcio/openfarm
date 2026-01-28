// Git Diff Package
// Future: @openfarm/git-diff (OSS)

export { DiffAnalyzer } from "./services/diff-analyzer";
export { DiffProcessor } from "./services/diff-processor";

export type {
  ChangeType,
  DiffChange,
  DiffFile,
  DiffLine,
  DiffStats,
  DiffSummary,
} from "./types";
