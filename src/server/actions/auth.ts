"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { verifyPassword } from "@/lib/auth/password";
import {
  SESSION_COOKIE_NAME,
  SESSION_DURATION_SECONDS,
  generateOpaqueSecret,
  hashOpaqueSecret,
  signSessionToken,
  verifySessionToken,
} from "@/lib/auth/session";
import { isRateLimited, recordAttempt, clearAttempts } from "@/lib/auth/rate-limit";
import { getCurrentUser } from "@/lib/auth/current-user";
import { loginSchema } from "@/lib/validation/auth";
import { writeAuditLog } from "@/lib/audit/log";
import { fail, newRequestId, ok, type Result } from "@/types/result";

export async function loginAction(
  _prevState: Result<{ redirectTo: string }> | null,
  formData: FormData,
): Promise<Result<{ redirectTo: string }>> {
  const requestId = newRequestId();
  const headerStore = await headers();
  const ip = headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";

  if (isRateLimited(`login:${ip}`)) {
    return fail(
      "Zu viele Anmeldeversuche. Bitte warte 15 Minuten und versuche es erneut.",
      requestId,
    );
  }

  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  const requestedRedirect = formData.get("from");
  const redirectTo =
    typeof requestedRedirect === "string" && requestedRedirect.startsWith("/app")
      ? requestedRedirect
      : "/app/dashboard";

  if (!parsed.success) {
    return fail("Eingabe ungültig.", requestId, parsed.error.flatten().fieldErrors);
  }

  recordAttempt(`login:${ip}`);

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  const genericError = "E-Mail oder Passwort ist falsch.";

  if (!user) {
    return fail(genericError, requestId);
  }

  const validPassword = await verifyPassword(parsed.data.password, user.passwordHash);
  if (!validPassword) {
    return fail(genericError, requestId);
  }

  clearAttempts(`login:${ip}`);

  const secret = generateOpaqueSecret();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_SECONDS * 1000);

  const session = await prisma.session.create({
    data: {
      userId: user.id,
      tokenHash: hashOpaqueSecret(secret),
      userAgent: headerStore.get("user-agent") ?? undefined,
      ipAddress: ip,
      expiresAt,
    },
  });

  const token = await signSessionToken({ sub: user.id, sid: session.id, sec: secret });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
  });

  await writeAuditLog({
    action: "auth.login",
    entityType: "User",
    entityId: user.id,
    requestId,
    metadata: { ip },
  });

  return ok({ redirectTo }, requestId);
}

export async function logoutAction(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (token) {
    const user = await getCurrentUser();
    const payload = await verifySessionToken(token);
    if (payload) {
      await prisma.session.updateMany({
        where: { id: payload.sid },
        data: { revokedAt: new Date() },
      });
    }
    if (user) {
      await writeAuditLog({ action: "auth.logout", entityType: "User", entityId: user.id, requestId: crypto.randomUUID() });
    }
  }

  cookieStore.delete(SESSION_COOKIE_NAME);
  redirect("/login");
}
