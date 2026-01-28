import {
  DEFAULT_HOSTS,
  DEFAULT_PORTS,
  DEFAULT_TIMEOUTS,
} from "../constants/ports";

interface OpenCodeConfig {
  defaultPort: number;
  defaultHost: string;
  defaultTimeout: number;
  healthCheckTimeout: number;
  maxRetries: number;
  retryDelay: number;
}

interface KubernetesConfig {
  defaultNamespace: string;
  podActiveDeadlineSeconds: number;
  podReadyTimeoutMs: number;
  defaultImage: string;
  defaultResources: {
    cpu: string;
    memory: string;
  };
  secretCleanupMaxAgeHours: number;
}

interface VaultConfig {
  url: string;
  token: string;
  secretBasePath: string;
  healthCheckTimeout: number;
}

interface BillingConfig {
  modelPricing: Record<
    string,
    {
      inputCostPer1k: number;
      outputCostPer1k: number;
    }
  >;
  defaultPricing?: {
    inputCostPer1k: number;
    outputCostPer1k: number;
  };
}

interface LoggingConfig {
  maxLogAgeHours: number;
  maxLogEntries: number;
  logLevel: "debug" | "info" | "warn" | "error";
}

interface AppConfig {
  opencode: OpenCodeConfig;
  kubernetes: KubernetesConfig;
  vault: VaultConfig;
  billing: BillingConfig;
  logging: LoggingConfig;
}

export class ConfigService {
  private config: AppConfig;

  constructor(config?: Partial<AppConfig>) {
    this.config = this.mergeWithDefaults(config || {});
  }

  private mergeWithDefaults(userConfig: Partial<AppConfig>): AppConfig {
    return {
      opencode: {
        defaultPort: DEFAULT_PORTS.OPENCODE,
        defaultHost: DEFAULT_HOSTS.LOCALHOST,
        defaultTimeout: DEFAULT_TIMEOUTS.REQUEST,
        healthCheckTimeout: 5000,
        maxRetries: 3,
        retryDelay: 2000,
        ...userConfig.opencode,
      },
      kubernetes: {
        defaultNamespace: "minions-farm",
        podActiveDeadlineSeconds: 3600,
        podReadyTimeoutMs: 120_000,
        defaultImage: "minions-farm/opencode-executor:latest",
        defaultResources: {
          cpu: "1000m",
          memory: "2Gi",
        },
        secretCleanupMaxAgeHours: 1,
        ...userConfig.kubernetes,
      },
      vault: {
        url:
          process.env.VAULT_URL ||
          `http://${DEFAULT_HOSTS.LOCALHOST_NAME}:${DEFAULT_PORTS.VAULT}`,
        token: process.env.VAULT_TOKEN || "",
        secretBasePath: "secret/data/tenants",
        healthCheckTimeout: 5000,
        ...userConfig.vault,
      },
      billing: {
        modelPricing: {},
        defaultPricing: {
          inputCostPer1k: 0.001,
          outputCostPer1k: 0.002,
        },
        ...userConfig.billing,
      },
      logging: {
        maxLogAgeHours: 24,
        maxLogEntries: 10_000,
        logLevel: (process.env.LOG_LEVEL as any) || "info",
        ...userConfig.logging,
      },
    };
  }

