import { supabase } from "@/lib/supabase";

export type KycStatus = "not_submitted" | "pending" | "approved" | "rejected";

export interface DriverProfile {
  id: string;
  user_id: string;
  license_number: string;
  national_id: string | null;
  license_expiry: string | null;
  approval_status: KycStatus;
  background_check_status: KycStatus;
}

/**
 * The driver KYC row, or null if this user has never applied to drive.
 * Passengers need no KYC; a driver must submit identity details first.
 */
export async function fetchDriverProfile(
  userId: string,
): Promise<DriverProfile | null> {
  const { data, error } = await supabase
    .from("driver_profiles")
    .select(
      "id, user_id, license_number, national_id, license_expiry, approval_status, background_check_status",
    )
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return (data as DriverProfile | null) ?? null;
}

/** Submit (or resubmit) driver identity details. Moves KYC to `pending`. */
export async function submitDriverKyc(params: {
  userId: string;
  license_number: string;
  national_id: string;
  license_expiry?: string | null;
}): Promise<DriverProfile> {
  const { data, error } = await supabase
    .from("driver_profiles")
    .upsert(
      {
        user_id: params.userId,
        license_number: params.license_number.trim(),
        national_id: params.national_id.trim(),
        license_expiry: params.license_expiry ?? null,
        approval_status: "pending",
        background_check_status: "pending",
      },
      { onConflict: "user_id" },
    )
    .select(
      "id, user_id, license_number, national_id, license_expiry, approval_status, background_check_status",
    )
    .single();
  if (error) throw error;
  return data as DriverProfile;
}
