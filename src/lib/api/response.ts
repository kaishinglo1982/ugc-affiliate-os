import { NextResponse } from "next/server";
import { newRequestId, type FieldErrors } from "@/types/result";

/**
 * Unified API response/error envelope for all `/api` route handlers.
 *
 * Every response (success or failure) shares the same shape so clients can
 * rely on a stable contract:
 *
 *   { ok: boolean, data?, error?, fieldErrors?, requestId, timestamp }
 *
 * This is the HTTP-side counterpart of `src/types/result.ts` (which is the
 * server-action shape). Route handlers must use these helpers instead of
 * building their own `NextResponse.json({ error })` objects.
 */

export type ApiEnvelope<T> = {
  ok: boolean;
  data?: T;
  error?: string;
  fieldErrors?: FieldErrors;
  requestId: string;
  timestamp: string;
};

function envelope<T>(
  ok: boolean,
  requestId: string,
  extra: { data?: T; error?: string; fieldErrors?: FieldErrors },
): ApiEnvelope<T> {
  return {
    ok,
    requestId,
    timestamp: new Date().toISOString(),
    ...extra,
  };
}

export function ok<T>(data: T, status = 200): NextResponse {
  const requestId = newRequestId();
  return NextResponse.json(envelope(true, requestId, { data }), { status });
}

export function created<T>(data: T): NextResponse {
  return ok(data, 201);
}

export function fail(
  error: string,
  options: { status?: number; fieldErrors?: FieldErrors; requestId?: string } = {},
): NextResponse {
  const { status = 400, fieldErrors, requestId = newRequestId() } = options;
  return NextResponse.json(
    envelope(false, requestId, { error, fieldErrors }),
    { status },
  );
}

export function badRequest(
  error: string,
  fieldErrors?: FieldErrors,
): NextResponse {
  return fail(error, { status: 400, fieldErrors });
}

export function unauthorized(error = "Nicht authentifiziert."): NextResponse {
  return fail(error, { status: 401 });
}

export function forbidden(error = "Keine Berechtigung."): NextResponse {
  return fail(error, { status: 403 });
}

export function notFound(error = "Nicht gefunden."): NextResponse {
  return fail(error, { status: 404 });
}

export function serverError(error = "Interner Serverfehler."): NextResponse {
  return fail(error, { status: 500 });
}
