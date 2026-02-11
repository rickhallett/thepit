// Shared error utilities for consistent error handling across the codebase.

/**
 * Safely extract an error message from an unknown catch value.
 * Handles Error instances, strings, and unknown types without unsafe casts.
 */
export function toErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'Unknown error';
}

/**
 * Safely convert an unknown catch value to an Error instance.
 * Useful for loggers that expect Error objects.
 */
export function toError(error: unknown): Error {
  if (error instanceof Error) return error;
  return new Error(toErrorMessage(error));
}
