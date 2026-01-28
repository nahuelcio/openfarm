import {
  findAgentConfiguration,
  getAgentConfigurations,
  getDb,
  getSystemConfigsByCategory,
} from "../db";
import type { AgentConfiguration } from "../types";
import type {
  OpenCodeConfig,
  OpenCodeProvider,
  ServerConfig,
  TuiConfig,
} from "../types/opencode-config";
import { OPENCODE_DEFAULTS } from "../types/opencode-config";
import type { AgentAuthorConfig, AgentCodeConfig } from "../types/workflow";

export interface ConfigEntry {
  configKey: string;
  configValue: unknown;
}

export type ConfigMap = Map<string, unknown>;

type SQL = any;

export interface ResolvedServerConfig extends ServerConfig {}
export interface ResolvedTuiConfig extends TuiConfig {}

export interface ResolvedModel {
  provider: OpenCodeProvider;
  model: string;
}

function parseConfigValue(value: unknown): unknown {
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
  return value;
}

export function buildConfigMap(configs: ConfigEntry[]): ConfigMap {
  const configMap: ConfigMap = new Map<string, unknown>();
  for (const config of configs) {
    configMap.set(config.configKey, parseConfigValue(config.configValue));
  }
  return configMap;
}

export function getConfigValue<T>(
  configMap: ConfigMap,
  key: string,
  defaultValue: T
): T {
  if (!configMap.has(key)) {
    return defaultValue;
  }
  return configMap.get(key) as T;
}

export function getProviderApiKeyFromMap(
  configMap: ConfigMap,
  provider: OpenCodeProvider,
  context: "server" | "tui"
): string | null {
  const overrideKey = `${context}.overrides.${provider}.apiKey`;
  const baseKey = `providers.${provider}.apiKey`;
  const overrideValue = configMap.get(overrideKey);
  if (typeof overrideValue === "string" && overrideValue.length > 0) {
    return overrideValue;
  }
  const baseValue = configMap.get(baseKey);
  return typeof baseValue === "string" && baseValue.length > 0
    ? baseValue
    : null;
}

export function resolveEnvProviderApiKey(
  provider: OpenCodeProvider
): string | null {
  switch (provider) {
    case "anthropic":
      return process.env.ANTHROPIC_API_KEY || null;
    case "openrouter":
      return process.env.OPENROUTER_API_KEY || null;
    case "copilot":
      return process.env.COPILOT_TOKEN || null;
    default:
      return null;
  }
}

export function resolveEnvModel(): string | null {
  return process.env.OPENCODE_DEFAULT_MODEL || null;
}

export function resolveStepProvider(
  stepConfig: AgentCodeConfig | AgentAuthorConfig | undefined
): OpenCodeProvider | null {
  if (!stepConfig) {
    return null;
  }
  if ("provider" in stepConfig && stepConfig.provider === "opencode") {
    return "copilot";
  }
  return null;
}

export function resolveStepModel(
  stepConfig: AgentCodeConfig | AgentAuthorConfig | undefined
): string | null {
  if (!stepConfig?.model) {
    return null;
  }
  return stepConfig.model;
}

export class OpenCodeConfigService {
  private readonly db: SQL;

  constructor(db: SQL) {
    this.db = db;
  }

  static async create(): Promise<OpenCodeConfigService> {
    const db = await getDb();
    return new OpenCodeConfigService(db);
  }

  async getServerConfig(): Promise<ResolvedServerConfig> {
    const configMap = await this.loadConfigMap();
    return {
      defaultProvider: getConfigValue(
        configMap,
        "server.defaultProvider",
        OPENCODE_DEFAULTS.server.defaultProvider
      ),
      defaultModel: getConfigValue(
        configMap,
        "server.defaultModel",
        OPENCODE_DEFAULTS.server.defaultModel
      ),
      overrides: this.buildOverrides(configMap, "server"),
    };
  }

  async getTuiConfig(): Promise<ResolvedTuiConfig> {
    const configMap = await this.loadConfigMap();
    return {
      defaultProvider: getConfigValue(
        configMap,
        "tui.defaultProvider",
        OPENCODE_DEFAULTS.tui.defaultProvider
      ),
      defaultModel: getConfigValue(
        configMap,
        "tui.defaultModel",
        OPENCODE_DEFAULTS.tui.defaultModel
      ),
      maxIterations: getConfigValue(
        configMap,
        "tui.maxIterations",
        OPENCODE_DEFAULTS.tui.maxIterations
      ),
      timeoutSeconds: getConfigValue(
        configMap,
        "tui.timeoutSeconds",
        OPENCODE_DEFAULTS.tui.timeoutSeconds
      ),
      overrides: this.buildOverrides(configMap, "tui"),
    };
  }

