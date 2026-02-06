import {
  access,
  mkdir,
  readFile,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import {
  type CreateSpecInput,
  type LoadedSpec,
  SPEC_STATUS,
  type SpecArtifactName,
  type SpecArtifacts,
  type SpecListOptions,
  type SpecMetadata,
  type SpecStatus,
} from "../types";

const META_FILE = "_meta.json";

const ARTIFACT_FILES: SpecArtifacts = {
  proposal: "01-proposal.md",
  requirements: "02-requirements.md",
  design: "03-design.md",
  tasks: "04-tasks.md",
};

const ALLOWED_TRANSITIONS: Record<SpecStatus, SpecStatus[]> = {
  draft: ["ready", "archived"],
  ready: ["implementing", "archived"],
  implementing: ["done", "archived"],
  done: ["archived"],
  archived: [],
};

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function isStatus(value: string): value is SpecStatus {
  return SPEC_STATUS.includes(value as SpecStatus);
}

function ensureMetadataShape(value: unknown): SpecMetadata {
  if (!value || typeof value !== "object") {
    throw new Error("Invalid metadata: expected object");
  }
  const meta = value as Partial<SpecMetadata>;
  if (
    !(meta.slug && meta.name && meta.status && meta.createdAt && meta.updatedAt)
  ) {
    throw new Error("Invalid metadata: missing required fields");
  }
  if (!isStatus(meta.status)) {
    throw new Error(`Invalid metadata status: ${meta.status}`);
  }
  const artifacts = meta.artifacts;
  if (
    !artifacts ||
    typeof artifacts !== "object" ||
    !artifacts.proposal ||
    !artifacts.requirements ||
    !artifacts.design ||
    !artifacts.tasks
  ) {
    throw new Error("Invalid metadata artifacts");
  }

  return {
    slug: meta.slug,
    name: meta.name,
    status: meta.status,
    createdAt: meta.createdAt,
    updatedAt: meta.updatedAt,
    archivedAt: meta.archivedAt ?? null,
    artifacts: {
      proposal: artifacts.proposal,
      requirements: artifacts.requirements,
      design: artifacts.design,
      tasks: artifacts.tasks,
    },
  };
}

async function readMetadata(metaPath: string): Promise<SpecMetadata> {
  const raw = await readFile(metaPath, "utf-8");
  const parsed: unknown = JSON.parse(raw);
  return ensureMetadataShape(parsed);
}

async function writeMetadata(
  metaPath: string,
  metadata: SpecMetadata
): Promise<void> {
  await writeFile(metaPath, `${JSON.stringify(metadata, null, 2)}\n`, "utf-8");
}

export class SpecManager {
  public readonly specsDir: string;
  public readonly archiveDir: string;

  public constructor(private readonly cwd: string = process.cwd()) {
    this.specsDir = path.join(this.cwd, ".openfarm", "specs");
    this.archiveDir = path.join(this.specsDir, "archive");
  }

  public async init(): Promise<void> {
    await mkdir(this.specsDir, { recursive: true });
    await mkdir(this.archiveDir, { recursive: true });
  }

  public async exists(slug: string): Promise<boolean> {
    const specPath = path.join(this.specsDir, slug);
    try {
      await access(specPath);
      return true;
    } catch {
      return false;
    }
  }

  private async generateUniqueSlug(baseName: string): Promise<string> {
    const baseSlug = slugify(baseName);
    if (!baseSlug) {
      throw new Error("Name must generate a valid slug");
    }

    // Check if base slug is available
    if (!(await this.exists(baseSlug))) {
      return baseSlug;
    }

    // Try adding incrementing numbers
    for (let i = 2; i <= 100; i++) {
      const candidate = `${baseSlug}-${i}`;
      if (!(await this.exists(candidate))) {
        return candidate;
      }
    }

    // Fall back to timestamp if too many duplicates
    const timestamp = Date.now().toString(36);
    return `${baseSlug}-${timestamp}`;
  }

  public async create(input: CreateSpecInput): Promise<LoadedSpec> {
    await this.init();
    const slug = await this.generateUniqueSlug(input.name);
    const specDir = path.join(this.specsDir, slug);
    await mkdir(specDir, { recursive: true });

    const now = new Date().toISOString();
    const metadata: SpecMetadata = {
      slug,
      name: input.name,
      status: "draft",
      createdAt: now,
      updatedAt: now,
      archivedAt: null,
      artifacts: { ...ARTIFACT_FILES },
    };

    await writeMetadata(path.join(specDir, META_FILE), metadata);
    await writeFile(
      path.join(specDir, ARTIFACT_FILES.proposal),
      input.artifacts.proposal,
      "utf-8"
    );
    await writeFile(
      path.join(specDir, ARTIFACT_FILES.requirements),
      input.artifacts.requirements,
      "utf-8"
    );
    await writeFile(
      path.join(specDir, ARTIFACT_FILES.design),
      input.artifacts.design,
      "utf-8"
    );
    await writeFile(
      path.join(specDir, ARTIFACT_FILES.tasks),
      input.artifacts.tasks,
      "utf-8"
    );

    return {
      metadata,
      rootDir: specDir,
      archived: false,
    };
  }

  public async load(slug: string, includeArchived = true): Promise<LoadedSpec> {
    const specPath = path.join(this.specsDir, slug);
    const metaPath = path.join(specPath, META_FILE);
    try {
      const metadata = await readMetadata(metaPath);
      return { metadata, rootDir: specPath, archived: false };
    } catch (_error) {
      if (!includeArchived) {
        throw new Error(`Spec not found: ${slug}`);
      }
    }

    const archivedDirs = await this.listDirectories(this.archiveDir);
    for (const dir of archivedDirs) {
      if (!dir.endsWith(`-${slug}`)) {
        continue;
      }
      const fullDir = path.join(this.archiveDir, dir);
      const metadata = await readMetadata(path.join(fullDir, META_FILE));
      return { metadata, rootDir: fullDir, archived: true };
    }

    throw new Error(`Spec not found: ${slug}`);
  }

  public async list(options: SpecListOptions = {}): Promise<LoadedSpec[]> {
    const activeSpecs = await this.listFromDir(this.specsDir, false);
    const archivedSpecs = options.includeArchived
      ? await this.listFromDir(this.archiveDir, true)
      : [];
    const merged = [...activeSpecs, ...archivedSpecs];
    const filtered = options.status
      ? merged.filter((spec) => spec.metadata.status === options.status)
      : merged;

    return filtered.sort((a, b) =>
      a.metadata.updatedAt < b.metadata.updatedAt ? 1 : -1
    );
  }

  public async loadArtifacts(spec: LoadedSpec): Promise<SpecArtifacts> {
    const proposal = await readFile(
      path.join(spec.rootDir, spec.metadata.artifacts.proposal),
      "utf-8"
    );
    const requirements = await readFile(
      path.join(spec.rootDir, spec.metadata.artifacts.requirements),
      "utf-8"
    );
    const design = await readFile(
      path.join(spec.rootDir, spec.metadata.artifacts.design),
      "utf-8"
    );
    const tasks = await readFile(
      path.join(spec.rootDir, spec.metadata.artifacts.tasks),
      "utf-8"
    );

    return { proposal, requirements, design, tasks };
  }

  public async writeArtifact(
    spec: LoadedSpec,
    artifact: SpecArtifactName,
    content: string
  ): Promise<void> {
    const targetPath = path.join(
      spec.rootDir,
      spec.metadata.artifacts[artifact]
    );
    await writeFile(targetPath, content, "utf-8");
    await this.updateMetadata(spec, {
      updatedAt: new Date().toISOString(),
    });
  }

  public async updateStatus(
    spec: LoadedSpec,
    nextStatus: SpecStatus,
    allowManualOverride = false
  ): Promise<void> {
    const current = spec.metadata.status;
    const allowed = ALLOWED_TRANSITIONS[current];
    if (!(allowManualOverride || allowed.includes(nextStatus))) {
      throw new Error(`Invalid status transition: ${current} -> ${nextStatus}`);
    }
    await this.updateMetadata(spec, {
      status: nextStatus,
      updatedAt: new Date().toISOString(),
      archivedAt:
        nextStatus === "archived"
          ? new Date().toISOString()
          : spec.metadata.archivedAt,
    });
  }

  public async archive(spec: LoadedSpec): Promise<LoadedSpec> {
    const today = new Date().toISOString().slice(0, 10);
    const archiveSlug = `${today}-${spec.metadata.slug}`;
    const destination = path.join(this.archiveDir, archiveSlug);
    await mkdir(this.archiveDir, { recursive: true });
    await rename(spec.rootDir, destination);
    const archivedSpec: LoadedSpec = {
      metadata: {
        ...spec.metadata,
        status: "archived",
        updatedAt: new Date().toISOString(),
        archivedAt: new Date().toISOString(),
      },
      rootDir: destination,
      archived: true,
    };
    await writeMetadata(
      path.join(destination, META_FILE),
      archivedSpec.metadata
    );
    return archivedSpec;
  }

  public async remove(slug: string): Promise<void> {
    await rm(path.join(this.specsDir, slug), { recursive: true, force: true });
  }

  private async updateMetadata(
    spec: LoadedSpec,
    patch: Partial<SpecMetadata>
  ): Promise<void> {
    const updated: SpecMetadata = {
      ...spec.metadata,
      ...patch,
    };
    spec.metadata = updated;
    await writeMetadata(path.join(spec.rootDir, META_FILE), updated);
  }

  private async listFromDir(
    rootDir: string,
    archived: boolean
  ): Promise<LoadedSpec[]> {
    const dirs = await this.listDirectories(rootDir);
    const loaded: LoadedSpec[] = [];
    for (const dir of dirs) {
      const root = path.join(rootDir, dir);
      const metaPath = path.join(root, META_FILE);
      try {
        const metadata = await readMetadata(metaPath);
        loaded.push({
          metadata,
          rootDir: root,
          archived,
        });
      } catch (_error) {}
    }
    return loaded;
  }

  private async listDirectories(rootDir: string): Promise<string[]> {
    const { readdir } = await import("node:fs/promises");
    try {
      const entries = await readdir(rootDir, { withFileTypes: true });
      return entries
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name);
    } catch (_error) {
      return [];
    }
  }
}
