import type { SpecManager } from "../core/spec-manager";
import { parseArgs, parseArtifact } from "./shared";

export async function runShowCommand(
  manager: SpecManager,
  rawArgs: string[]
): Promise<void> {
  const parsed = parseArgs(rawArgs);
  const slug = parsed.positional[0];
  if (!slug) {
    throw new Error("Usage: openfarm spec show <slug> [--raw <artifact>]");
  }

  const spec = await manager.load(slug);
  const artifacts = await manager.loadArtifacts(spec);
  const rawFlag = parsed.flags.raw;
  if (typeof rawFlag === "string") {
    const artifact = parseArtifact(rawFlag);
    console.log(artifacts[artifact]);
    return;
  }

  console.log(`# ${spec.metadata.name}`);
  console.log(`slug: ${spec.metadata.slug}`);
  console.log(`status: ${spec.metadata.status}`);
  console.log(`updatedAt: ${spec.metadata.updatedAt}`);
  console.log(`archived: ${spec.archived ? "yes" : "no"}`);
}
