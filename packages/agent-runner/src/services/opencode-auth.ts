/**
 * OpenCode Authentication Adapter
 * Provides flexible authentication flow that adapts to OpenCode's device authentication mechanism
 */

export interface AuthStatus {
  isAuthenticated: boolean;
  needsAuth: boolean;
  deviceCode?: string;
  userCode?: string;
  verificationUri?: string;
  error?: string;
  expiresIn?: number;
  interval?: number;
}

export interface OAuthCallbackResult {
  providerId: string;
  success: boolean;
  connected: boolean;
  timestamp: number;
}

export type OAuthCompletionCallback = (
  result: OAuthCallbackResult
) => Promise<void>;

export interface DeviceCode {
  code: string;
  verificationUri: string;
  expiresIn?: number;
  interval?: number;
}

export interface OpenCodeAuthAdapterConfig {
  port: number;
  host: string;
  healthCheckInterval?: number;
}

/**
 * Flexible authentication adapter for OpenCode
 * Handles multiple authentication methods:
 * 1. Checking /global/health for server status
 * 2. Checking /provider/auth for authentication methods
 * 3. Checking /provider for connected providers
 * 4. Polling for auth status changes
 * @see https://opencode.ai/docs/server/
 */
export class OpenCodeAuthAdapter {
  private readonly config: Required<OpenCodeAuthAdapterConfig>;
  private lastKnownStatus: AuthStatus | null = null;
  private readonly callbackInFlight = new Map<string, Promise<void>>();
  private onOAuthCompletion: OAuthCompletionCallback | undefined;

  constructor(config: OpenCodeAuthAdapterConfig) {
    this.config = {
      port: config.port,
      host: config.host,
      healthCheckInterval: config.healthCheckInterval || 30_000,
    };
  }

  private getBaseUrl(): string {
    return `http://${this.config.host}:${this.config.port}`;
  }

  private getHealthEndpoint(): string {
    return `${this.getBaseUrl()}/global/health`;
  }

  private getProviderEndpoint(): string {
    return `${this.getBaseUrl()}/provider`;
  }

  private getOauthCallbackEndpoint(providerId: string): string {
    return `${this.getBaseUrl()}/provider/${providerId}/oauth/callback`;
  }

