import {
  detectProjectContext,
  formatContextForPrompt,
} from "../prompts/context";
import type { LoadedSpec } from "../types";
import type { LLMConfig } from "./prompt-engine";
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
  const selectedProvider = options.provider ?? "opencode";
  const selectedModel = options.model ?? "";
  const supportedLlmProviders = new Set([
    "opencode",
    "claude",
    "claude-code",
    "aider",
    "copilot",
    "anthropic",
    "openai",
    "openrouter",
    "zai",
  ]);

  if (!supportedLlmProviders.has(selectedProvider)) {
    throw new Error(
      `Unsupported spec planning provider: ${selectedProvider}. Supported: ${Array.from(supportedLlmProviders).join(", ")}.`
    );
  }

  const manager = new SpecManager(options.cwd);
  await manager.init();

  const context = await detectProjectContext(options.cwd);
  const promptContext = `${formatContextForPrompt(context)}\nProvider: ${selectedProvider}\nModel: ${selectedModel}`;

  const llmConfig: LLMConfig = {
    provider: selectedProvider === "claude" ? "claude-code" : selectedProvider,
    model: selectedModel,
  };

  const promptEngine = new PromptEngine(llmConfig);
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
