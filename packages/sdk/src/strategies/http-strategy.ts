/**
 * HTTP Communication Strategy for REST API providers.
 *
 * Provides HTTP communication with connection reuse, authentication,
 * error handling, and retry logic for REST API-based providers.
 */

import type {
  CommunicationRequest,
  CommunicationResponse,
  CommunicationStrategy,
} from "../provider-system/types";
import type { HttpRequestOptions } from "./types";

/**
 * HTTP authentication configuration.
 */
export interface HttpAuthConfig {
  /** Authentication type */
  type: "bearer" | "basic" | "api-key" | "custom";

  /** Bearer token (for bearer auth) */
  token?: string;

  /** Username (for basic auth) */
  username?: string;

  /** Password (for basic auth) */
  password?: string;

  /** API key value (for api-key auth) */
  apiKey?: string;

  /** API key header name (for api-key auth) */
  apiKeyHeader?: string;

  /** Custom headers (for custom auth) */
  customHeaders?: Record<string, string>;
}

/**
 * HTTP request configuration.
 */
export interface HttpConfig extends HttpRequestOptions {
  /** Authentication configuration */
  auth?: HttpAuthConfig;

  /** Connection pooling options */
  pooling?: {
    /** Maximum number of connections per host */
    maxConnections?: number;

    /** Keep-alive timeout in milliseconds */
    keepAliveTimeout?: number;

    /** Enable connection reuse */
    reuse?: boolean;
  };

  /** Retry configuration */
  retryConfig?: {
    /** Maximum number of retry attempts */
    maxRetries?: number;

    /** Base delay between retries in milliseconds */
    baseDelay?: number;

    /** Maximum delay between retries in milliseconds */
    maxDelay?: number;

    /** Exponential backoff multiplier */
    backoffMultiplier?: number;

    /** HTTP status codes that should trigger retries */
    retryableStatusCodes?: number[];
  };

  /** Enable request/response logging */
  enableLogging?: boolean;
}

/**
 * HTTP Communication Strategy implementation.
 *
 * Handles HTTP requests with connection reuse, authentication,
 * error handling, timeout support, and retry logic.
 */
export class HttpCommunicationStrategy implements CommunicationStrategy {
  readonly type = "http";

  private readonly config: HttpConfig & {
    defaultHeaders: Record<string, string>;
    timeout: number;
    retries: number;
    followRedirects: boolean;
    ssl: Record<string, unknown>;
    pooling: {
      maxConnections: number;
      keepAliveTimeout: number;
      reuse: boolean;
    };
    retryConfig: {
      maxRetries: number;
      baseDelay: number;
      maxDelay: number;
      backoffMultiplier: number;
      retryableStatusCodes: number[];
    };
  };
  private readonly agent?: any; // HTTP agent for connection pooling

  constructor(config: HttpConfig) {
    // Merge with defaults
    this.config = {
      baseUrl: config.baseUrl,
      defaultHeaders: config.defaultHeaders || {},
      timeout: config.timeout || 30_000,
      retries: config.retries || 3,
      followRedirects: config.followRedirects ?? true,
      ssl: config.ssl || {},
      auth: config.auth,
      pooling: {
        maxConnections: 10,
        keepAliveTimeout: 30_000,
        reuse: true,
        ...config.pooling,
      },
      retryConfig: {
        maxRetries: 3,
        baseDelay: 1000,
        maxDelay: 10_000,
        backoffMultiplier: 2,
        retryableStatusCodes: [408, 429, 500, 502, 503, 504],
        ...config.retryConfig,
      },
      enableLogging: config.enableLogging ?? false,
    };

    // Set up connection pooling if supported
    this.setupConnectionPooling();
  }

  /**
   * Execute an HTTP request with retry logic and error handling.
   */
  async execute(request: CommunicationRequest): Promise<CommunicationResponse> {
    const startTime = Date.now();

    try {
      this.logRequest(request);

      const response = await this.executeWithRetry(request);

      this.logResponse(response, Date.now() - startTime);

      return response;
    } catch (error) {
      const errorResponse = this.handleError(error, Date.now() - startTime);
      this.logResponse(errorResponse, Date.now() - startTime);
      return errorResponse;
    }
  }

