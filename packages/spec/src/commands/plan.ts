import { PromptEngine } from "../core/prompt-engine";
import type { SpecManager } from "../core/spec-manager";
import {
  detectProjectContext,
  formatContextForPrompt,
} from "../prompts/context";

export async function runPlanCommand(
  manager: SpecManager,
  args: string[]
): Promise<void> {
  const name = args[0];
  const description = args.slice(1).join(" ").trim();
  if (!(name && description)) {
    throw new Error("Usage: openfarm spec plan <name> <description>");
  }

  const context = await detectProjectContext(process.cwd());
  const promptEngine = new PromptEngine();
  const generated = await promptEngine.generatePlanArtifacts({
    name,
    description,
    context: formatContextForPrompt(context),
  });
  const tasks = await promptEngine.generateTasks(
    generated.requirements,
    generated.design
  );

  const spec = await manager.create({
    name,
    description,
    artifacts: {
      proposal: generated.proposal,
      requirements: generated.requirements,
      design: generated.design,
      tasks,
    },
  });

  console.log(`Created spec: ${spec.metadata.slug}`);
  console.log(`Path: ${spec.rootDir}`);
}
