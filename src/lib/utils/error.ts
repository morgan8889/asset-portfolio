/**
 * Extract error message from unknown error type.
 * Handles Error objects, strings, and unknown types.
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (error === null || error === undefined) return 'An unknown error occurred';
  return String(error);
}
