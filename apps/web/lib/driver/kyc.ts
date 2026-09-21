import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Driver KYC status — the web port of `apps/mobile/src/hooks/useDriverKyc.ts`.
 *
 * Note the gate mobile actually uses is `hasApplied` ("has submitted"), not
 * `isApproved`. Web mirrors that so the two clients agree; tightening it to
 * approval is a product decision, not a porting one.
 */

export type KycStatus = "not_submitted" | "pending" | "approved" | "rejected";

export type DriverKyc = {
  status: KycStatus;
  hasApplied: boolean;
  isApproved: boolean;
};

export const NO_KYC: DriverKyc = {
  status: "not_submitted",
  hasApplied: false,
  isApproved: false,
};

/** `userId` is `users.id` (never `auth_id`) — `driver_profiles.user_id` is a FK to it. */
export async function fetchDriverKyc(
  supabase: SupabaseClient,
  userId: string,
): Promise<DriverKyc> {
  const { data, error } = await supabase
    .from("driver_profiles")
    .select("approval_status")
    .eq("user_id", userId)
    .maybeSingle();

  // A missing row and an unreadable one are the same thing to the caller: not
  // a driver yet. Never block the page on this.
  if (error || !data) return NO_KYC;

  const status = (data.approval_status as KycStatus) ?? "not_submitted";
  return {
    status,
    hasApplied: status !== "not_submitted",
    isApproved: status === "approved",
  };
}
