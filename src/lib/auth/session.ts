import { SignJWT, jwtVerify } from "jose";
import { createHash, randomBytes } from "node:crypto";

export const SESSION_COOKIE_NAME = "ugc_session";
export const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 7; // 7 days

function getAuthSecretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("AUTH_SECRET must be set to a string of at least 32 characters");
  }
  return new TextEncoder().encode(secret);
}

export interface SessionTokenPayload {
  sub: string; // userId
  sid: string; // session id (DB row id)
  sec: string; // opaque per-session secret; only its hash is persisted (Session.tokenHash)
}

export async function signSessionToken(payload: SessionTokenPayload): Promise<string> {
  return new SignJWT({ sid: payload.sid, sec: payload.sec })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(getAuthSecretKey());
}

export async function verifySessionToken(
  token: string,
): Promise<SessionTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getAuthSecretKey());
    if (
      typeof payload.sub !== "string" ||
      typeof payload.sid !== "string" ||
      typeof payload.sec !== "string"
    ) {
      return null;
    }
    return { sub: payload.sub, sid: payload.sid, sec: payload.sec };
  } catch {
    return null;
  }
}

/** Opaque per-session secret. Only its SHA-256 hash is persisted, so a JWT signature
 * leak alone cannot forge a valid session — the DB-side hash must also match, and
 * logout/revocation invalidates it independent of the JWT's own expiry. */
export function generateOpaqueSecret(): string {
  return randomBytes(32).toString("base64url");
}

export function hashOpaqueSecret(secret: string): string {
  return createHash("sha256").update(secret).digest("hex");
}
