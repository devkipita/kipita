import type { SupabaseClient } from "@supabase/supabase-js";
import { SUPPORT_BUCKET } from "./api";

/**
 * Screenshot upload for a support case.
 *
 * The bucket's insert policy compares the first path segment to
 * `current_app_user_id()` — the PUBLIC `users.id`, not `auth.uid()`. Uploading
 * under the auth id is rejected by RLS.
 *
 * Downscaling through a canvas keeps a phone screenshot under the 5 MB bucket
 * limit and strips EXIF on the way, which matters more here than on a road
 * photo: people send support pictures taken at home.
 */

const MAX_BYTES = 5 * 1024 * 1024;
const MAX_EDGE = 1800;
const QUALITY = 0.85;

export type UploadResult =
  | { ok: true; path: string }
  | { ok: false; error: string };

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read that image"));
    };
    img.src = url;
  });
}

async function downscale(file: File): Promise<Blob> {
  try {
    const img = await loadImage(file);
    const scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height));
    if (scale === 1 && file.size <= MAX_BYTES) return file;

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);

    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", QUALITY),
    );
    return blob ?? file;
  } catch {
    return file;
  }
}

/** `userId` is `users.id`. See the note above — passing `auth_id` will 403. */
export async function uploadSupportImage(
  supabase: SupabaseClient,
  file: File,
  userId: string,
  caseId: string,
): Promise<UploadResult> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
    return { ok: false, error: "Use a JPG, PNG or WebP image." };
  }

  const blob = await downscale(file);
  if (blob.size > MAX_BYTES) {
    return { ok: false, error: "That image is too large — keep it under 5MB." };
  }

  const ext = blob.type === "image/jpeg" ? "jpg" : blob.type.split("/")[1];
  const path = `${userId}/${caseId}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from(SUPPORT_BUCKET)
    .upload(path, blob, { contentType: blob.type, upsert: false });

  if (error) return { ok: false, error: "Upload failed. Please try again." };
  return { ok: true, path };
}
