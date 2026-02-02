export interface CategorizedError {
  type: "api" | "network" | "timeout" | "validation" | "unknown";
  message: string;
  originalError: string;
  retryable: boolean;
  suggestions: string[];
}

export function categorizeError(error: unknown): CategorizedError {
  const errorStr = error instanceof Error ? error.message : String(error);

  // API errors (401, 403, API key)
  if (
    errorStr.includes("API key") ||
    errorStr.includes("401") ||
    errorStr.includes("403") ||
    errorStr.includes("Unauthorized") ||
    errorStr.includes("authentication")
  ) {
    return {
      type: "api",
      message: "API Authentication Error",
      originalError: errorStr,
      retryable: false,
      suggestions: [
        "Check your API key is set correctly",
        "Verify API key has required permissions",
        "Check provider configuration",
      ],
    };
  }

  // Network errors
  if (
    errorStr.includes("ECONNREFUSED") ||
    errorStr.includes("ENOTFOUND") ||
    errorStr.includes("network") ||
    errorStr.includes("fetch failed") ||
    errorStr.includes("ECONNRESET")
  ) {
    return {
      type: "network",
      message: "Network Connection Error",
      originalError: errorStr,
      retryable: true,
      suggestions: [
        "Check your internet connection",
        "Verify provider service is available",
        "Try again in a few moments",
        "Check firewall/proxy settings",
      ],
    };
  }

  // Timeout errors
  if (errorStr.includes("timeout") || errorStr.includes("ETIMEDOUT")) {
    return {
      type: "timeout",
      message: "Request Timeout",
      originalError: errorStr,
      retryable: true,
      suggestions: [
        "The operation took too long",
        "Try a smaller/simpler task",
        "Check network speed",
        "Retry the operation",
      ],
    };
  }

  // Validation errors
  if (
    errorStr.includes("not found") ||
    errorStr.includes("invalid") ||
    errorStr.includes("ENOENT")
  ) {
    return {
      type: "validation",
      message: "Validation Error",
      originalError: errorStr,
      retryable: false,
      suggestions: [
        "Check input parameters",
        "Verify workspace path exists",
        "Ensure selected model is available",
      ],
    };
  }

  // Unknown errors
  return {
    type: "unknown",
    message: "Unexpected Error",
    originalError: errorStr,
    retryable: false,
    suggestions: ["Check logs for details", "Try running again"],
  };
}
