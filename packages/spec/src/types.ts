export const SPEC_STATUS = [
  "draft",
  "ready",
  "implementing",
  "done",
  "archived",
] as const;

export type SpecStatus = (typeof SPEC_STATUS)[number];

export type SpecArtifactName = "proposal" | "requirements" | "design" | "tasks";

export interface SpecArtifacts {
  proposal: string;
  requirements: string;
  design: string;
  tasks: string;
}

export interface SpecMetadata {
  slug: string;
  name: string;
  status: SpecStatus;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  artifacts: SpecArtifacts;
}

export interface LoadedSpec {
  metadata: SpecMetadata;
  rootDir: string;
  archived: boolean;
}

export interface SpecListOptions {
  includeArchived?: boolean;
  status?: SpecStatus;
}

export interface CreateSpecInput {
  name: string;
  description: string;
  artifacts: SpecArtifacts;
}

export interface ProjectContext {
  cwd: string;
  packageManager?: string;
  workspaceName?: string;
  topLevelDirs: string[];
}
