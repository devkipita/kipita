import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./env";

type SupabaseCookie = {
  name: string;
  value: string;
  options?: CookieOptions;
};

/**
 * Refresh the Supabase auth session cookie on every matched request.
 *
 * `extraRequestHeaders` are merged onto the *request* so server components can
 * read them (the CSP nonce arrives this way) — they have to be applied every
 * time the response is rebuilt below, or a cookie refresh would drop them.
 */
const STREAMING_AUTHED_ROUTES = [
  "/trips",
  "/wallet",
  "/referrals",
  "/profile",
  "/notifications",
  "/publish",
];

export async function updateSession(
  request: NextRequest,
  extraRequestHeaders: Record<string, string> = {},
) {
  const withHeaders = () => {
    const headers = new Headers(request.headers);
    for (const [key, value] of Object.entries(extraRequestHeaders)) {
      headers.set(key, value);
    }
    return NextResponse.next({ request: { headers } });
  };

  let response = withHeaders();

  const hasSessionCookie = request.cookies
    .getAll()
    .some(({ name }) => name.startsWith("sb-") && name.includes("auth-token"));

  if (!hasSessionCookie) {
    const { pathname, search } = request.nextUrl;
    const needsAuth = STREAMING_AUTHED_ROUTES.some(
      (route) => pathname === route || pathname.startsWith(`${route}/`),
    );
    if (needsAuth) {
      const signIn = new URL("/auth/sign-in", request.url);
      signIn.searchParams.set("next", `${pathname}${search}`);
      return NextResponse.redirect(signIn);
    }
    return response;
  }

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: SupabaseCookie[]) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = withHeaders();
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // Touch the session so an expiring token is refreshed into the response.
  await supabase.auth.getUser();

  return response;
}
