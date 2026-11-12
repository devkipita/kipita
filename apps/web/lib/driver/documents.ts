import type { SupabaseClient } from "@supabase/supabase-js";
import { downscale } from "@/lib/home/vehicle";

export const KYC_BUCKET = "kyc-documents";

const MAX_BYTES = 5 * 1024 * 1024;

export type KycDocument = "document" | "selfie" | "vehicle";

export type DocumentUpload =
  | { ok: true; path: string }
  | { ok: false; error: string };

export async function uploadKycDocument(
  supabase: SupabaseClient,
  file: File,
  userId: string,
  kind: KycDocument,
): Promise<DocumentUpload> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
    return { ok: false, error: "Use a JPG, PNG or WebP photo." };
  }

  const blob = await downscale(file);
  if (blob.size > MAX_BYTES) {
    return { ok: false, error: "That photo is too large. Keep it under 5MB." };
  }

  const ext = blob.type === "image/jpeg" ? "jpg" : blob.type.split("/")[1];
  const path = `${userId}/${kind}-${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from(KYC_BUCKET)
    .upload(path, blob, { contentType: blob.type, upsert: false });
  if (error) return { ok: false, error: "Upload failed. Please try again." };

  return { ok: true, path };
}

export async function signKycDocuments(
  supabase: SupabaseClient,
  paths: string[],
): Promise<Record<string, string>> {
  const wanted = paths.filter((p) => p && !/^https?:\/\//.test(p));
  const out: Record<string, string> = {};
  for (const p of paths) if (/^https?:\/\//.test(p)) out[p] = p;
  if (wanted.length === 0) return out;

  const { data } = await supabase.storage
    .from(KYC_BUCKET)
    .createSignedUrls(wanted, 60 * 30);
  for (const row of data ?? []) {
    if (row.path && row.signedUrl) out[row.path] = row.signedUrl;
  }
  return out;
}
