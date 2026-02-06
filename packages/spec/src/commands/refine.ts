import { PromptEngine } from "../core/prompt-engine";
import type { SpecManager } from "../core/spec-manager";
import { parseArgs, parseArtifact } from "./shared";

export async function runRefineCommand(
  manager: SpecManager,
  rawArgs: string[]
): Promise<void> {
  const parsed = parseArgs(rawArgs);
  const slug = parsed.positional[0];
  const feedback = parsed.positional.slice(1).join(" ").trim();

  if (!(slug && feedback)) {
    throw new Error(
      "Usage: openfarm spec refine <slug> <feedback> [--focus <artifact>]"
    );
  }

  const focusFlag = parsed.flags.focus;
  const focus =
    typeof focusFlag === "string" ? parseArtifact(focusFlag) : "all";
  const spec = await manager.load(slug);
  const artifacts = await manager.loadArtifacts(spec);
  const promptEngine = new PromptEngine();

  if (focus === "all") {
    await manager.writeArtifact(
      spec,
      "proposal",
      await promptEngine.refineArtifact(artifacts.proposal, feedback, "all")
    );
    await manager.writeArtifact(
      spec,
      "requirements",
      await promptEngine.refineArtifact(artifacts.requirements, feedback, "all")
    );
    await manager.writeArtifact(
      spec,
      "design",
      await promptEngine.refineArtifact(artifacts.design, feedback, "all")
    );
    await manager.writeArtifact(
      spec,
      "tasks",
      await promptEngine.refineArtifact(artifacts.tasks, feedback, "all")
    );
  } else {
    await manager.writeArtifact(
      spec,
      focus,
      await promptEngine.refineArtifact(artifacts[focus], feedback, focus)
    );
  }

  console.log(`Refined spec: ${slug}`);
}
