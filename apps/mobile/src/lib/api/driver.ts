import { supabase } from "@/lib/supabase";
import { readLocalBytes } from "./storage";

export type KycStatus = "not_submitted" | "pending" | "approved" | "rejected";

export type KycDocumentType = "national_id" | "driving_licence" | "passport";

export type KycPhotoKind = "document" | "selfie" | "vehicle";

export const KYC_BUCKET = "kyc-documents";

export interface DriverProfile {
  id: string;
  user_id: string;
  document_type: KycDocumentType | null;
  document_number: string | null;
  document_photo: string | null;
  selfie_photo: string | null;
  vehicle_photo: string | null;
  license_number: string | null;
  national_id: string | null;
  license_expiry: string | null;
  approval_status: KycStatus;
  background_check_status: KycStatus;
}

const PROFILE_COLUMNS =
  "id, user_id, document_type, document_number, document_photo, selfie_photo, vehicle_photo, license_number, national_id, license_expiry, approval_status, background_check_status";

/**
 * The driver KYC row, or null if this user has never applied to drive.
 * Passengers need no KYC; a driver must pass verification first.
 */
export async function fetchDriverProfile(
  userId: string,
): Promise<DriverProfile | null> {
  const { data, error } = await supabase
    .from("driver_profiles")
    .select(PROFILE_COLUMNS)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return (data as DriverProfile | null) ?? null;
}

/**
 * Put one KYC photo in the private `kyc-documents` bucket and return its
 * storage *path*. The path is what `submit_driver_kyc` stores and checks
 * against `storage.objects`, so never substitute a signed or public URL.
 * `userId` must be `users.id` — the bucket policy matches the first folder
 * segment against `current_app_user_id()`.
 */
export async function uploadKycPhoto(
  localUri: string,
  userId: string,
  kind: KycPhotoKind,
): Promise<string> {
  const path = `${userId}/${kind}-${Date.now()}.jpg`;
  const bytes = await readLocalBytes(localUri);

  const { error } = await supabase.storage
    .from(KYC_BUCKET)
    .upload(path, bytes, { contentType: "image/jpeg", upsert: false });
  if (error) throw error;

  return path;
}

/** Short-lived links for reviewing photos already submitted. */
export async function signKycPhotos(
  paths: string[],
): Promise<Record<string, string>> {
  const wanted = paths.filter(Boolean);
  if (wanted.length === 0) return {};

  const { data } = await supabase.storage
    .from(KYC_BUCKET)
    .createSignedUrls(wanted, 60 * 30);

  const out: Record<string, string> = {};
  for (const row of data ?? []) {
    if (row.path && row.signedUrl) out[row.path] = row.signedUrl;
  }
  return out;
}

export interface DriverKycSubmission {
  document_type: KycDocumentType;
  document_number: string;
  document_photo: string;
  selfie_photo: string;
  vehicle_photo: string;
}

/**
 * Submit (or resubmit) driver verification. Writes go through the
 * `submit_driver_kyc` RPC: `authenticated` has no INSERT grant on the
 * approval columns, so a direct upsert is rejected.
 */
export async function submitDriverKyc(
  input: DriverKycSubmission,
): Promise<KycStatus> {
  const { data, error } = await supabase.rpc("submit_driver_kyc", {
    p_document_type: input.document_type,
    p_document_number: input.document_number,
    p_document_photo: input.document_photo,
    p_selfie_photo: input.selfie_photo,
    p_vehicle_photo: input.vehicle_photo,
  } as never);

  // 22023 is the RPC's own validation, already written for the driver to read.
  if (error) {
    throw new Error(
      error.code === "22023"
        ? error.message
        : "We couldn't send that for review. Please try again.",
    );
  }

  return (data as KycStatus) ?? "pending";
}

/** How the number should look, so the field can say so before the server does. */
export const KYC_DOCUMENT_RULES: Record<
  KycDocumentType,
  { pattern: RegExp; example: string; keyboard: "number-pad" | "default" }
> = {
  national_id: {
    pattern: /^[0-9]{7,9}$/,
    example: "12345678",
    keyboard: "number-pad",
  },
  driving_licence: {
    pattern: /^[A-Z]{1,3}[0-9]{5,9}$/,
    example: "DL0123456",
    keyboard: "default",
  },
  passport: {
    pattern: /^[A-Z]{1,2}[0-9]{6,8}$/,
    example: "AK0123456",
    keyboard: "default",
  },
};

/** Normalise the way the server does before matching, so hints agree with it. */
export function normaliseDocumentNumber(value: string): string {
  return value.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
}

export function isDocumentNumberValid(
  type: KycDocumentType,
  value: string,
): boolean {
  return KYC_DOCUMENT_RULES[type].pattern.test(normaliseDocumentNumber(value));
}
