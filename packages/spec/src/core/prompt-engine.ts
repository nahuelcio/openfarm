import {
  formatDesign,
  formatProposal,
  formatRequirements,
  formatTasks,
} from "../format/formatters";
import { loadPromptTemplate, renderPrompt } from "../prompts/loader";
import type { SpecArtifactName, SpecArtifacts } from "../types";

function refinementBlock(feedback: string): string {
  const now = new Date().toISOString();
  return `\n\n## Refinement (${now})\n\n- ${feedback}\n`;
}

export interface PlanGenerationInput {
  name: string;
  description: string;
  context: string;
}

export class PromptEngine {
  public async generatePlanArtifacts(
    input: PlanGenerationInput
  ): Promise<Omit<SpecArtifacts, "tasks">> {
    renderPrompt(await loadPromptTemplate("plan"), {
      name: input.name,
      description: input.description,
      context: input.context,
    });

    const proposal = formatProposal({
      name: input.name,
      description: input.description,
    });
    const requirements = formatRequirements({
      name: input.name,
      description: input.description,
    });
    const design = formatDesign({
      name: input.name,
      description: input.description,
    });
    return { proposal, requirements, design };
  }

  public async generateTasks(
    requirements: string,
    design: string
  ): Promise<string> {
    renderPrompt(await loadPromptTemplate("tasks"), {
      requirements,
      design,
    });
    const base = formatTasks({ name: "Implementation", description: "" });
    if (!(requirements.trim() || design.trim())) {
      return base;
    }
    return `${base}\n## Inputs\n\n- Requirements length: ${requirements.length}\n- Design length: ${design.length}\n`;
  }

  public async refineArtifact(
    current: string,
    feedback: string,
    artifact: SpecArtifactName | "all"
  ): Promise<string> {
    renderPrompt(await loadPromptTemplate("refine"), {
      artifact,
      feedback,
      context: current,
    });
    return `${current.trimEnd()}${refinementBlock(feedback)}`;
  }
}
