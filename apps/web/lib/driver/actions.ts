"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { driverKycSchema, type DriverKycInput } from "@/lib/validators/home";
import { LIMITS, rateLimit, retryMessage } from "@/lib/security/rate-limit";

/**
 * Driver KYC submission — the web port of `submitDriverKyc`
 * (`apps/mobile/src/lib/api/driver.ts`).
 *
 * Upserts `driver_profiles` on `user_id` and sets both review fields to
 * `pending`. Approval happens out of band; there is no admin screen for it yet
 * on either platform.
 */

export type KycResult = { ok: true } | { ok: false; error: string };

export async function submitDriverKycAction(
  input: DriverKycInput,
): Promise<KycResult> {
  const parsed = driverKycSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the details" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Your session expired. Sign in again." };

  const { data: me } = await supabase
    .from("users")
    .select("id")
    .eq("auth_id", user.id)
    .maybeSingle();
  if (!me) {
    return {
      ok: false,
      error: "Your profile isn't ready yet. Sign out and back in, then try again.",
    };
  }

  const gate = rateLimit(
    `kyc:${me.id}`,
    LIMITS.submitKyc.limit,
    LIMITS.submitKyc.windowMs,
  );
  if (!gate.ok) return { ok: false, error: retryMessage(gate.retryAfterMs) };

  const { national_id, license_number, license_expiry } = parsed.data;
  const { error } = await supabase.from("driver_profiles").upsert(
    {
      user_id: me.id,
      national_id,
      license_number,
      license_expiry: license_expiry || null,
      approval_status: "pending",
      background_check_status: "pending",
    },
    { onConflict: "user_id" },
  );

  if (error) {
    return { ok: false, error: "We couldn't save that. Please try again." };
  }

  revalidatePath("/home");
  return { ok: true };
}