  private async parseJsonSafe(
    response: Response
  ): Promise<Record<string, unknown> | null> {
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      return null;
    }
    try {
      return (await response.json()) as Record<string, unknown>;
    } catch (error) {
      console.warn(
        `[OpenCodeAuth] Failed to parse JSON: ${error instanceof Error ? error.message : String(error)}`
      );
      return null;
    }
  }

  /**
   * Check if OpenCode server is ready to accept requests
   * Uses /global/health endpoint per OpenCode API spec
   */
  async isReady(): Promise<boolean> {
    try {
      const response = await fetch(this.getHealthEndpoint(), {
        method: "GET",
        signal: AbortSignal.timeout(5000),
      });
      if (!response.ok) {
        return false;
      }
      const data = (await response.json()) as { healthy?: boolean };
      return data.healthy === true;
    } catch (error) {
      console.warn(
        `[OpenCodeAuth] Server not ready: ${error instanceof Error ? error.message : String(error)}`
      );
      return false;
    }
  }

  /**
   * Set callback to be invoked when OAuth completes successfully
   */
  setOAuthCompletionCallback(callback: OAuthCompletionCallback): void {
    this.onOAuthCompletion = callback;
  }

  /**
   * Verify if a provider is connected via OpenCode /provider endpoint
   */
  async verifyProviderConnected(providerId: string): Promise<boolean> {
    try {
      const response = await fetch(this.getProviderEndpoint(), {
        method: "GET",
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        return false;
      }

      const data = (await response.json()) as { connected?: string[] };
      const connected = data.connected || [];

      // Check both the exact ID and common aliases
      const aliases: Record<string, string[]> = {
        "github-copilot": ["github-copilot", "copilot"],
        copilot: ["github-copilot", "copilot"],
      };

      const idsToCheck = aliases[providerId] || [providerId];
      return idsToCheck.some((id) => connected.includes(id));
    } catch (error) {
      console.warn(
        `[OpenCodeAuth] Failed to verify provider connection: ${error instanceof Error ? error.message : String(error)}`
      );
      return false;
    }
  }

  /**
   * Get current authentication status
   * Uses /provider endpoint to check connected providers
   * @see https://opencode.ai/docs/server/
   */
  async getAuthStatus(): Promise<AuthStatus> {
    // First, check /provider endpoint for connected providers
    try {
      const response = await fetch(this.getProviderEndpoint(), {
        method: "GET",
        signal: AbortSignal.timeout(5000),
      });

      if (response.ok) {
        const data = await this.parseJsonSafe(response);

        if (!data) {
          const status: AuthStatus = {
            isAuthenticated: true,
            needsAuth: false,
          };
          this.lastKnownStatus = status;
          return status;
        }

        // OpenCode /provider response format: { all: Provider[], default: {...}, connected: string[] }
        // If we have connected providers, we're authenticated
        const connected = (data as Record<string, unknown>).connected;
        if (Array.isArray(connected) && connected.length > 0) {
          const status: AuthStatus = {
            isAuthenticated: true,
            needsAuth: false,
          };
          this.lastKnownStatus = status;
          return status;
        }

        // Check if response contains explicit authentication info
        if (data && typeof data === "object" && "isAuthenticated" in data) {
          const authFlag = (data as Record<string, unknown>).isAuthenticated;
          if (typeof authFlag === "boolean") {
            const status: AuthStatus = {
              isAuthenticated: authFlag,
              needsAuth: !authFlag,
            };

            const deviceCode = (data as Record<string, unknown>).deviceCode;
            const userCode = (data as Record<string, unknown>).userCode;
            if (typeof deviceCode === "string") {
              status.deviceCode = deviceCode;
            }
            if (typeof userCode === "string") {
              status.userCode = userCode;
            }
            const verificationUri = (data as Record<string, unknown>)
              .verificationUri;
            if (typeof verificationUri === "string") {
              status.verificationUri = verificationUri;
            } else if (status.userCode) {
              status.verificationUri = "https://github.com/login/device";
            }
            const expiresIn = (data as Record<string, unknown>).expiresIn;
            if (typeof expiresIn === "number") {
              status.expiresIn = expiresIn;
            }
            const interval = (data as Record<string, unknown>).interval;
            if (typeof interval === "number") {
              status.interval = interval;
            }

            this.lastKnownStatus = status;
            return status;
          }
        }

        // If we have 'all' providers array but no connected, need auth
        const allProviders = (data as Record<string, unknown>).all;
        if (Array.isArray(allProviders) && allProviders.length > 0) {
          const status: AuthStatus = {
            isAuthenticated: false,
            needsAuth: true,
            error: "No providers connected. Configure providers in OpenCode.",
          };
          this.lastKnownStatus = status;
          return status;
        }
      }

      if (response.status === 401) {
        const status: AuthStatus = {
          isAuthenticated: false,
          needsAuth: true,
          error: "OpenCode requires authentication",
        };
        this.lastKnownStatus = status;
        return status;
      }

      // For other errors, return cached status if available
      if (this.lastKnownStatus) {
        return this.lastKnownStatus;
      }

      return {
        isAuthenticated: false,
        needsAuth: true,
        error: `Failed to determine auth status: ${response.status}`,
      };
    } catch (error) {
      console.error(
        `[OpenCodeAuth] Error checking auth status: ${error instanceof Error ? error.message : String(error)}`
      );

      // Return cached status if available
      if (this.lastKnownStatus) {
        return this.lastKnownStatus;
      }

      return {
        isAuthenticated: false,
        needsAuth: true,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Initiate OAuth authentication for a specific provider
   * Uses POST /provider/{id}/oauth/authorize endpoint
   * @param providerId - The provider ID (e.g., 'github-copilot', 'openai', 'anthropic')
   * @param methodIndex - The OAuth method index (default: 0 for first OAuth method)
   */
  async initiateAuth(
    providerId = "github-copilot",
    methodIndex = 0
  ): Promise<DeviceCode | null> {
    try {
      const authorizeUrl = `${this.getBaseUrl()}/provider/${providerId}/oauth/authorize`;
      const response = await fetch(authorizeUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method: methodIndex }),
        signal: AbortSignal.timeout(10_000),
      });

      if (!response.ok) {
        const errorData = await this.parseJsonSafe(response);
        console.error(
          `[OpenCodeAuth] OAuth authorize failed: ${response.status}`,
          errorData
        );
        return null;
      }

      const data = await response.json();
      // Response format: { url: string, method: string, instructions: string }
      // instructions contains "Enter code: XXXX-XXXX"
      const payload =
        data && typeof data === "object"
          ? (data as Record<string, unknown>)
          : null;

      if (!payload) {
        return null;
      }

      // Extract user code from instructions (format: "Enter code: XXXX-XXXX")
      const instructions = payload.instructions;
      let userCode: string | undefined;
      if (typeof instructions === "string") {
        const match = instructions.match(/Enter code:\s*([A-Z0-9-]+)/i);
        if (match) {
          userCode = match[1];
        }
      }

      const verificationUri = payload.url;
      if (!userCode || typeof verificationUri !== "string") {
        console.warn(
          "[OpenCodeAuth] Could not parse device code from response:",
          payload
        );
        return null;
      }

      return {
        code: userCode,
        verificationUri,
        expiresIn: 900, // Default 15 minutes for device codes
        interval: 5, // Poll every 5 seconds
      };
    } catch (error) {
      console.error(
        `[OpenCodeAuth] Error initiating auth: ${error instanceof Error ? error.message : String(error)}`
      );
      return null;
    }
  }

  /**
   * Get device code for a provider
   * @param providerId - The provider ID (e.g., 'github-copilot', 'openai')
   */
  async getDeviceCode(
    providerId = "github-copilot"
  ): Promise<DeviceCode | null> {
    return this.initiateAuth(providerId, 0);
  }

  /** Start OAuth callback polling for a provider in the background. */
  startOauthCallback(providerId = "github-copilot", methodIndex = 0): void {
    const key = `${providerId}:${methodIndex}`;
    if (this.callbackInFlight.has(key)) {
      return;
    }

    const task = this.executeOauthCallback(providerId, methodIndex).finally(
      () => {
        this.callbackInFlight.delete(key);
      }
    );

    this.callbackInFlight.set(key, task);
  }

  private async executeOauthCallback(
    providerId: string,
    methodIndex: number
  ): Promise<void> {
    const controller = new AbortController();
    const timeoutMs = 20 * 60 * 1000;
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(this.getOauthCallbackEndpoint(providerId), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method: methodIndex }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorData = await this.parseJsonSafe(response);
        console.error(
          `[OpenCodeAuth] OAuth callback failed: ${response.status}`,
          errorData
        );
        return;
      }

      // OpenCode returns true on success, but since we passed response.ok check
      // we know the request succeeded - verify by checking provider connection
      if (response.ok) {
        console.log(
          `[OpenCodeAuth] OAuth callback succeeded for ${providerId}`
        );

        // Verify connection and notify callback
        if (this.onOAuthCompletion) {
          const connected = await this.verifyProviderConnected(providerId);
          await this.onOAuthCompletion({
            providerId,
            success: true,
            connected,
            timestamp: Date.now(),
          });
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes("AbortError")) {
        console.warn(
          `[OpenCodeAuth] OAuth callback timed out for ${providerId}`
        );
        return;
      }

      console.error(`[OpenCodeAuth] OAuth callback error: ${message}`);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Start polling for authentication status changes
   * Polls every configured interval and calls callback when status changes
   */
  async pollAuthStatus(
    callback: (status: AuthStatus) => void,
    stopCondition?: () => boolean
  ): Promise<void> {
    let pollInterval: NodeJS.Timeout | null = null;

    return new Promise((resolve) => {
      const checkStatus = async () => {
        const status = await this.getAuthStatus();

        // Call callback with new status
        callback(status);

        // Check stop condition
        if (stopCondition?.()) {
          if (pollInterval) {
            clearInterval(pollInterval);
          }
          resolve();
          return;
        }
      };

      // Initial check
      checkStatus().catch((error) => {
        console.error("[OpenCode Auth] Status check failed:", error);
      });

      // Start polling
      pollInterval = setInterval(() => {
        checkStatus().catch((error) => {
          console.error("[OpenCode Auth] Status check failed:", error);
        });
      }, this.config.healthCheckInterval);
    });
  }

  /**
   * Stop polling
   */
  stopPolling(): void {
    // This is handled by the stopCondition callback in pollAuthStatus
  }
}

// Singleton instance
let authAdapterInstance: OpenCodeAuthAdapter | null = null;

/**
 * Get or create the OpenCode auth adapter singleton
 */
export function getOpenCodeAuthAdapter(): OpenCodeAuthAdapter {
  if (!authAdapterInstance) {
    const port = Number.parseInt(process.env.OPENCODE_PORT || "4096", 10);
    const host = process.env.OPENCODE_HOST || "127.0.0.1";

    authAdapterInstance = new OpenCodeAuthAdapter({ port, host });
  }

  return authAdapterInstance;
}

/**
 * Reset the auth adapter singleton (for testing or reconfiguration)
 */
export function resetOpenCodeAuthAdapter(): void {
  authAdapterInstance = null;
}
