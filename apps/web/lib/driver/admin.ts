import { createClient } from "@/lib/supabase/client";
import type { KycStatus } from "./kyc";

export type DriverApplication = {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  national_id: string | null;
  license_number: string | null;
  license_expiry: string | null;
  license_photo: string | null;
  selfie_photo: string | null;
  approval_status: KycStatus;
  submitted_at: string | null;
};

export async function fetchDriverApplications(): Promise<DriverApplication[]> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("pending_driver_applications");
  if (error) throw error;
  return (data ?? []) as DriverApplication[];
}

export async function setDriverApproval(
  userId: string,
  status: Extract<KycStatus, "approved" | "rejected">,
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc("set_driver_approval", {
    p_user_id: userId,
    p_status: status,
  });
  if (error) throw error;
}
