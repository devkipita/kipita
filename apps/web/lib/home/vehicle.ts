import type { SupabaseClient } from "@supabase/supabase-js";

export const VEHICLE_BUCKET = "vehicle-media";

const MAX_BYTES = 5 * 1024 * 1024;
const MAX_EDGE = 1600;
const QUALITY = 0.84;

export type VehicleUpload =
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

export async function uploadVehiclePhoto(
  supabase: SupabaseClient,
  file: File,
  userId: string,
): Promise<VehicleUpload> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
    return { ok: false, error: "Use a JPG, PNG or WebP photo." };
  }

  const blob = await downscale(file);
  if (blob.size > MAX_BYTES) {
    return { ok: false, error: "That photo is too large — keep it under 5MB." };
  }

  const ext = blob.type === "image/jpeg" ? "jpg" : blob.type.split("/")[1];
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from(VEHICLE_BUCKET)
    .upload(path, blob, { contentType: blob.type, upsert: false });
  if (error) return { ok: false, error: "Upload failed. Please try again." };

  const { data } = supabase.storage.from(VEHICLE_BUCKET).getPublicUrl(path);
  return { ok: true, url: data.publicUrl, path };
}

export async function removeVehiclePhoto(
  supabase: SupabaseClient,
  path: string,
): Promise<void> {
  try {
    await supabase.storage.from(VEHICLE_BUCKET).remove([path]);
  } catch {
    /* the post already failed; nothing the driver can do */
  }
}

export type DriverVehicle = {
  id: string;
  make: string | null;
  model: string | null;
  color: string | null;
  image_url: string | null;
};

export async function fetchMyVehicle(
  supabase: SupabaseClient,
  userId: string,
): Promise<DriverVehicle | null> {
  const { data, error } = await supabase
    .from("vehicles")
    .select("id, make, model, color, image_url")
    .eq("driver_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return data as DriverVehicle;
}
