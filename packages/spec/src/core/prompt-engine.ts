import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  type CodingEngineFactoryOptions,
  createCodingEngine,
  LlmService,
} from "@openfarm/agent-runner";
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

export interface LLMConfig {
  provider: string;
  model: string;
  apiKey?: string;
  apiBase?: string;
}

const WORKFLOW_CODE_PROVIDERS = new Set(["opencode", "claude-code", "aider"]);

/**
 * Parse markdown response to extract proposal, requirements, and design sections.
 * Handles various markdown heading formats.
 */
function parsePlanArtifacts(content: string): {
  proposal: string;
  requirements: string;
  design: string;
} {
  const normalized = content.replace(/\r\n/g, "\n");

  // Find section positions using regex for heading patterns
  const proposalMatch = normalized.match(
    /(?:^|\n)#{1,2}\s*(?:1?\s*)?[Pp]roposal/
  );
  const requirementsMatch = normalized.match(
    /(?:^|\n)#{1,2}\s*(?:2?\s*)?[Rr]equirements/
  );
  const designMatch = normalized.match(/(?:^|\n)#{1,2}\s*(?:3?\s*)?[Dd]esign/);
  const tasksMatch = normalized.match(/(?:^|\n)#{1,2}\s*(?:4?\s*)?[Tt]asks/);

  let proposal = "";
  let requirements = "";
  let design = "";

  // Extract proposal section
  if (proposalMatch) {
    const start = proposalMatch.index! + proposalMatch[0].length;
    const end =
      requirementsMatch?.index ??
      designMatch?.index ??
      tasksMatch?.index ??
      normalized.length;
    proposal = normalized.slice(start, end).trim();
  }

  // Extract requirements section
  if (requirementsMatch) {
    const start = requirementsMatch.index! + requirementsMatch[0].length;
    const end = designMatch?.index ?? tasksMatch?.index ?? normalized.length;
    requirements = normalized.slice(start, end).trim();
  }

  // Extract design section
  if (designMatch) {
    const start = designMatch.index! + designMatch[0].length;
    const end = tasksMatch?.index ?? normalized.length;
    design = normalized.slice(start, end).trim();
  }

  // Fallback: if parsing failed, try simple heuristic splitting
  if (!(proposal || requirements || design)) {
    const parts = normalized
      .split(/(?:^|\n)#{1,2}\s*(?:\d?\s*)?[A-Za-z]+/)
      .filter(Boolean);
    if (parts.length >= 3) {
      proposal = parts[0].trim();
      requirements = parts[1].trim();
      design = parts[2].trim();
    }
  }

  return { proposal, requirements, design };
}

/**
 * Parse markdown response to extract tasks section.
 */
function parseTasksSection(content: string): string {
  const normalized = content.replace(/\r\n/g, "\n");
  const tasksMatch = normalized.match(/(?:^|\n)#{1,2}\s*[Tt]asks/);

  if (tasksMatch) {
    const start = tasksMatch.index! + tasksMatch[0].length;
    return normalized.slice(start).trim();
  }

  // Fallback: return full content if no tasks heading found
  return normalized.trim();
}

export class PromptEngine {
  private readonly llmService: LlmService;

  constructor(private readonly config?: LLMConfig) {
    this.llmService = new LlmService();
  }

  private isCodeWorkflowProvider(provider: string): boolean {
    return WORKFLOW_CODE_PROVIDERS.has(provider);
  }

  private mapProviderForCodingEngine(
    provider: string
  ): CodingEngineFactoryOptions["provider"] {
    if (provider === "claude") {
      return "claude-code";
    }
    if (
      provider === "opencode" ||
      provider === "claude-code" ||
      provider === "aider"
    ) {
      return provider;
    }
    throw new Error(
      `Unsupported workflow provider for spec generation: ${provider}`
    );
  }

  private async runHiddenSpecWorkflowStep(
    instruction: string,
    timeoutMs: number
  ): Promise<string> {
    if (!this.config) {
      throw new Error("Missing LLM config for workflow step execution");
    }

    const provider = this.mapProviderForCodingEngine(this.config.provider);
    const logLines: string[] = [];
    const tempWorkspace = await mkdtemp(
      path.join(os.tmpdir(), "openfarm-spec-")
    );
    try {
      const engine = await createCodingEngine({
        provider,
        model: this.config.model || undefined,
        onLog: (message) => {
          const trimmed = message.trim();
          if (!trimmed) {
            return;
          }
          logLines.push(trimmed);
          if (logLines.length > 12) {
            logLines.shift();
          }
        },
      });
      const result = await Promise.race([
        engine.applyChanges(instruction, tempWorkspace),
        new Promise<never>((_, reject) => {
          setTimeout(
            () =>
              reject(
                new Error(`Spec workflow step timed out (${timeoutMs}ms)`)
              ),
            timeoutMs
          );
        }),
      ]);

      if (!result.ok) {
        const baseReason =
          result.error instanceof Error
            ? result.error.message
            : String(result.error);
        const logSuffix =
          logLines.length > 0
            ? ` | recent logs: ${logLines.join(" || ").slice(0, 1200)}`
            : "";
        throw new Error(
          `Spec workflow execution failed: ${baseReason}${logSuffix}`
        );
      }
      const text = result.value.summary?.trim() || "";
      if (!text) {
        throw new Error("Spec workflow step returned empty output");
      }
      return text;
    } finally {
      await rm(tempWorkspace, { recursive: true, force: true });
    }
  }

  public async generatePlanArtifacts(
    input: PlanGenerationInput
  ): Promise<Omit<SpecArtifacts, "tasks">> {
    const template = await loadPromptTemplate("plan");
    const prompt = renderPrompt(template, {
      name: input.name,
      description: input.description,
      context: input.context,
    });

    // If no LLM config provided, fall back to template formatters
    if (!this.config) {
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

    try {
      if (this.isCodeWorkflowProvider(this.config.provider)) {
        try {
          const workflowPrompt = [
            "You are generating planning artifacts for a software spec.",
            "Do not modify files. Return markdown only.",
            "Return these sections in this exact order:",
            "# Proposal",
            "# Requirements",
            "# Design",
            "",
            prompt,
          ].join("\n");

          const text = await this.runHiddenSpecWorkflowStep(
            workflowPrompt,
            120_000
          );
          const { proposal, requirements, design } = parsePlanArtifacts(text);

          if (!(proposal && requirements && design)) {
            throw new Error(
              "Spec workflow response could not be parsed into proposal/requirements/design sections"
            );
          }

          return { proposal, requirements, design };
        } catch (error) {
          if (this.config.provider !== "opencode") {
            throw error;
          }
        }
      }

      const result = await this.llmService.complete({
        prompt,
        systemPrompt: template.system,
        provider: {
          provider: this.config.provider,
          model: this.config.model,
          apiKey: this.config.apiKey,
          apiBase: this.config.apiBase,
        },
        temperature: 0.7,
        timeout: 120_000, // 2 minutes for plan generation
      });

      const { proposal, requirements, design } = parsePlanArtifacts(
        result.text
      );

      if (!(proposal && requirements && design)) {
        throw new Error(
          "LLM response could not be parsed into proposal/requirements/design sections"
        );
      }

      return { proposal, requirements, design };
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      throw new Error(`LLM plan generation failed: ${reason}`);
    }
  }

  public async generateTasks(
    requirements: string,
    design: string
  ): Promise<string> {
    const template = await loadPromptTemplate("tasks");
    const prompt = renderPrompt(template, {
      requirements,
      design,
    });

    // If no LLM config provided, fall back to template formatter
    if (!this.config) {
      const base = formatTasks({ name: "Implementation", description: "" });
      if (!(requirements.trim() || design.trim())) {
        return base;
      }
      return `${base}\n## Inputs\n\n- Requirements length: ${requirements.length}\n- Design length: ${design.length}\n`;
    }

    try {
      if (this.isCodeWorkflowProvider(this.config.provider)) {
        try {
          const workflowPrompt = [
            "You are generating implementation tasks from requirements and design.",
            "Do not modify files. Return markdown only.",
            "Return exactly one section with heading '# Tasks'.",
            "",
            prompt,
          ].join("\n");

          const text = await this.runHiddenSpecWorkflowStep(
            workflowPrompt,
            60_000
          );
          const tasks = parseTasksSection(text);
          if (!tasks) {
            throw new Error(
              "Spec workflow response did not include tasks content"
            );
          }
          return tasks;
        } catch (error) {
          if (this.config.provider !== "opencode") {
            throw error;
          }
        }
      }

      const result = await this.llmService.complete({
        prompt,
        systemPrompt: template.system,
        provider: {
          provider: this.config.provider,
          model: this.config.model,
          apiKey: this.config.apiKey,
          apiBase: this.config.apiBase,
        },
        temperature: 0.7,
        timeout: 60_000, // 1 minute for task generation
      });

      const tasks = parseTasksSection(result.text);

      if (!tasks) {
        throw new Error("LLM response did not include tasks content");
      }

      return tasks;
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      throw new Error(`LLM task generation failed: ${reason}`);
    }
  }

  public async refineArtifact(
    current: string,
    feedback: string,
    artifact: SpecArtifactName | "all"
  ): Promise<string> {
    const template = await loadPromptTemplate("refine");
    const prompt = renderPrompt(template, {
      artifact,
      feedback,
      context: current,
    });

    // If no LLM config provided, just append refinement block
    if (!this.config) {
      return `${current.trimEnd()}${refinementBlock(feedback)}`;
    }

    try {
      const result = await this.llmService.complete({
        prompt,
        systemPrompt: template.system,
        provider: {
          provider: this.config.provider,
          model: this.config.model,
          apiKey: this.config.apiKey,
          apiBase: this.config.apiBase,
        },
        temperature: 0.7,
        timeout: 60_000,
      });

      return result.text.trim();
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      throw new Error(`LLM refinement failed: ${reason}`);
    }
  }
}
