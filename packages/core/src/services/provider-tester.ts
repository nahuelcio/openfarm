import type { ProviderTestResult } from "../types/opencode-config";

// Note: Using direct URL strings since packages/core cannot depend on packages/config
// to avoid circular dependencies. Consider centralizing if packages/config becomes independent.
const ANTHROPIC_MESSAGES_URL = "https://api.anthropic.com/v1/messages";
const OPENROUTER_MODELS_URL = "https://openrouter.ai/api/v1/models";

function getOpenCodeBaseUrl(): string {
  const port = process.env.OPENCODE_PORT || "4096";
  const host = process.env.OPENCODE_HOST || "127.0.0.1";
  return `http://${host}:${port}`;
}

async function testCopilot(): Promise<ProviderTestResult> {
  const baseUrl = getOpenCodeBaseUrl();
  const start = Date.now();

  try {
    const healthResponse = await fetch(`${baseUrl}/global/health`, {
      method: "GET",
      signal: AbortSignal.timeout(5000),
    });

    if (!healthResponse.ok) {
      return {
        success: false,
        provider: "copilot",
        message: `OpenCode health check failed: ${healthResponse.status}`,
      };
    }

    const providerResponse = await fetch(`${baseUrl}/provider`, {
      method: "GET",
      signal: AbortSignal.timeout(5000),
    });

    if (!providerResponse.ok) {
      return {
        success: false,
        provider: "copilot",
        message: `OpenCode provider check failed: ${providerResponse.status}`,
      };
    }

    const data = (await providerResponse.json().catch(() => null)) as Record<
      string,
      unknown
    > | null;
    const connected = Array.isArray(data?.connected)
      ? data?.connected
      : undefined;

    if (!connected || connected.length === 0) {
      return {
        success: false,
        provider: "copilot",
        message: "OpenCode has no connected providers",
      };
    }

    return {
      success: true,
      provider: "copilot",
      message: "OpenCode is healthy and provider is connected",
      details: {
        modelsAvailable: connected.length,
        responseTimeMs: Date.now() - start,
      },
    };
  } catch (error) {
    return {
      success: false,
      provider: "copilot",
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

async function testAnthropic(apiKey: string): Promise<ProviderTestResult> {
  const start = Date.now();

  try {
    const response = await fetch(ANTHROPIC_MESSAGES_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-5-haiku-20241022",
        max_tokens: 1,
        messages: [{ role: "user", content: "ping" }],
      }),
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      return {
        success: false,
        provider: "anthropic",
        message: `Anthropic API error: ${response.status}`,
      };
    }

    return {
      success: true,
      provider: "anthropic",
      message: "Anthropic API key verified",
      details: {
        responseTimeMs: Date.now() - start,
      },
    };
  } catch (error) {
    return {
      success: false,
      provider: "anthropic",
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

async function testOpenRouter(apiKey: string): Promise<ProviderTestResult> {
  const start = Date.now();

  try {
    const response = await fetch(OPENROUTER_MODELS_URL, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      return {
        success: false,
        provider: "openrouter",
        message: `OpenRouter API error: ${response.status}`,
      };
    }

    const data = (await response.json().catch(() => null)) as {
      data?: unknown[];
    } | null;
    const modelsAvailable = Array.isArray(data?.data) ? data?.data.length : 0;

    return {
      success: true,
      provider: "openrouter",
      message: "OpenRouter API key verified",
      details: {
        modelsAvailable,
        responseTimeMs: Date.now() - start,
      },
    };
  } catch (error) {
    return {
      success: false,
      provider: "openrouter",
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function testProviderConnection(
  provider: "copilot" | "anthropic" | "openrouter",
  apiKey?: string
): Promise<ProviderTestResult> {
  switch (provider) {
    case "copilot":
      return testCopilot();
    case "anthropic":
      if (!apiKey) {
        return {
          success: false,
          provider: "anthropic",
          message: "apiKey is required for Anthropic",
        };
      }
      return testAnthropic(apiKey);
    case "openrouter":
      if (!apiKey) {
        return {
          success: false,
          provider: "openrouter",
          message: "apiKey is required for OpenRouter",
        };
      }
      return testOpenRouter(apiKey);
    default:
      return {
        success: false,
        provider,
        message: `Unsupported provider: ${provider}`,
      } as ProviderTestResult;
  }
}
