import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * OAuth / email-link / password-recovery callback. Exchanges the PKCE code for
 * a session cookie, then routes onward to `next`. Admin destinations get an
 * extra is_admin gate; everyone else lands wherever `next` points.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/profile";
  const isAdmin = next.startsWith("/admin");
  const failUrl = new URL(
    isAdmin ? "/admin/login" : "/auth/sign-in",
    origin,
  );

  if (!code) {
    failUrl.searchParams.set("error", "oauth_missing_code");
    return NextResponse.redirect(failUrl);
  }

  const supabase = await createClient();
  const { error: exchangeError } =
    await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    failUrl.searchParams.set("error", "oauth_exchange_failed");
    return NextResponse.redirect(failUrl);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    failUrl.searchParams.set("error", "oauth_user_missing");
    return NextResponse.redirect(failUrl);
  }

  if (isAdmin) {
    const { data: profile } = await supabase
      .from("users")
      .select("is_admin")
      .eq("auth_id", user.id)
      .single();

    if (!profile?.is_admin) {
      await supabase.auth.signOut();
      failUrl.searchParams.set("denied", "1");
      return NextResponse.redirect(failUrl);
    }
  }

  return NextResponse.redirect(new URL(next, origin));
}