  static fromEnvironment(): ConfigService {
    const config: Partial<AppConfig> = {};

    // OpenCode config from env
    if (process.env.OPENCODE_PORT) {
      config.opencode = {
        defaultPort: Number.parseInt(process.env.OPENCODE_PORT, 10),
        defaultHost:
          config.opencode?.defaultHost || DEFAULT_HOSTS.LOCALHOST_NAME,
        defaultTimeout: config.opencode?.defaultTimeout || 300_000,
        healthCheckTimeout: config.opencode?.healthCheckTimeout || 5000,
        maxRetries: config.opencode?.maxRetries || 3,
        retryDelay: config.opencode?.retryDelay || 1000,
      };
    }

    if (process.env.OPENCODE_TIMEOUT) {
      config.opencode = {
        defaultPort: config.opencode?.defaultPort || 8080,
        defaultHost:
          config.opencode?.defaultHost || DEFAULT_HOSTS.LOCALHOST_NAME,
        defaultTimeout: Number.parseInt(process.env.OPENCODE_TIMEOUT, 10),
        healthCheckTimeout: config.opencode?.healthCheckTimeout || 5000,
        maxRetries: config.opencode?.maxRetries || 3,
        retryDelay: config.opencode?.retryDelay || 1000,
      };
    }

    // Kubernetes config from env
    if (process.env.K8S_NAMESPACE) {
      config.kubernetes = {
        defaultNamespace: process.env.K8S_NAMESPACE,
        podActiveDeadlineSeconds:
          config.kubernetes?.podActiveDeadlineSeconds || 3600,
        podReadyTimeoutMs: config.kubernetes?.podReadyTimeoutMs || 300_000,
        defaultImage: config.kubernetes?.defaultImage || "opencode:latest",
        defaultResources: config.kubernetes?.defaultResources || {
          cpu: "1000m",
          memory: "2Gi",
        },
        secretCleanupMaxAgeHours:
          config.kubernetes?.secretCleanupMaxAgeHours || 24,
      };
    }

    if (process.env.K8S_DEFAULT_IMAGE) {
      config.kubernetes = {
        defaultNamespace: config.kubernetes?.defaultNamespace || "default",
        podActiveDeadlineSeconds:
          config.kubernetes?.podActiveDeadlineSeconds || 3600,
        podReadyTimeoutMs: config.kubernetes?.podReadyTimeoutMs || 300_000,
        defaultImage: process.env.K8S_DEFAULT_IMAGE,
        defaultResources: config.kubernetes?.defaultResources || {
          cpu: "1000m",
          memory: "2Gi",
        },
        secretCleanupMaxAgeHours:
          config.kubernetes?.secretCleanupMaxAgeHours || 24,
      };
    }

    // Vault config from env
    if (process.env.VAULT_URL || process.env.VAULT_TOKEN) {
      config.vault = {
        url:
          process.env.VAULT_URL ||
          `http://${DEFAULT_HOSTS.LOCALHOST_NAME}:${DEFAULT_PORTS.VAULT}`,
        token: process.env.VAULT_TOKEN || "",
        secretBasePath: process.env.VAULT_SECRET_PATH || "secret/data/tenants",
        healthCheckTimeout: 5000,
      };
    }

    return new ConfigService(config);
  }

  getOpenCodeConfig(): OpenCodeConfig {
    return this.config.opencode;
  }

  getKubernetesConfig(): KubernetesConfig {
    return this.config.kubernetes;
  }

  getVaultConfig(): VaultConfig {
    return this.config.vault;
  }

  getBillingConfig(): BillingConfig {
    return this.config.billing;
  }

  getLoggingConfig(): LoggingConfig {
    return this.config.logging;
  }

  updateModelPricing(
    model: string,
    pricing: { inputCostPer1k: number; outputCostPer1k: number }
  ): void {
    this.config.billing.modelPricing[model] = pricing;
  }

  getModelPricing(model: string) {
    return (
      this.config.billing.modelPricing[model] ||
      this.config.billing.defaultPricing
    );
  }

  validate(): string[] {
    const errors: string[] = [];

    if (!this.config.vault.token) {
      errors.push("Vault token is required");
    }

    if (
      this.config.opencode.defaultPort < 1 ||
      this.config.opencode.defaultPort > 65_535
    ) {
      errors.push("OpenCode port must be between 1 and 65535");
    }

    if (this.config.opencode.defaultTimeout < 1000) {
      errors.push("OpenCode timeout must be at least 1000ms");
    }

    return errors;
  }
}
