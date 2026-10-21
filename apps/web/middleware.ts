import { NextResponse, type NextRequest } from "next/server";
import { isValidReferralCode } from "@kipita/shared";
import { updateSession } from "@/lib/supabase/middleware";
import { REF_COOKIE, REF_MAX_AGE } from "@/lib/referrals/cookie";
import {
  contentSecurityPolicy,
  STATIC_SECURITY_HEADERS,
} from "@/lib/security/headers";

export const NONCE_HEADER = "x-csp-nonce";

function makeNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...bytes));
}

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function isCrossSiteWrite(request: NextRequest): boolean {
  if (SAFE_METHODS.has(request.method)) return false;

  const origin = request.headers.get("origin");
  if (!origin) return false;

  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!host) return true;

  try {
    return new URL(origin).host !== host;
  } catch {
    return true;
  }
}

const CALLBACK_PATH = "/auth/callback";

const NEXT_FOR_TYPE: Record<string, string> = {
  recovery: "/auth/reset-password",
  signup: "/auth/set-password",
  invite: "/auth/set-password",
  magiclink: "/auth/set-password",
};

function strayAuthCode(request: NextRequest): NextResponse | null {
  if (request.method !== "GET") return null;
  if (request.nextUrl.pathname.startsWith(CALLBACK_PATH)) return null;

  const params = request.nextUrl.searchParams;
  const code = params.get("code");
  const tokenHash = params.get("token_hash");
  if (!code && !tokenHash) return null;

  const callback = new URL(CALLBACK_PATH, request.url);
  if (code) callback.searchParams.set("code", code);
  if (tokenHash) callback.searchParams.set("token_hash", tokenHash);

  const type = params.get("type");
  if (type) callback.searchParams.set("type", type);

  const landed = request.nextUrl.pathname;
  callback.searchParams.set(
    "next",
    (type && NEXT_FOR_TYPE[type]) ?? (landed === "/" ? "/home" : landed),
  );

  return NextResponse.redirect(callback);
}

export async function middleware(request: NextRequest) {
  if (isCrossSiteWrite(request)) {
    return new NextResponse("Cross-site request blocked", { status: 403 });
  }

  const rescued = strayAuthCode(request);
  if (rescued) return rescued;

  const nonce = makeNonce();
  const isDev = process.env.NODE_ENV !== "production";
  const csp = contentSecurityPolicy(nonce, isDev);

  // Next reads the nonce back out of this request header and stamps it onto its
  // own bootstrap scripts, so the runtime keeps working under 'strict-dynamic'.
  const response = await updateSession(request, {
    [NONCE_HEADER]: nonce,
    "content-security-policy": csp,
  });

  const ref = request.nextUrl.searchParams.get("ref");
  if (ref && isValidReferralCode(ref)) {
    response.cookies.set(REF_COOKIE, ref.trim().toUpperCase(), {
      maxAge: REF_MAX_AGE,
      sameSite: "lax",
      path: "/",
      httpOnly: true,
      secure: !isDev,
    });
  }

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
