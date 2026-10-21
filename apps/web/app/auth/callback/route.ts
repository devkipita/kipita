import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/security/redirect";
import { attachStepUpTicket, type StepUpIntent } from "@/lib/security/step-up";
import { clientIp } from "@/lib/security/request";
import { enforce, LIMITS } from "@/lib/security/rate-limit";

const STEP_UP_ROUTES: Record<string, StepUpIntent> = {
  "/auth/reset-password": "recovery",
  "/auth/set-password": "signup",
};

const EMAIL_OTP_TYPES = new Set<EmailOtpType>([
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
]);

function emailOtpType(value: string | null): EmailOtpType | null {
  return value && EMAIL_OTP_TYPES.has(value as EmailOtpType)
    ? (value as EmailOtpType)
    : null;
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const next = safeNextPath(searchParams.get("next"));
  const isAdmin = next.startsWith("/admin");
  const failUrl = new URL(isAdmin ? "/admin/login" : "/auth/sign-in", origin);

  const providerError =
    searchParams.get("error_description") ?? searchParams.get("error");
  if (providerError) {
    failUrl.searchParams.set(
      "error",
      /access_denied|cancel/i.test(providerError)
        ? "oauth_cancelled"
        : "oauth_failed",
    );
    return NextResponse.redirect(failUrl);
  }

  const ip = await clientIp();
  if (!enforce(`auth-callback:${ip}`, LIMITS.signInIp).ok) {
    failUrl.searchParams.set("error", "too_many_attempts");
    return NextResponse.redirect(failUrl);
  }

  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const otpType = emailOtpType(searchParams.get("type"));

  if (!code && !(tokenHash && otpType)) {
    failUrl.searchParams.set("error", "link_invalid");
    return NextResponse.redirect(failUrl);
  }

  const supabase = await createClient();
  const { error: exchangeError } = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : await supabase.auth.verifyOtp({
        token_hash: tokenHash as string,
        type: otpType as EmailOtpType,
      });

  if (exchangeError) {
    failUrl.searchParams.set("error", "link_expired");
    return NextResponse.redirect(failUrl);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    failUrl.searchParams.set("error", "link_invalid");
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

  const response = NextResponse.redirect(new URL(next, origin));

  const intent = STEP_UP_ROUTES[next.split("?")[0]];
  if (intent) attachStepUpTicket(response, intent, user.id);

  return response;
}
