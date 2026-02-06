import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";

export interface PromptTemplate {
  version: number;
  source?: string;
  system: string;
  prompt: string;
}

type PromptTemplateName = "plan" | "refine" | "tasks";

const TEMPLATE_FILES: Record<PromptTemplateName, string> = {
  plan: "plan.yaml",
  refine: "refine.yaml",
  tasks: "tasks.yaml",
};

const templateCache = new Map<PromptTemplateName, PromptTemplate>();

function resolvePromptPath(fileName: string): string {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  return path.join(currentDir, fileName);
}

function ensureTemplate(
  value: unknown,
  name: PromptTemplateName
): PromptTemplate {
  if (!value || typeof value !== "object") {
    throw new Error(`Invalid prompt YAML (${name}): expected object`);
  }
  const parsed = value as Partial<PromptTemplate>;
  if (typeof parsed.system !== "string" || typeof parsed.prompt !== "string") {
    throw new Error(`Invalid prompt YAML (${name}): missing system/prompt`);
  }
  return {
    version: typeof parsed.version === "number" ? parsed.version : 1,
    source: parsed.source,
    system: parsed.system,
    prompt: parsed.prompt,
  };
}

export async function loadPromptTemplate(
  name: PromptTemplateName
): Promise<PromptTemplate> {
  const cached = templateCache.get(name);
  if (cached) {
    return cached;
  }

  const filePath = resolvePromptPath(TEMPLATE_FILES[name]);
  const raw = await readFile(filePath, "utf-8");
  const parsed = yaml.load(raw);
  const template = ensureTemplate(parsed, name);
  templateCache.set(name, template);
  return template;
}

export function renderPrompt(
  template: PromptTemplate,
  values: Record<string, string>
): string {
  let rendered = `${template.system.trim()}\n\n${template.prompt.trim()}`;
  for (const [key, value] of Object.entries(values)) {
    rendered = rendered.replaceAll(`{{${key}}}`, value);
  }
  return `${rendered}\n`;
}
