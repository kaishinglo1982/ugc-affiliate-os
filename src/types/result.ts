/**
 * Unified return shape for every server action and API mutation in the app.
 * Never throw across the server/client boundary — always resolve to a Result.
 */
export type FieldErrors = Record<string, string[]>;

export type Result<T> =
  | { success: true; data: T; requestId: string }
  | {
      success: false;
      error: string;
      fieldErrors?: FieldErrors;
      requestId: string;
    };

export function ok<T>(data: T, requestId: string): Result<T> {
  return { success: true, data, requestId };
}

export function fail<T>(
  error: string,
  requestId: string,
  fieldErrors?: FieldErrors,
): Result<T> {
  return { success: false, error, fieldErrors, requestId };
}

export function newRequestId(): string {
  return crypto.randomUUID();
}
