import * as FileSystem from "expo-file-system/legacy";
import { supabase } from "@/lib/supabase";
import type { MessageAttachmentType } from "@/types";

const BUCKET = "chat-media";

/** Minimal base64 → Uint8Array decoder (RN has no global atob). */
const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
function base64ToBytes(b64: string): Uint8Array {
  const clean = b64.replace(/[^A-Za-z0-9+/]/g, "");
  const len = clean.length;
  const bytes = new Uint8Array((len * 3) >> 2);
  let p = 0;
  for (let i = 0; i < len; i += 4) {
    const e1 = B64.indexOf(clean[i]);
    const e2 = B64.indexOf(clean[i + 1]);
    const e3 = B64.indexOf(clean[i + 2]);
    const e4 = B64.indexOf(clean[i + 3]);
    bytes[p++] = (e1 << 2) | (e2 >> 4);
    if (e3 !== -1) bytes[p++] = ((e2 & 15) << 4) | (e3 >> 2);
    if (e4 !== -1) bytes[p++] = ((e3 & 3) << 6) | e4;
  }
  return bytes;
}

function extAndMime(kind: MessageAttachmentType, uri: string): { ext: string; mime: string } {
  if (kind === "audio") {
    const ext = uri.split(".").pop()?.toLowerCase();
    if (ext === "mp3") return { ext: "mp3", mime: "audio/mpeg" };
    if (ext === "aac") return { ext: "aac", mime: "audio/aac" };
    return { ext: "m4a", mime: "audio/m4a" };
  }
  return { ext: "jpg", mime: "image/jpeg" };
}

/**
 * Upload a local file (image or voice note) to the public `chat-media` bucket
 * and return its public URL. GIFs are already remote URLs and skip this.
 *
 * Files are stored under `<userId>/...` so the per-user RLS policy applies.
 */
export async function uploadChatMedia(
  localUri: string,
  userId: string,
  kind: MessageAttachmentType,
): Promise<string> {
  const { ext, mime } = extAndMime(kind, localUri);
  // Unique per-user path: <uid>/<timestamp>-<source-basename>.<ext>
  const base = (localUri.split(/[\\/]/).pop() ?? "file").replace(/\.[^.]+$/, "");
  const path = `${userId}/${Date.now()}-${base}.${ext}`;

  const base64 = await FileSystem.readAsStringAsync(localUri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const bytes = base64ToBytes(base64);

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, bytes, { contentType: mime, upsert: false });
  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
