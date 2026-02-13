import { spawnSync } from "node:child_process";

export { OpenCodeProviderFactory } from "./opencode-factory";
export { OpenCodeProvider } from "./opencode-provider";
export type { OpenCodeConfig } from "./types";

const FALLBACK_MODELS = [
  // OpenCode models
  "opencode/big-pickle",
  "opencode/glm-4.7-free",
  "opencode/gpt-5-nano",
  "opencode/kimi-k2.5-free",
  "opencode/minimax-m2.1-free",
  "opencode/trinity-large-preview-free",
  // GitHub Copilot models
  "github-copilot/claude-sonnet-4.5",
  "github-copilot/claude-opus-4.6",
  "github-copilot/gemini-2.5-pro",
  "github-copilot/gpt-4o",
  "github-copilot/gpt-5",
  "github-copilot/gpt-5.1-codex",
  "github-copilot/gpt-5.2",
  "github-copilot/grok-code-fast-1",
  // OpenRouter models
  "openrouter/anthropic/claude-3.7-sonnet",
  "openrouter/anthropic/claude-opus-4",
  "openrouter/anthropic/claude-sonnet-4.5",
  "openrouter/deepseek/deepseek-chat-v3.1",
  "openrouter/deepseek/deepseek-r1:free",
  "openrouter/deepseek/deepseek-v3.2",
  "openrouter/google/gemini-2.5-pro",
  "openrouter/google/gemini-3-pro-preview",
  "openrouter/meta-llama/llama-4-scout:free",
  "openrouter/mistralai/codestral-2508",
  "openrouter/moonshotai/kimi-k2.5",
  "openrouter/openai/gpt-4.1",
  "openrouter/openai/gpt-4o-mini",
  "openrouter/openai/gpt-5",
  "openrouter/openai/gpt-5-nano",
  "openrouter/openai/gpt-5.1-codex",
  "openrouter/openai/gpt-5.2",
  "openrouter/openai/o4-mini",
  "openrouter/qwen/qwen3-coder",
  "openrouter/x-ai/grok-4",
  "openrouter/z-ai/glm-4.7",
  // ZAI models
  "zai/glm-4.5",
  "zai/glm-4.5-air",
  "zai/glm-4.5-flash",
  "zai/glm-4.6",
  "zai/glm-4.7",
  "zai/glm-4.7-flash",
  // ZAI Coding Plan models
  "zai-coding-plan/glm-4.7",
] as const;

function parseModelList(output: string): string[] {
  const unique = new Set<string>();
  for (const line of output.split("\n")) {
    const model = line.trim();
    if (!model) {
      continue;
    }

    // Expected model ids: provider/model or just model-name (may include dots, colons and dashes)
    // Pattern matches: "gpt-4o", "gpt-5-mini", "provider/model", "provider/model-name:variant"
    if (/^[a-zA-Z0-9._:-]+(\/[a-zA-Z0-9._:-]+)*$/.test(model)) {
      unique.add(model);
    }
  }
  return [...unique];
}

function getModelCommands(): Array<{ cmd: string; args: string[] }> {
  const rawCommand = process.env.OPENCODE_COMMAND?.trim();
  const configuredCommand =
    rawCommand && rawCommand !== "undefined" && rawCommand !== "null"
      ? rawCommand
      : undefined;

  if (!configuredCommand) {
    return [
      { cmd: "opencode", args: ["models"] },
      { cmd: "bunx", args: ["opencode-ai", "models"] },
      { cmd: "opencode-ai", args: ["models"] },
    ];
  }

  if (configuredCommand === "bunx") {
    return [{ cmd: "bunx", args: ["opencode-ai", "models"] }];
  }

  return [{ cmd: configuredCommand, args: ["models"] }];
}

export function getAvailableModels(): string[] {
  for (const { cmd, args } of getModelCommands()) {
    const result = spawnSync(cmd, args, {
      encoding: "utf8",
      timeout: 8000,
      stdio: ["ignore", "pipe", "ignore"],
    });

    if (result.status !== 0 || !result.stdout) {
      continue;
    }

    const models = parseModelList(result.stdout);
    if (models.length > 0) {
      return models;
    }
  }

  return [...FALLBACK_MODELS];
}