  async getProviderApiKey(
    provider: OpenCodeProvider,
    context: "server" | "tui"
  ): Promise<string | null> {
    const configMap = await this.loadConfigMap();
    const overrideKey = `${context}.overrides.${provider}.apiKey`;
    const baseKey = `providers.${provider}.apiKey`;
    const overrideValue = configMap.get(overrideKey);
    if (typeof overrideValue === "string" && overrideValue.length > 0) {
      return overrideValue;
    }
    const baseValue = configMap.get(baseKey);
    if (typeof baseValue === "string" && baseValue.length > 0) {
      return baseValue;
    }
    return resolveEnvProviderApiKey(provider);
  }

  async resolveModel(
    context: "server" | "tui",
    stepConfig?: AgentCodeConfig | AgentAuthorConfig,
    agentConfig?: AgentConfiguration
  ): Promise<ResolvedModel> {
    const configMap = await this.loadConfigMap();

    const stepProvider = resolveStepProvider(stepConfig);
    const stepModel = resolveStepModel(stepConfig);

    if (stepProvider && stepModel) {
      return { provider: stepProvider, model: stepModel };
    }

    if (agentConfig?.provider === "opencode" && agentConfig.model) {
      return {
        provider: OPENCODE_DEFAULTS.server.defaultProvider,
        model: agentConfig.model,
      };
    }

    const defaultProvider = getConfigValue(
      configMap,
      `${context}.defaultProvider`,
      context === "server"
        ? OPENCODE_DEFAULTS.server.defaultProvider
        : OPENCODE_DEFAULTS.tui.defaultProvider
    );

    const defaultModel = getConfigValue(
      configMap,
      `${context}.defaultModel`,
      context === "server"
        ? OPENCODE_DEFAULTS.server.defaultModel
        : OPENCODE_DEFAULTS.tui.defaultModel
    );

    const envModel = resolveEnvModel();

    return {
      provider: defaultProvider,
      model: stepModel || envModel || defaultModel,
    };
  }

  async resolveOpenCodeConfig(): Promise<OpenCodeConfig> {
    const configMap = await this.loadConfigMap();

    const providers: OpenCodeProvider[] = [
      "copilot",
      "anthropic",
      "openrouter",
    ];
    const providersConfig = {} as OpenCodeConfig["providers"];

    for (const provider of providers) {
      const prefix = `providers.${provider}`;
      providersConfig[provider] = {
        enabled: getConfigValue(configMap, `${prefix}.enabled`, false),
        apiBase: getConfigValue(configMap, `${prefix}.apiBase`, undefined),
        apiKey: getConfigValue(configMap, `${prefix}.apiKey`, undefined),
        token: getConfigValue(configMap, `${prefix}.token`, undefined),
      };
    }

    return {
      providers: providersConfig,
      server: await this.getServerConfig(),
      tui: await this.getTuiConfig(),
    };
  }

  async resolveAgentConfig(
    project?: string,
    repositoryId?: string,
    repositoryUrl?: string
  ): Promise<AgentConfiguration | null> {
    const configs = await getAgentConfigurations(this.db);
    return findAgentConfiguration(
      configs,
      project,
      repositoryId,
      repositoryUrl
    );
  }

  private async loadConfigMap(): Promise<Map<string, unknown>> {
    const configs = await getSystemConfigsByCategory(this.db, "opencode");
    return buildConfigMap(configs);
  }

  private buildOverrides(
    configMap: Map<string, unknown>,
    context: "server" | "tui"
  ): ServerConfig["overrides"] | TuiConfig["overrides"] {
    const overrides: Record<string, { apiKey?: string }> = {};
    const providers: OpenCodeProvider[] = [
      "copilot",
      "anthropic",
      "openrouter",
    ];

    for (const provider of providers) {
      const apiKey = getProviderApiKeyFromMap(configMap, provider, context);
      if (apiKey) {
        overrides[provider] = { apiKey };
      }
    }

    return Object.keys(overrides).length > 0 ? overrides : undefined;
  }
}
