import type { VaultConfig, VaultHealthStatus, VaultResponse } from "../types";

// TODO: Move to @openfarm/vault-adapter when splitting repos
export class VaultClient {
  private config: VaultConfig;

  constructor(config: VaultConfig) {
    this.config = config;
  }

  async readSecret(path: string): Promise<VaultResponse> {
    const response = await this.makeRequest("GET", `/v1/${path}`);
    return response;
  }

  async writeSecret(
    path: string,
    data: Record<string, any>
  ): Promise<VaultResponse> {
    const response = await this.makeRequest("POST", `/v1/${path}`, {
      data,
    });
    return response;
  }

  async deleteSecret(path: string): Promise<void> {
    await this.makeRequest("DELETE", `/v1/${path}`);
  }

  async listSecrets(path: string): Promise<VaultResponse<{ keys: string[] }>> {
    const response = await this.makeRequest("LIST", `/v1/${path}`);
    return response;
  }

  async getHealth(): Promise<VaultHealthStatus> {
    const response = await this.makeRequest(
      "GET",
      "/v1/sys/health",
      undefined,
      {
        timeout: this.config.healthCheckTimeout,
      }
    );
    return response;
  }

  private async makeRequest(
    method: string,
    path: string,
    body?: Record<string, unknown>,
    options: { timeout?: number } = {}
  ): Promise<Record<string, unknown>> {
    const url = `${this.config.url}${path}`;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    // Add auth token for non-health endpoints
    if (!path.includes("/sys/health")) {
      headers["X-Vault-Token"] = this.config.token;
    }

    const fetchOptions: RequestInit = {
      method: method === "LIST" ? "GET" : method,
      headers,
    };

    if (body) {
      fetchOptions.body = JSON.stringify(body);
    }

    // Handle LIST method
    if (method === "LIST") {
      const listUrl = new URL(url);
      listUrl.searchParams.set("list", "true");
      return this.fetchWithTimeout(
        listUrl.toString(),
        fetchOptions,
        options.timeout
      );
    }

    return this.fetchWithTimeout(url, fetchOptions, options.timeout);
  }

  private async fetchWithTimeout(
    url: string,
    options: RequestInit,
    timeout?: number
  ): Promise<any> {
    const controller = new AbortController();
    const timeoutId = timeout
      ? setTimeout(() => controller.abort(), timeout)
      : null;

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      if (!response.ok) {
        const errorText = await response.text();
        const error = new Error(
          `Vault request failed: ${response.status} ${response.statusText}`
        );
        (error as any).response = response;
        (error as any).body = errorText;
        throw error;
      }

      // Handle empty responses (like DELETE)
      const contentType = response.headers.get("content-type");
      if (!(contentType && contentType.includes("application/json"))) {
        return {};
      }

      return await response.json();
    } catch (error) {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      if (error instanceof Error && error.name === "AbortError") {
        throw new Error(`Vault request timed out after ${timeout}ms`);
      }

      throw error;
    }
  }

  // Utility methods
  async ping(): Promise<boolean> {
    try {
      await this.getHealth();
      return true;
    } catch {
      return false;
    }
  }

  async getVersion(): Promise<string | null> {
    try {
      const health = await this.getHealth();
      return health.version;
    } catch {
      return null;
    }
  }

  getConfig(): VaultConfig {
    return { ...this.config };
  }
}
