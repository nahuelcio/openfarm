// @openfarm/utils - Utilities from @openfarm/core
// Version: 1.0.0
// License: MIT

import { ok, type Result } from "@openfarm/result";

// chunk from core/utils/array
export function chunk<T>(array: T[], size: number): T[][] {
  if (array.length === 0) {
    return [];
  }
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * Checks if a string matches a glob pattern
 * Supports simple patterns like "*.ts", "src/**", and recursive patterns
 */
export const matchesPattern = (str: string, pattern: string): boolean => {
  // Convert glob pattern to regex
  const regexPattern = pattern
    .replace(/\./g, "\\.") // Escape dots
    .replace(/\*\*/g, "__DOUBLE_STAR__") // Temporarily replace **
    .replace(/\*/g, "[^/]*") // Single * matches anything except /
    .replace(/__DOUBLE_STAR__/g, ".*"); // ** matches anything including /

  const regex = new RegExp(`^${regexPattern}$`);
  return regex.test(str);
};

// Retry configuration
export interface RetryConfig {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
}

// retry from core/composition
export async function retry<T>(
  fn: () => Promise<T>,
  config: RetryConfig = {}
): Promise<T> {
  const { maxAttempts = 3, baseDelayMs = 1000, maxDelayMs = 30_000 } = config;
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < maxAttempts) {
        const delayMs = Math.min(baseDelayMs * 2 ** (attempt - 1), maxDelayMs);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }
  throw lastError;
}

// withTimeout from core/composition
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  message = "Operation timed out"
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), timeoutMs);
    promise
      .then((result) => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

// sequence from core/utils/async
export async function sequence<T, E = Error>(
  results: Promise<Result<T, E>>[]
): Promise<Result<T[], E>> {
  const values: T[] = [];

  for (const resultPromise of results) {
    const result = await resultPromise;
    if (!result.ok) {
      return result as Result<T[], E>;
    }
    values.push(result.value);
  }

  return ok(values);
}

// parallel from core/utils/async
export async function parallel<T, E = Error>(
  results: Promise<Result<T, E>>[]
): Promise<Result<T[], E>> {
  const settled = await Promise.all(results);

  const values: T[] = [];
  for (const result of settled) {
    if (!result.ok) {
      return result as Result<T[], E>;
    }
    values.push(result.value);
  }

  return ok(values);
}

// mapAsync from core/utils/async
export function mapAsync<T, U, E = Error>(
  array: T[],
  fn: (item: T) => Promise<Result<U, E>>
): Promise<Result<U[], E>> {
  return sequence(array.map(fn));
}

// filterAsync from core/utils/async
export async function filterAsync<T>(
  array: T[],
  predicate: (item: T) => Promise<boolean>
): Promise<T[]> {
  const results = await Promise.all(array.map(predicate));
  return array.filter((_, index) => results[index]);
}

// Fetch utilities from core/utils/fetch
export type FetchFunction = (
  url: string | URL | Request,
  init?: RequestInit
) => Promise<Response>;

export const defaultFetch: FetchFunction =
  typeof fetch !== "undefined"
    ? fetch.bind(globalThis)
    : async () => {
        throw new Error(
          "fetch is not available. Please use a runtime with native fetch support."
        );
      };
// Re-export utilities
export { CircuitBreaker } from "./circuit-breaker";
export { metrics } from "./metrics";
export { validateInstruction } from "./validation";
