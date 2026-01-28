/**
 * Step Execution Utilities
 *
 * Provides timeout and retry wrappers for workflow step execution
 * using Railway pattern (Result types).
 *
 * @module step-execution-utils
 */

import { err, type Result } from "@openfarm/result";

/** Default timeout for step execution (5 minutes) */
export const DEFAULT_STEP_TIMEOUT_MS = 5 * 60 * 1000;

/** Default retry count for failed steps */
export const DEFAULT_RETRY_COUNT = 0;

/** Configuration for step execution */
export interface StepExecutionConfig {
  /** Timeout in milliseconds (default: 5 minutes) */
  timeoutMs?: number;
  /** Number of retry attempts on failure (default: 0) */
  retryCount?: number;
  /** Whether to continue workflow on step failure (default: false) */
  continueOnError?: boolean;
  /** Logger function for step execution messages */
  logger?: (message: string) => Promise<void> | void;
}

/** Error thrown when a step times out */
export class StepTimeoutError extends Error {
  constructor(
    public readonly stepId: string,
    public readonly timeoutMs: number
  ) {
    super(`Step '${stepId}' timed out after ${timeoutMs}ms`);
    this.name = "StepTimeoutError";
  }
}

/** Error thrown after all retries are exhausted */
export class StepRetryExhaustedError extends Error {
  constructor(
    public readonly stepId: string,
    public readonly attempts: number,
    public readonly lastError: Error
  ) {
    super(
      `Step '${stepId}' failed after ${attempts} attempt(s): ${lastError.message}`
    );
    this.name = "StepRetryExhaustedError";
  }
}

/**
 * Wraps an async function with a timeout
 *
 * @param fn - The async function to wrap
 * @param timeoutMs - Timeout in milliseconds
 * @param stepId - Step ID for error messages
 * @returns Result with the function result or timeout error
 *
 * @example
 * ```typescript
 * const result = await withStepTimeout(
 *   () => executeStep(request),
 *   30000,
 *   'step-1'
 * );
 * if (!result.ok) {
 *   console.log('Step timed out:', result.error.message);
 * }
 * ```
 */
export async function withStepTimeout<T>(
  fn: () => Promise<Result<T>>,
  timeoutMs: number,
  stepId: string
): Promise<Result<T>> {
  return new Promise((resolve) => {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    let isResolved = false;

    // Create timeout promise
    timeoutId = setTimeout(() => {
      if (!isResolved) {
        isResolved = true;
        resolve(err(new StepTimeoutError(stepId, timeoutMs)));
      }
    }, timeoutMs);

    // Execute the function
    fn()
      .then((result) => {
        if (!isResolved) {
          isResolved = true;
          if (timeoutId) {
            clearTimeout(timeoutId);
          }
          resolve(result);
        }
      })
      .catch((error) => {
        if (!isResolved) {
          isResolved = true;
          if (timeoutId) {
            clearTimeout(timeoutId);
          }
          resolve(
            err(error instanceof Error ? error : new Error(String(error)))
          );
        }
      });
  });
}

/**
 * Wraps an async function with retry logic using exponential backoff
 *
 * @param fn - The async function to retry
 * @param maxRetries - Maximum number of retry attempts
 * @param stepId - Step ID for error messages
 * @param logger - Optional logger for retry messages
 * @returns Result with the function result or error after retries exhausted
 *
 * @example
 * ```typescript
 * const result = await withStepRetry(
 *   () => executeStep(request),
 *   3,
 *   'step-1',
 *   async (msg) => console.log(msg)
 * );
 * ```
 */
export async function withStepRetry<T>(
  fn: () => Promise<Result<T>>,
  maxRetries: number,
  stepId: string,
  logger?: (message: string) => Promise<void> | void
): Promise<Result<T>> {
  let lastError: Error = new Error("No attempts made");
  const totalAttempts = maxRetries + 1; // Initial attempt + retries

  for (let attempt = 1; attempt <= totalAttempts; attempt++) {
    try {
      const result = await fn();

      if (result.ok) {
        if (attempt > 1 && logger) {
          await logger(
            `Step '${stepId}' succeeded on attempt ${attempt}/${totalAttempts}`
          );
        }
        return result;
      }

      // Function returned an error Result
      lastError = result.error;

      if (attempt < totalAttempts && logger) {
        await logger(
          `Step '${stepId}' failed (attempt ${attempt}/${totalAttempts}): ${lastError.message}. Retrying...`
        );
      }
    } catch (error) {
      // Function threw an exception
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < totalAttempts && logger) {
        await logger(
          `Step '${stepId}' threw exception (attempt ${attempt}/${totalAttempts}): ${lastError.message}. Retrying...`
        );
      }
    }

    // Apply exponential backoff before retry (except for last attempt)
    if (attempt < totalAttempts) {
      const backoffMs = Math.min(1000 * 2 ** (attempt - 1), 30_000); // Max 30s
      await delay(backoffMs);
    }
  }

  return err(new StepRetryExhaustedError(stepId, totalAttempts, lastError));
}

/**
 * Combines timeout and retry logic for step execution
 *
 * @param fn - The async function to execute
 * @param stepId - Step ID for error messages
 * @param config - Configuration for timeout and retry
 * @returns Result with the function result or error
 *
 * @example
 * ```typescript
 * const result = await executeWithTimeoutAndRetry(
 *   () => executeStep(request),
 *   'step-1',
 *   {
 *     timeoutMs: 60000,
 *     retryCount: 2,
 *     logger: async (msg) => console.log(msg),
 *   }
 * );
 * ```
 */
export async function executeWithTimeoutAndRetry<T>(
  fn: () => Promise<Result<T>>,
  stepId: string,
  config: StepExecutionConfig = {}
): Promise<Result<T>> {
  const {
    timeoutMs = DEFAULT_STEP_TIMEOUT_MS,
    retryCount = DEFAULT_RETRY_COUNT,
    logger,
  } = config;

  // Wrap function with timeout
  const withTimeout = () => withStepTimeout(fn, timeoutMs, stepId);

  // Apply retry logic
  if (retryCount > 0) {
    return withStepRetry(withTimeout, retryCount, stepId, logger);
  }

  return withTimeout();
}

/**
 * Helper function for delay/sleep
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Checks if an error is a timeout error
 */
export function isTimeoutError(error: Error): error is StepTimeoutError {
  return error.name === "StepTimeoutError";
}

/**
 * Checks if an error is a retry exhausted error
 */
export function isRetryExhaustedError(
  error: Error
): error is StepRetryExhaustedError {
  return error.name === "StepRetryExhaustedError";
}
