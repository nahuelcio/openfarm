import type {
  ChangesSummary,
  CodingEngine,
} from "@openfarm/core/types/adapters";
import type { Result } from "@openfarm/result";
import { OpenCodeConfigService } from "../../../../core/src/services/opencode-config";
import { CircuitBreaker } from "../../utils/circuit-breaker";
import { executeOpencodeProcess } from "./opencode-process";

import type { OpencodeOptions, OpencodeProcessConfig } from "./types";

export * from "./opencode-process";
export * from "./types";

const modelFetchCircuitBreaker = new CircuitBreaker({
  maxFailures: 5,
  cooldownMs: 60_000,
  halfOpenAttempts: 3,
});

/**
 * OpencodeCodingEngine implements the CodingEngine interface using Opencode.
 */
export class OpencodeCodingEngine implements CodingEngine {
  constructor(private readonly options: OpencodeOptions = {}) {}

  /**
   * Returns the name of this coding engine.
   */
  getName(): string {
    return "Opencode";
  }

  /**
   * Returns the list of supported models.
   */
  async getSupportedModels(): Promise<string[]> {
    try {
      const models = await fetchOpenCodeModels();
      if (models.length > 0) {
        return models;
      }

      console.warn("[Opencode] No models fetched, using fallback");
      return ["zai/glm-4.7", "zai/glm-4-flash"];
    } catch (error) {
      console.warn("[Opencode] Failed to fetch models:", error);
      return ["zai/glm-4.7", "zai/glm-4-flash"];
    }
  }

  /**
   * Applies code changes using Opencode.
   */
  async applyChanges(
    instruction: string,
    repoPath: string,
    contextFiles: string[] = []
  ): Promise<Result<ChangesSummary>> {
    // Read default model from database configuration
    let defaultModel = "zai/glm-4.7"; // Fallback if DB is unavailable
    try {
      const configService = await OpenCodeConfigService.create();
      const config = await configService.resolveOpenCodeConfig();
      defaultModel = config.server.defaultModel;
    } catch (error) {
      console.warn(
        "[OpenCode] Failed to load config from DB, using fallback:",
        error instanceof Error ? error.message : String(error)
      );
    }

    const requestedModel = this.options.model || defaultModel;
    const resolvedModel = await resolveModelSelection(requestedModel);
    const {
      model = resolvedModel,
      previewMode = false,
      chatOnly = false,
      agent,
      skill,
      opencodeAgent,
      opencodeSkill,
      opencodeTemperature,
      opencodeMaxSteps,
      rules,
      onLog,
      onChanges,
      onChatMessage,
    } = this.options as OpencodeOptions & {
      agent?: string;
      skill?: string;
      opencodeAgent?: string;
      opencodeSkill?: string;
      opencodeTemperature?: number;
      opencodeMaxSteps?: number;
    };

    const targetAgent = agent || opencodeAgent;
    const targetSkill = skill || opencodeSkill;

    const config: OpencodeProcessConfig & {
      agent?: string;
      skill?: string;
      temperature?: number;
      maxSteps?: number;
    } = {
      model,
      previewMode,
      chatOnly,
      agent: targetAgent,
      skill: targetSkill,
      temperature: opencodeTemperature,
      maxSteps: opencodeMaxSteps,
      rules,
      onLog,
      onChanges,
      onChatMessage,
    };

    return executeOpencodeProcess(config, instruction, repoPath, contextFiles);
  }
}

function getOpenCodeBaseUrl(): string {
  const port = process.env.OPENCODE_PORT || "4096";
  const host = process.env.OPENCODE_HOST || "127.0.0.1";
  return `http://${host}:${port}`;
}

function normalizeOpenCodeModelName(model: string, provider?: string): string {
  if (model.includes("/")) {
    return model;
  }
  if (provider) {
    return `${provider}/${model}`;
  }
  return model;
}

interface OpenCodeModel {
  id: string;
}

interface OpenCodeProvider {
  id: string;
  models?: Record<string, OpenCodeModel> | Array<OpenCodeModel | string>;
}

interface OpenCodeProvidersResponse {
  providers?: OpenCodeProvider[];
  all?: OpenCodeProvider[];
}

function parseModelsFromProvidersResponse(data: unknown): string[] {
  if (!data || typeof data !== "object") {
    return [];
  }

  let providers: OpenCodeProvider[] = [];

  if (Array.isArray(data)) {
    providers = data as OpenCodeProvider[];
  } else {
    const typed = data as OpenCodeProvidersResponse;
    providers = typed.providers || typed.all || [];
  }

  const models: string[] = [];

  for (const provider of providers) {
    if (!provider.models) {
      continue;
    }

    if (
      !Array.isArray(provider.models) &&
      typeof provider.models === "object"
    ) {
      for (const model of Object.values(provider.models)) {
        if (model && typeof model === "object" && model.id) {
          const normalizedId = normalizeOpenCodeModelName(
            model.id,
            provider.id
          );
          if (!models.includes(normalizedId)) {
            models.push(normalizedId);
          }
        }
      }
      continue;
    }

    if (Array.isArray(provider.models)) {
      for (const model of provider.models) {
        const modelId = typeof model === "string" ? model : model.id;
        if (!modelId) {
          continue;
        }
        const normalizedId = normalizeOpenCodeModelName(modelId, provider.id);
        if (!models.includes(normalizedId)) {
          models.push(normalizedId);
        }
      }
    }
  }

  return models;
}

export async function fetchOpenCodeModels(): Promise<string[]> {
  const baseUrl = getOpenCodeBaseUrl();
  const endpoints = [`${baseUrl}/config/providers`, `${baseUrl}/provider`];

  for (const url of endpoints) {
    try {
      const response = await modelFetchCircuitBreaker.execute(async () =>
        fetch(url, {
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          signal: AbortSignal.timeout(5000),
        })
      );

      if (!response.ok) {
        continue;
      }

      const data = await response.json();
      const models = parseModelsFromProvidersResponse(data);
      if (models.length > 0) {
        return models;
      }
    } catch (error) {
      console.warn(
        `[OpenCode] Error fetching models from ${url}:`,
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  return [];
}

async function resolveModelSelection(requestedModel: string): Promise<string> {
  const models = await fetchOpenCodeModels();
  if (models.includes(requestedModel)) {
    return requestedModel;
  }

  if (models.length > 0) {
    const fallback = models[0] ?? requestedModel;
    console.warn(
      `[OpenCode] Requested model '${requestedModel}' not found. Falling back to '${fallback}'.`
    );
    return fallback;
  }

  console.warn(
    `[OpenCode] Unable to resolve model list. Using requested model '${requestedModel}'.`
  );
  return requestedModel;
}
