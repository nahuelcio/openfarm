import { DEFAULT_HOSTS, DEFAULT_PORTS } from "@openfarm/core";
import type { TenantSecrets, VaultConfig } from "../types";
import { VaultClient } from "./vault-client";

// TODO: Move to @openfarm/vault-adapter when splitting repos
export class VaultManager {
  private readonly client: VaultClient;
  private config: VaultConfig;

  constructor(config?: VaultConfig) {
    this.config = config || {
      url:
        process.env.VAULT_ENDPOINT ||
        `http://${DEFAULT_HOSTS.LOCALHOST_NAME}:${DEFAULT_PORTS.VAULT}`,
      token: process.env.VAULT_TOKEN || "",
      secretBasePath: process.env.VAULT_SECRET_BASE_PATH || "secret/tenants",
      healthCheckTimeout: 5000,
    };

    if (!this.config.token) {
      throw new Error("Vault token is required");
    }

    this.client = new VaultClient(this.config);
  }

  async getTenantSecrets(tenantId: string): Promise<TenantSecrets> {
    const secretPath = `${this.config.secretBasePath}/${tenantId}`;

    try {
      const response = await this.client.readSecret(secretPath);
      const secrets = response.data.data;

      if (!secrets.ANTHROPIC_API_KEY) {
        throw new Error(`ANTHROPIC_API_KEY not found for tenant ${tenantId}`);
      }

      return {
        ANTHROPIC_API_KEY: secrets.ANTHROPIC_API_KEY,
        GITHUB_TOKEN: secrets.GITHUB_TOKEN,
        OPENAI_API_KEY: secrets.OPENAI_API_KEY,
        ...secrets,
      };
    } catch (error) {
      if (
        error instanceof Error &&
        "response" in error &&
        (error as any).response?.status === 404
      ) {
        throw new Error(`No secrets found for tenant ${tenantId}`);
      }
      const message = error instanceof Error ? error.message : "Unknown error";
      throw new Error(
        `Failed to read secrets for tenant ${tenantId}: ${message}`
      );
    }
  }

  async storeTenantSecrets(
    tenantId: string,
    secrets: TenantSecrets
  ): Promise<void> {
    const secretPath = `${this.config.secretBasePath}/${tenantId}`;

    try {
      await this.client.writeSecret(secretPath, secrets);
      console.log(`Stored secrets for tenant ${tenantId}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      throw new Error(
        `Failed to store secrets for tenant ${tenantId}: ${message}`
      );
    }
  }

  async deleteTenantSecrets(tenantId: string): Promise<void> {
    const secretPath = `${this.config.secretBasePath}/${tenantId}`;

    try {
      await this.client.deleteSecret(secretPath);
      console.log(`Deleted secrets for tenant ${tenantId}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      throw new Error(
        `Failed to delete secrets for tenant ${tenantId}: ${message}`
      );
    }
  }

  async listTenantSecrets(): Promise<string[]> {
    try {
      const response = await this.client.listSecrets(
        this.config.secretBasePath
      );
      return (response.data as any).keys || [];
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      throw new Error(`Failed to list tenant secrets: ${message}`);
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      const health = await this.client.getHealth();
      return health.initialized && !health.sealed;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.warn(`Vault connection test failed: ${message}`);
      return false;
    }
  }

  async getVaultStatus(): Promise<{
    healthy: boolean;
    version?: string;
    sealed?: boolean;
    initialized?: boolean;
  }> {
    try {
      const health = await this.client.getHealth();
      return {
        healthy: health.initialized && !health.sealed,
        version: health.version,
        sealed: health.sealed,
        initialized: health.initialized,
      };
    } catch (error) {
      return {
        healthy: false,
      };
    }
  }

  // Utility methods for secret management
  async rotateSecret(
    tenantId: string,
    secretKey: string,
    newValue: string
  ): Promise<void> {
    const secrets = await this.getTenantSecrets(tenantId);
    secrets[secretKey] = newValue;
    await this.storeTenantSecrets(tenantId, secrets);

    console.log(`Rotated secret ${secretKey} for tenant ${tenantId}`);
  }

  async addSecret(
    tenantId: string,
    secretKey: string,
    value: string
  ): Promise<void> {
    const secrets = await this.getTenantSecrets(tenantId);
    secrets[secretKey] = value;
    await this.storeTenantSecrets(tenantId, secrets);

    console.log(`Added secret ${secretKey} for tenant ${tenantId}`);
  }

  async removeSecret(tenantId: string, secretKey: string): Promise<void> {
    const secrets = await this.getTenantSecrets(tenantId);
    delete secrets[secretKey];
    await this.storeTenantSecrets(tenantId, secrets);

    console.log(`Removed secret ${secretKey} for tenant ${tenantId}`);
  }

  async validateTenantSecrets(tenantId: string): Promise<{
    valid: boolean;
    missing: string[];
    present: string[];
  }> {
    try {
      const secrets = await this.getTenantSecrets(tenantId);
      const requiredSecrets = ["ANTHROPIC_API_KEY"];
      const optionalSecrets = ["GITHUB_TOKEN", "OPENAI_API_KEY"];

      const present: string[] = [];
      const missing: string[] = [];

      // Check required secrets
      for (const key of requiredSecrets) {
        if (secrets[key]) {
          present.push(key);
        } else {
          missing.push(key);
        }
      }

      // Check optional secrets
      for (const key of optionalSecrets) {
        if (secrets[key]) {
          present.push(key);
        }
      }

      return {
        valid: missing.length === 0,
        missing,
        present,
      };
    } catch (error) {
      return {
        valid: false,
        missing: ["ANTHROPIC_API_KEY"],
        present: [],
      };
    }
  }
}