  /**
   * Test HTTP connection by making a simple request.
   */
  async testConnection(): Promise<boolean> {
    try {
      // Try a simple GET request to the base URL or health endpoint
      const testRequest: CommunicationRequest = {
        endpoint: "/health",
        method: "GET",
        timeout: 5000, // Short timeout for connection test
      };

      const response = await this.executeWithRetry(testRequest);
      return response.success || response.status < 500; // Accept 4xx as "connected"
    } catch (error) {
      this.log(`Connection test failed: ${error}`);
      return false;
    }
  }

  /**
   * Execute request with retry logic.
   */
  private async executeWithRetry(
    request: CommunicationRequest
  ): Promise<CommunicationResponse> {
    let lastError: Error | null = null;
    const maxRetries =
      typeof request.options?.maxRetries === "number"
        ? request.options.maxRetries
        : this.config.retryConfig.maxRetries;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          const delay = this.calculateRetryDelay(attempt);
          this.log(
            `Retrying request (attempt ${attempt + 1}/${maxRetries + 1}) after ${delay}ms`
          );
          await this.sleep(delay);
        }

        return await this.executeRequest(request);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Don't retry on certain errors
        if (!this.shouldRetry(error, attempt, maxRetries)) {
          break;
        }
      }
    }

    throw lastError || new Error("Request failed after all retry attempts");
  }

  /**
   * Execute a single HTTP request.
   */
  private async executeRequest(
    request: CommunicationRequest
  ): Promise<CommunicationResponse> {
    const url = this.buildUrl(request.endpoint || "");
    const headers = this.buildHeaders(request.headers);
    const timeout = request.timeout || this.config.timeout;

    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const fetchOptions: RequestInit = {
        method: request.method || "POST",
        headers,
        signal: controller.signal,
        ...(this.agent && { agent: this.agent }),
      };

      // Add body for non-GET requests
      if (request.body && request.method !== "GET") {
        if (typeof request.body === "string") {
          fetchOptions.body = request.body;
        } else {
          fetchOptions.body = JSON.stringify(request.body);
          headers["Content-Type"] =
            headers["Content-Type"] || "application/json";
        }
      }

      const response = await fetch(url, fetchOptions);

      const responseBody = await response.text();
      const responseHeaders = Object.fromEntries(response.headers.entries());

      return {
        status: response.status,
        headers: responseHeaders,
        body: responseBody,
        success: response.ok,
        duration: Date.now() - Date.now(), // Will be set by caller
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Build the full URL for the request.
   */
  private buildUrl(endpoint: string): string {
    const baseUrl = this.config.baseUrl.replace(/\/$/, "");
    const cleanEndpoint = endpoint.replace(/^\//, "");

    if (cleanEndpoint === "") {
      return baseUrl;
    }

    return `${baseUrl}/${cleanEndpoint}`;
  }

  /**
   * Build headers including authentication and defaults.
   */
  private buildHeaders(
    requestHeaders: Record<string, string> = {}
  ): Record<string, string> {
    const headers: Record<string, string> = {
      ...this.config.defaultHeaders,
      ...requestHeaders,
    };

    // Add authentication headers
    if (this.config.auth) {
      const authHeaders = this.buildAuthHeaders(this.config.auth);
      Object.assign(headers, authHeaders);
    }

    return headers;
  }

  /**
   * Build authentication headers based on auth config.
   */
  private buildAuthHeaders(auth: HttpAuthConfig): Record<string, string> {
    const headers: Record<string, string> = {};

    switch (auth.type) {
      case "bearer":
        if (auth.token) {
          headers.Authorization = `Bearer ${auth.token}`;
        }
        break;

      case "basic":
        if (auth.username && auth.password) {
          const credentials = btoa(`${auth.username}:${auth.password}`);
          headers.Authorization = `Basic ${credentials}`;
        }
        break;

      case "api-key":
        if (auth.apiKey && auth.apiKeyHeader) {
          headers[auth.apiKeyHeader] = auth.apiKey;
        }
        break;

      case "custom":
        if (auth.customHeaders) {
          Object.assign(headers, auth.customHeaders);
        }
        break;
    }

    return headers;
  }

  /**
   * Calculate retry delay with exponential backoff.
   */
  private calculateRetryDelay(attempt: number): number {
    const { baseDelay, maxDelay, backoffMultiplier } = this.config.retryConfig;
    const delay = baseDelay * backoffMultiplier ** (attempt - 1);
    return Math.min(delay, maxDelay);
  }

  /**
   * Determine if a request should be retried.
   */
  private shouldRetry(
    error: unknown,
    attempt: number,
    maxRetries: number
  ): boolean {
    if (attempt >= maxRetries) {
      return false;
    }

    // Don't retry on abort (timeout)
    if (error instanceof Error && error.name === "AbortError") {
      return false;
    }

    // Don't retry on network errors that indicate permanent failure
    if (error instanceof TypeError && error.message.includes("fetch")) {
      return false;
    }

    // For HTTP errors, check if status code is retryable
    if (error instanceof Error && "status" in error) {
      const status = (error as any).status;
      return this.config.retryConfig.retryableStatusCodes.includes(status);
    }

    // Retry on other errors (network issues, etc.)
    return true;
  }

  /**
   * Handle errors and convert to CommunicationResponse.
   */
  private handleError(error: unknown, duration: number): CommunicationResponse {
    let status = 0;
    let message = "Unknown error";
    let errorDetails = "";

    if (error instanceof Error) {
      message = error.message;

      if (error.name === "AbortError") {
        status = 408; // Request Timeout
        message = "Request timed out";
      } else if (error.message.includes("fetch")) {
        status = 0; // Network error
        message = "Network error - unable to connect";
      }

      errorDetails = error.stack || "";
    } else {
      message = String(error);
    }

    return {
      status,
      body: "",
      error: message,
      success: false,
      duration,
      metadata: {
        errorDetails,
        errorType: error instanceof Error ? error.constructor.name : "Unknown",
      },
    };
  }

  /**
   * Set up connection pooling if supported by the environment.
   */
  private setupConnectionPooling(): void {
    // In Node.js environment, we could use http.Agent for connection pooling
    // For now, we'll rely on the fetch implementation's built-in pooling
    if (
      typeof globalThis !== "undefined" &&
      !("window" in globalThis) &&
      this.config.pooling.reuse
    ) {
      try {
        // This would be implemented with http.Agent in a real Node.js environment
        // For now, we'll use the default fetch behavior
        this.log("Connection pooling enabled (using default fetch pooling)");
      } catch (error) {
        this.log(`Failed to set up connection pooling: ${error}`);
      }
    }
  }

  /**
   * Sleep for the specified number of milliseconds.
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Log request details if logging is enabled.
   */
  private logRequest(request: CommunicationRequest): void {
    if (!this.config.enableLogging) {
      return;
    }

    this.log(
      `→ ${request.method || "POST"} ${this.buildUrl(request.endpoint || "")}`
    );

    if (request.headers && Object.keys(request.headers).length > 0) {
      this.log(`  Headers: ${JSON.stringify(request.headers)}`);
    }

    if (request.body) {
      const bodyStr =
        typeof request.body === "string"
          ? request.body
          : JSON.stringify(request.body);
      const truncated =
        bodyStr.length > 200 ? `${bodyStr.substring(0, 200)}...` : bodyStr;
      this.log(`  Body: ${truncated}`);
    }
  }

  /**
   * Log response details if logging is enabled.
   */
  private logResponse(response: CommunicationResponse, duration: number): void {
    if (!this.config.enableLogging) {
      return;
    }

    const status = response.success ? "✓" : "✗";
    this.log(`← ${status} ${response.status} (${duration}ms)`);

    if (response.error) {
      this.log(`  Error: ${response.error}`);
    }

    if (response.body) {
      const truncated =
        response.body.length > 200
          ? `${response.body.substring(0, 200)}...`
          : response.body;
      this.log(`  Body: ${truncated}`);
    }
  }

  /**
   * Log messages with strategy prefix.
   */
  private log(message: string): void {
    console.log(`[HttpStrategy] ${message}`);
  }
}
