import { createClient } from "@/lib/supabase/client";
import { signKycDocuments } from "./documents";
import type { KycStatus } from "./kyc";

export type DriverApplication = {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  document_type: "national_id" | "driving_licence" | "passport" | null;
  document_number: string | null;
  national_id: string | null;
  license_number: string | null;
  license_expiry: string | null;
  document_photo: string | null;
  license_photo: string | null;
  selfie_photo: string | null;
  vehicle_photo: string | null;
  approval_status: KycStatus;
  waiting_rides: number;
  submitted_at: string | null;
};

const PHOTO_KEYS = ["document_photo", "license_photo", "selfie_photo", "vehicle_photo"] as const;

export async function fetchDriverApplications(): Promise<DriverApplication[]> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("pending_driver_applications");
  if (error) throw error;
  const rows = (data ?? []) as DriverApplication[];

  const paths = rows.flatMap((r) => PHOTO_KEYS.map((k) => r[k]).filter((p): p is string => !!p));
  const signed = paths.length > 0 ? await signKycDocuments(supabase, paths) : {};
  const sign = (p: string | null) => (p ? (signed[p] ?? null) : null);

  return rows.map((r) => ({
    ...r,
    waiting_rides: Number(r.waiting_rides ?? 0),
    document_photo: sign(r.document_photo),
    license_photo: sign(r.license_photo),
    selfie_photo: sign(r.selfie_photo),
    vehicle_photo: sign(r.vehicle_photo),
  }));
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
