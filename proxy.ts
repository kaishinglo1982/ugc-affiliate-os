import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session";

/**
 * Next.js 16 network boundary (formerly `middleware.ts`). Runs in the Node.js
 * runtime and performs a cheap, stateless pre-check (JWT signature + expiry)
 * before a request reaches a protected route, to redirect unauthenticated
 * users early. The authoritative check — DB session existence, revocation,
 * secret-hash match — happens in `getCurrentUser()` inside the protected
 * layout, since that requires a database round trip.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith("/app")) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return redirectToLogin(request);
  }

  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    return redirectToLogin(request);
  }

  try {
    await jwtVerify(token, new TextEncoder().encode(secret));
    return NextResponse.next();
  } catch {
    return redirectToLogin(request);
  }
}

function redirectToLogin(request: NextRequest) {
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("from", request.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/app/:path*"],
};
