import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Alert photo upload.
 *
 * The bucket's insert policy (migration 019) compares the first path segment to
 * `current_app_user_id()`, which returns **`users.id`** — not `auth.uid()`.
 * Uploading under the auth id is rejected by RLS; that mismatch is exactly what
 * migration 011 was written to fix for chat media.
 *
 * Browsers have no `expo-image-manipulator`, so a phone photo (often 4-8 MB)
 * would blow the bucket's 5 MB limit. We downscale through a canvas first,
 * which also strips EXIF — including the GPS tags a road photo usually carries.
 */

export const ALERT_MEDIA_BUCKET = "alert-media";
const MAX_BYTES = 5 * 1024 * 1024;
const MAX_EDGE = 1600;
const QUALITY = 0.82;

export type UploadResult =
  | { ok: true; url: string; path: string }
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

/** Downscale to fit MAX_EDGE and re-encode as JPEG. Returns the original on failure. */
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
export async function uploadAlertImage(
  supabase: SupabaseClient,
  file: File,
  userId: string,
): Promise<UploadResult> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
    return { ok: false, error: "Use a JPG, PNG or WebP image." };
  }

  const blob = await downscale(file);
  if (blob.size > MAX_BYTES) {
    return { ok: false, error: "That image is too large — keep it under 5MB." };
  }

  const ext = blob.type === "image/jpeg" ? "jpg" : blob.type.split("/")[1];
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from(ALERT_MEDIA_BUCKET)
    .upload(path, blob, { contentType: blob.type, upsert: false });
  if (error) return { ok: false, error: "Upload failed. Please try again." };

  const { data } = supabase.storage.from(ALERT_MEDIA_BUCKET).getPublicUrl(path);
  return { ok: true, url: data.publicUrl, path };
}

/**
 * Remove an uploaded object whose alert insert then failed, so a rejected post
 * doesn't leave an orphan behind. Best effort.
 */
export async function removeAlertImage(
  supabase: SupabaseClient,
  path: string,
): Promise<void> {
  try {
    await supabase.storage.from(ALERT_MEDIA_BUCKET).remove([path]);
  } catch {
    // Nothing the user can do about it, and the post already failed.
  }
}
