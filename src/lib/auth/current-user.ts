import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import { prisma } from "@/lib/db/client";
import {
  SESSION_COOKIE_NAME,
  verifySessionToken,
  hashOpaqueSecret,
} from "@/lib/auth/session";
import type { User } from "@/generated/prisma/client";

/**
 * Full, DB-backed authentication check: verifies the JWT signature/expiry,
 * then confirms the referenced session still exists, is not revoked, and is
 * not expired, and that its stored secret hash matches. This is the check
 * that actually gates access — `proxy.ts` only does a cheap pre-check.
 * Cached per request via React `cache` so repeated calls in one render pass
 * don't re-hit the database.
 */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const payload = await verifySessionToken(token);
  if (!payload) return null;

  const session = await prisma.session.findUnique({
    where: { id: payload.sid },
    include: { user: true },
  });

  if (!session || session.revokedAt) return null;
  if (session.expiresAt.getTime() < Date.now()) return null;
  if (session.tokenHash !== hashOpaqueSecret(payload.sec)) return null;

  return session.user;
});
