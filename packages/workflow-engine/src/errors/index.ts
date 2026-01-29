/**
 * Error handling exports
 *
 * Framework-agnostic error handling:
 * - WorkflowError: Typed error with categorization
 * - Serialization: Safe for storage and transmission
 * - Retry logic: Determine if errors are recoverable
 */

export {
  failure,
  fromSerializableError,
  isRetryableError,
  type OperationResult,
  type SerializableError,
  success,
  toSerializableError,
  WorkflowError,
  WorkflowErrors,
  WorkflowErrorType,
  wrapOperation,
} from "./error-serializer";
