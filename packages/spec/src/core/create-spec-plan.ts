import {
  detectProjectContext,
  formatContextForPrompt,
} from "../prompts/context";
import type { LoadedSpec } from "../types";
import { PromptEngine } from "./prompt-engine";
import { SpecManager } from "./spec-manager";

export interface CreateSpecPlanOptions {
  cwd: string;
  name: string;
  description: string;
  provider?: string;
  model?: string;
}

export async function createSpecPlan(
  options: CreateSpecPlanOptions
): Promise<LoadedSpec> {
  const manager = new SpecManager(options.cwd);
  await manager.init();

  const context = await detectProjectContext(options.cwd);
  const selectedProvider = options.provider ?? "opencode";
  const selectedModel = options.model ?? "(default)";
  const promptContext = `${formatContextForPrompt(context)}\nProvider: ${selectedProvider}\nModel: ${selectedModel}`;

  const promptEngine = new PromptEngine();
  const generated = await promptEngine.generatePlanArtifacts({
    name: options.name,
    description: options.description,
    context: promptContext,
  });
  const tasks = await promptEngine.generateTasks(
    generated.requirements,
    generated.design
  );

  return manager.create({
    name: options.name,
    description: options.description,
    artifacts: {
      proposal: generated.proposal,
      requirements: generated.requirements,
      design: generated.design,
      tasks,
    },
  });
}
