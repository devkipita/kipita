"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { clientIp, siteOrigin } from "@/lib/security/request";
import { enforce, LIMITS, retryMessage } from "@/lib/security/rate-limit";
import { clearStepUpTicket, hasStepUpTicketFor } from "@/lib/security/step-up";
import {
  emailSchema,
  keLocalPhoneSchema,
  otpSchema,
  setPasswordSchema,
  signInEmailSchema,
  signUpEmailSchema,
} from "@/lib/validators/auth";
import { toE164 } from "@/lib/phone";

export type AuthResult = { ok: true; next?: string } | { ok: false; error: string };

const GENERIC_SIGN_IN_ERROR = "That email and password don't match an account.";
const GENERIC_FAILURE = "Something went wrong. Try again in a moment.";

function fail(error: string): AuthResult {
  return { ok: false, error };
}

function identityKey(value: string): string {
  return value.trim().toLowerCase();
}

async function limited(
  scopes: Array<[string, { limit: number; windowMs: number }]>,
): Promise<string | null> {
  for (const [key, config] of scopes) {
    const result = enforce(key, config);
    if (!result.ok) return retryMessage(result.retryAfterMs);
  }
  return null;
}

export async function signInAsAdminAction(
  email: string,
  password: string,
): Promise<AuthResult> {
  const parsed = signInEmailSchema.safeParse({ email, password });
  if (!parsed.success) return fail(GENERIC_SIGN_IN_ERROR);

  const ip = await clientIp();
  const identity = identityKey(parsed.data.email);
  const blocked = await limited([
    [`admin-signin:ip:${ip}`, LIMITS.signInIp],
    [`admin-signin:id:${identity}`, LIMITS.signInIdentity],
  ]);
  if (blocked) return fail(blocked);

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (error || !data.user) return fail(GENERIC_SIGN_IN_ERROR);

  const { data: profile } = await supabase
    .from("users")
    .select("is_admin")
    .eq("auth_id", data.user.id)
    .maybeSingle();

  if (!profile?.is_admin) {
    await supabase.auth.signOut();
    return fail("This account isn't an admin.");
  }

  return { ok: true, next: "/admin" };
}

export async function sendSignUpLinkAction(
  fullName: string,
  email: string,
): Promise<AuthResult> {
  const parsed = signUpEmailSchema.safeParse({ fullName, email });
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? GENERIC_FAILURE);
  }

  const ip = await clientIp();
  const identity = identityKey(parsed.data.email);
  const blocked = await limited([
    [`signup:ip:${ip}`, LIMITS.signUpIp],
    [`signup:id:${identity}`, LIMITS.signUpIdentity],
  ]);
  if (blocked) return fail(blocked);

  const origin = await siteOrigin();
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent("/auth/set-password")}`,
      data: { full_name: parsed.data.fullName },
    },
  });

  if (error) return fail(GENERIC_FAILURE);
  return { ok: true };
}

export async function sendPasswordResetAction(
  email: string,
): Promise<AuthResult> {
  const parsed = emailSchema.safeParse(email);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? GENERIC_FAILURE);
  }

  const ip = await clientIp();
  const identity = identityKey(parsed.data);
  const blocked = await limited([
    [`reset:ip:${ip}`, LIMITS.passwordResetIp],
    [`reset:id:${identity}`, LIMITS.passwordResetIdentity],
  ]);
  if (blocked) return fail(blocked);

  const origin = await siteOrigin();
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(parsed.data, {
    redirectTo: `${origin}/auth/callback?next=${encodeURIComponent("/auth/reset-password")}`,
  });

  return { ok: true };
}

/**
 * Phone numbers are verified, never used to sign in. Both actions need a signed-in
 * user, so an SMS can only be sent to someone who already has an account, and the
 * limits below count per account as well as per address.
 */
export async function startPhoneVerificationAction(
  phone: string,
): Promise<AuthResult> {
  const parsed = keLocalPhoneSchema.safeParse(phone);
  if (!parsed.success) return fail("Enter a valid Kenyan number.");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("Your session expired. Sign in again.");

  const e164 = toE164(parsed.data);
  if (user.phone && user.phone === e164.slice(1) && user.phone_confirmed_at) {
    return fail("That number is already verified on your account.");
  }

  const ip = await clientIp();
  const blocked = await limited([
    [`phone-send:user:${user.id}`, LIMITS.otpSendIdentity],
    [`phone-send:day:${user.id}`, LIMITS.phoneVerifyDay],
    [`phone-send:ip:${ip}`, LIMITS.otpSendIp],
  ]);
  if (blocked) return fail(blocked);

  const { error } = await supabase.auth.updateUser({ phone: e164 });
  if (error) {
    if ((error as { code?: string }).code === "phone_exists") {
      return fail("That number is already on another Kipita account.");
    }
    return fail(GENERIC_FAILURE);
  }
  return { ok: true };
}

export async function confirmPhoneVerificationAction(
  phone: string,
  token: string,
): Promise<AuthResult> {
  const parsedPhone = keLocalPhoneSchema.safeParse(phone);
  const parsedToken = otpSchema.safeParse(token);
  if (!parsedPhone.success || !parsedToken.success) {
    return fail("That code didn't work.");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("Your session expired. Sign in again.");

  const blocked = await limited([
    [`phone-verify:user:${user.id}`, LIMITS.otpVerifyIdentity],
  ]);
  if (blocked) return fail(blocked);

  const { error } = await supabase.auth.verifyOtp({
    phone: toE164(parsedPhone.data),
    token: parsedToken.data,
    type: "phone_change",
  });
  if (error) return fail("That code didn't work.");

  revalidatePath("/profile");
  return { ok: true };
}

export async function updatePasswordAction(
  intent: "recovery" | "signup",
  password: string,
  confirm: string,
): Promise<AuthResult> {
  const parsed = setPasswordSchema.safeParse({ password, confirm });
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? GENERIC_FAILURE);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("Your session expired. Start again.");

  const blocked = await limited([
    [`pwupdate:${user.id}`, LIMITS.passwordUpdate],
  ]);
  if (blocked) return fail(blocked);

  if (!(await hasStepUpTicketFor(intent, user.id))) {
    return fail(
      "This link has expired. Request a new one and open it from your email.",
    );
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });
  if (error) return fail(error.message);

  await clearStepUpTicket(intent);
  await supabase.auth.signOut({ scope: "others" });

  return { ok: true };
}

export async function requestPasswordChangeAction(): Promise<AuthResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("Your session expired. Sign in again.");

  const blocked = await limited([
    [`reset:id:${user.id}`, LIMITS.passwordResetIdentity],
  ]);
  if (blocked) return fail(blocked);

  if (!user.email) {
    return fail(
      "Add an email address to your account before changing your password.",
    );
  }
  if (!user.email_confirmed_at) {
    return fail("Confirm your email address first, then change your password.");
  }

  const origin = await siteOrigin();
  await supabase.auth.resetPasswordForEmail(user.email, {
    redirectTo: `${origin}/auth/callback?next=${encodeURIComponent("/auth/reset-password")}`,
  });

  return { ok: true };
}
