/**
 * Error Serialization and Type System
 *
 * Framework-agnostic error handling with serialization for durability.
 * Supports categorization and retry logic.
 */

/**
 * Serializable error representation (safe for storage/transmission)
 */
export interface SerializableError {
  message: string;
  name: string;
  stack?: string;
  code?: string;
  cause?: SerializableError;
  [key: string]: unknown;
}

/**
 * Error categorization for handling strategies
 */
export enum WorkflowErrorType {
  /** Validation errors - should not retry */
  VALIDATION = "VALIDATION",
  /** Execution errors - may retry */
  EXECUTION = "EXECUTION",
  /** Configuration errors - should not retry */
  CONFIGURATION = "CONFIGURATION",
  /** External service errors - may retry */
  EXTERNAL_SERVICE = "EXTERNAL_SERVICE",
  /** Unknown errors */
  UNKNOWN = "UNKNOWN",
}

/**
 * Typed workflow error with context
 */
export class WorkflowError extends Error {
  public readonly type: WorkflowErrorType;
  public readonly retryable: boolean;
  public readonly stepId?: string;
  public readonly metadata?: Record<string, unknown>;

  constructor(
    message: string,
    options?: {
      type?: WorkflowErrorType;
      retryable?: boolean;
      stepId?: string;
      cause?: Error;
      metadata?: Record<string, unknown>;
    }
  ) {
    super(message, { cause: options?.cause });
    this.name = "WorkflowError";
    this.type = options?.type ?? WorkflowErrorType.UNKNOWN;
    this.retryable = options?.retryable ?? false;
    this.stepId = options?.stepId;
    this.metadata = options?.metadata;
  }
}

/**
 * Convert any error to serializable format (safe for Inngest/DB)
 */
export function toSerializableError(error: unknown): SerializableError {
  if (error instanceof WorkflowError) {
    return {
      message: error.message,
      name: error.name,
      stack: error.stack,
      type: error.type,
      retryable: error.retryable,
      stepId: error.stepId,
      metadata: error.metadata,
      cause: error.cause ? toSerializableError(error.cause) : undefined,
    };
  }

  if (error instanceof Error) {
    const serializable: SerializableError = {
      message: error.message,
      name: error.name,
      stack: error.stack,
    };

    // Preserve custom properties
    const errorObj = error as unknown as Record<string, unknown>;
    for (const key of Object.keys(errorObj)) {
      if (!["message", "name", "stack"].includes(key)) {
        serializable[key] = errorObj[key];
      }
    }

    if (error.cause) {
      serializable.cause = toSerializableError(error.cause);
    }

    return serializable;
  }

  // Non-Error objects
  if (typeof error === "object" && error !== null) {
    const obj = error as Record<string, unknown>;
    return {
      message: String(obj.message ?? "Unknown error"),
      name: String(obj.name ?? "Error"),
      ...obj,
    };
  }

  // Primitives
  return {
    message: String(error),
    name: "Error",
  };
}

/**
 * Restore error from serialized format
 */
export function fromSerializableError(
  serializable: SerializableError
): WorkflowError {
  const error = new WorkflowError(serializable.message, {
    type: (serializable.type as WorkflowErrorType) ?? WorkflowErrorType.UNKNOWN,
    retryable: Boolean(serializable.retryable),
    stepId: serializable.stepId as string | undefined,
    metadata: serializable.metadata as Record<string, unknown> | undefined,
    cause: serializable.cause
      ? fromSerializableError(serializable.cause)
      : undefined,
  });

  error.name = serializable.name;
  if (serializable.stack) {
    error.stack = serializable.stack;
  }

  return error;
}

/**
 * Wrapped operation result (success or failure with serialized error)
 */
export interface OperationResult<T> {
  ok: boolean;
  value?: T;
  error?: SerializableError;
}

/**
 * Create successful result
 */
export function success<T>(value: T): OperationResult<T> {
  return { ok: true, value };
}

/**
 * Create failed result with serialized error
 */
export function failure(error: unknown): OperationResult<never> {
  return { ok: false, error: toSerializableError(error) };
}

/**
 * Wrap async function for automatic error serialization
 */
export async function wrapOperation<T>(
  fn: () => Promise<T>
): Promise<OperationResult<T>> {
  try {
    const value = await fn();
    return success(value);
  } catch (error) {
    return failure(error);
  }
}

/**
 * Determine if error should be retried based on type or pattern
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof WorkflowError) {
    return error.retryable;
  }

  // Check common retryable patterns
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    // Network/timeout errors
    if (
      message.includes("timeout") ||
      message.includes("network") ||
      message.includes("econnrefused") ||
      message.includes("enotfound") ||
      message.includes("etimedout")
    ) {
      return true;
    }

    // Rate limiting
    if (message.includes("rate limit") || message.includes("429")) {
      return true;
    }
  }

  return false;
}

/**
 * Factory for common workflow errors
 */
export const WorkflowErrors = {
  validation(message: string, stepId?: string): WorkflowError {
    return new WorkflowError(message, {
      type: WorkflowErrorType.VALIDATION,
      retryable: false,
      stepId,
    });
  },

  execution(message: string, stepId?: string, cause?: Error): WorkflowError {
    return new WorkflowError(message, {
      type: WorkflowErrorType.EXECUTION,
      retryable: false,
      stepId,
      cause,
    });
  },

  configuration(message: string): WorkflowError {
    return new WorkflowError(message, {
      type: WorkflowErrorType.CONFIGURATION,
      retryable: false,
    });
  },

  externalService(
    message: string,
    stepId?: string,
    cause?: Error
  ): WorkflowError {
    return new WorkflowError(message, {
      type: WorkflowErrorType.EXTERNAL_SERVICE,
      retryable: true,
      stepId,
      cause,
    });
  },

  stepNotFound(stepId: string): WorkflowError {
    return new WorkflowError(`Step '${stepId}' not found`, {
      type: WorkflowErrorType.VALIDATION,
      retryable: false,
      stepId,
    });
  },

  workflowNotFound(workflowId: string): WorkflowError {
    return new WorkflowError(`Workflow '${workflowId}' not found`, {
      type: WorkflowErrorType.VALIDATION,
      retryable: false,
    });
  },

  invalidStep(stepId: string, reason: string): WorkflowError {
    return new WorkflowError(`Invalid step '${stepId}': ${reason}`, {
      type: WorkflowErrorType.VALIDATION,
      retryable: false,
      stepId,
    });
  },

  timeout(stepId: string, timeoutMs: number): WorkflowError {
    return new WorkflowError(
      `Step '${stepId}' timed out after ${timeoutMs}ms`,
      {
        type: WorkflowErrorType.EXECUTION,
        retryable: true,
        stepId,
        metadata: { timeoutMs },
      }
    );
  },
};
