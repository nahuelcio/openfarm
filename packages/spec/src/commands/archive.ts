import type { SpecManager } from "../core/spec-manager";

export async function runArchiveCommand(
  manager: SpecManager,
  args: string[]
): Promise<void> {
  const slug = args[0];
  if (!slug) {
    throw new Error("Usage: openfarm spec archive <slug>");
  }

  const spec = await manager.load(slug, false);
  const archived = await manager.archive(spec);
  console.log(`Archived spec: ${archived.metadata.slug}`);
  console.log(`Path: ${archived.rootDir}`);
}
