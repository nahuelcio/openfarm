import { spawnSync } from "node:child_process";

export { OpenCodeProviderFactory } from "./opencode-factory";
export { OpenCodeProvider } from "./opencode-provider";
export type { OpenCodeConfig } from "./types";

const FALLBACK_MODELS = [
  "opencode/gpt-5-nano",
  "opencode/grok-code-fast-1",
  "gpt-5-mini",
  "gpt-4o",
  "gpt-4o-mini",
  "zai/glm-4.7",
  "zai/glm-4-flash",
] as const;

function parseModelList(output: string): string[] {
  const unique = new Set<string>();
  for (const line of output.split("\n")) {
    const model = line.trim();
    if (!model) {
      continue;
    }

    // Expected model ids: provider/model (may include dots, colons and dashes)
    if (/^[a-zA-Z0-9._-]+\/[a-zA-Z0-9._:/-]+$/.test(model)) {
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
