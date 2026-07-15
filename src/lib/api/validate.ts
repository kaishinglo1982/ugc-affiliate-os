import { z, type ZodSchema, type ZodError } from "zod";
import { badRequest } from "./response";
import type { FieldErrors } from "@/types/result";

/**
 * Zod-based request validation helpers for API route handlers.
 *
 * Route handlers parse external input with these helpers instead of calling
 * `request.json()` and trusting the shape. Validation failures return a
 * unified 400 envelope (see `response.ts`) including field-level errors.
 */

export type ValidatedBody<T> = { data: T } | { response: ReturnType<typeof badRequest> };

function toFieldErrors(error: ZodError): FieldErrors {
  const flat = error.flatten().fieldErrors as Record<string, string[] | undefined>;
  const out: FieldErrors = {};
  for (const key of Object.keys(flat)) {
    const messages = flat[key];
    if (messages && messages.length > 0) out[key] = messages;
  }
  return out;
}

/**
 * Parse and validate a JSON request body against a Zod schema.
 *
 * Returns `{ data }` on success or `{ response }` (a 400 envelope) on failure.
 * The caller should `return validated.response` when present.
 */
export async function parseBody<T>(
  request: Request,
  schema: ZodSchema<T>,
): Promise<ValidatedBody<T>> {
  const raw = await request.json().catch(() => null);
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return { response: badRequest("Ungültige Eingabe.", toFieldErrors(parsed.error)) };
  }
  return { data: parsed.data };
}

/**
 * Validate already-parsed (non-JSON) input such as query params or route
 * params against a Zod schema. Returns `{ data }` or `{ response }`.
 */
export function validateValue<T>(
  value: unknown,
  schema: ZodSchema<T>,
): ValidatedBody<T> {
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    return { response: badRequest("Ungültige Eingabe.", toFieldErrors(parsed.error)) };
  }
  return { data: parsed.data };
}

/**
 * Validate a required query parameter, returning its trimmed string value or a
 * 400 envelope when missing/empty.
 */
export function requireQueryParam(
  request: Request,
  name: string,
): { value: string } | { response: ReturnType<typeof badRequest> } {
  const { searchParams } = new URL(request.url);
  const value = searchParams.get(name);
  if (!value || value.trim().length === 0) {
    return { response: badRequest(`${name} erforderlich.`) };
  }
  return { value: value.trim() };
}

/**
 * Build a typed UUID schema reusing Zod's built-in validation. Exposed so
 * route handlers share one definition for id path/body params.
 */
export const uuidSchema = z.string().uuid();
