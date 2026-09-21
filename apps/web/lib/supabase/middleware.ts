import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./env";

type SupabaseCookie = {
  name: string;
  value: string;
  options?: CookieOptions;
};

/**
 * Routes that stream (they have a `loading.tsx`) and therefore cannot redirect
 * with an HTTP status from the page itself — once the shell is flushed, a
 * `redirect()` in the server component can only be delivered inside the stream,
 * so a signed-out visitor sees a skeleton flash and pays for the page's queries
 * before bouncing. Gating those here keeps the redirect a real 307.
 *
 * Every other route still gates itself with `requireProfile` / `requireAdmin`;
 * this list is a performance and polish measure, not the security boundary.
 */
const STREAMING_AUTHED_ROUTES = ["/home"];

/** Refresh the Supabase auth session cookie on every matched request. */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: SupabaseCookie[]) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // Touch the session so an expiring token is refreshed into the response.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname, search } = request.nextUrl;
  const needsAuth = STREAMING_AUTHED_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );

  if (needsAuth && !user) {
    const signIn = new URL("/auth/sign-in", request.url);
    signIn.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(signIn);
  }

  return response;
}
