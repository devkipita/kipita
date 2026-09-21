import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import {
  contentSecurityPolicy,
  STATIC_SECURITY_HEADERS,
} from "@/lib/security/headers";

export const NONCE_HEADER = "x-csp-nonce";

function makeNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...bytes));
}

export async function middleware(request: NextRequest) {
  const nonce = makeNonce();
  const isDev = process.env.NODE_ENV !== "production";
  const csp = contentSecurityPolicy(nonce, isDev);

  // Next reads the nonce back out of this request header and stamps it onto its
  // own bootstrap scripts, so the runtime keeps working under 'strict-dynamic'.
  const response = await updateSession(request, {
    [NONCE_HEADER]: nonce,
    "content-security-policy": csp,
  });

  response.headers.set("Content-Security-Policy", csp);
  for (const [key, value] of Object.entries(STATIC_SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }
  if (!isDev) {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains; preload",
    );
  }

  return response;
}

export const config = {
  matcher: [
    // Everything except static assets.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
