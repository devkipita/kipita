"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { alertSchema, commentSchema } from "@/lib/validators/home";
import type { AlertInput } from "@/lib/validators/home";
import { LIMITS, rateLimit, retryMessage } from "@/lib/security/rate-limit";

/**
 * Posting alerts and comments.
 *
 * Server actions because both carry untrusted free text, `category` has to be
 * validated against the enum (Postgres would otherwise surface a raw
 * `invalid input value for enum` to the user), and the owner id must come from
 * the session rather than the client.
 */

export type AlertResult = { ok: true; id: string } | { ok: false; error: string };
export type CommentResult = { ok: true } | { ok: false; error: string };

const PROFILE_NOT_READY =
  "Your profile isn't ready yet. Sign out and back in, then try again.";

async function resolveUserId(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<{ userId: string } | { error: string }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in to post." };

  const { data } = await supabase
    .from("users")
    .select("id")
    .eq("auth_id", user.id)
    .maybeSingle();
  if (!data) return { error: PROFILE_NOT_READY };

  return { userId: data.id as string };
}

export async function createAlertAction(input: AlertInput): Promise<AlertResult> {
  const parsed = alertSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the details" };
  }

  const supabase = await createClient();
  const session = await resolveUserId(supabase);
  if ("error" in session) return { ok: false, error: session.error };

  const gate = rateLimit(
    `alert:${session.userId}`,
    LIMITS.postAlert.limit,
    LIMITS.postAlert.windowMs,
  );
  if (!gate.ok) return { ok: false, error: retryMessage(gate.retryAfterMs) };

  const { category, location, content, image_url, lat, lng } = parsed.data;
  const { data, error } = await supabase
    .from("announcements")
    .insert({
      user_id: session.userId,
      category,
      location,
      content,
      image_url: image_url ?? null,
      lat: lat ?? null,
      lng: lng ?? null,
    })
    .select("id")
    .maybeSingle();

  if (error || !data) {
    return { ok: false, error: "We couldn't post that alert. Please try again." };
  }

  revalidatePath("/alerts");
  revalidatePath("/home");
  return { ok: true, id: data.id as string };
}

/**
 * Edits are allowed for five minutes. The window lives in the RLS policy from
 * migration 022, not here — a client-side timer is a hint, not a rule. A zero
 * row count therefore means the window closed.
 */
export async function updateAlertAction(
  alertId: string,
  input: AlertInput,
): Promise<AlertResult> {
  const parsed = alertSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the details" };
  }

  const supabase = await createClient();
  const session = await resolveUserId(supabase);
  if ("error" in session) return { ok: false, error: session.error };

  const { category, location, content, image_url, lat, lng } = parsed.data;
  const { data, error } = await supabase
    .from("announcements")
    .update({
      category,
      location,
      content,
      image_url: image_url ?? null,
      lat: lat ?? null,
      lng: lng ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", alertId)
    .select("id");

  if (error) {
    return { ok: false, error: "We couldn't save that change. Please try again." };
  }
  if (!data || data.length === 0) {
    return { ok: false, error: "That alert can no longer be edited." };
  }

  revalidatePath(`/alerts/${alertId}`);
  revalidatePath("/alerts");
  return { ok: true, id: alertId };
}

export async function deleteAlertAction(alertId: string): Promise<CommentResult> {
  const supabase = await createClient();
  const session = await resolveUserId(supabase);
  if ("error" in session) return { ok: false, error: session.error };

  const { data, error } = await supabase
    .from("announcements")
    .delete()
    .eq("id", alertId)
    .select("id");

  if (error) {
    return { ok: false, error: "We couldn't delete that alert. Please try again." };
  }
  if (!data || data.length === 0) {
    return { ok: false, error: "That alert can no longer be deleted." };
  }

  revalidatePath("/alerts");
  revalidatePath("/home");
  return { ok: true };
}

export async function addCommentAction(
  alertId: string,
  content: string,
): Promise<CommentResult> {
  const parsed = commentSchema.safeParse({ alert_id: alertId, content });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check your comment" };
  }

  const supabase = await createClient();
  const session = await resolveUserId(supabase);
  if ("error" in session) return { ok: false, error: session.error };

  const gate = rateLimit(
    `comment:${session.userId}`,
    LIMITS.comment.limit,
    LIMITS.comment.windowMs,
  );
  if (!gate.ok) return { ok: false, error: retryMessage(gate.retryAfterMs) };

  const { error } = await supabase.from("alert_comments").insert({
    alert_id: parsed.data.alert_id,
    user_id: session.userId,
    content: parsed.data.content,
  });

  if (error) {
    return { ok: false, error: "We couldn't post that comment. Please try again." };
  }

  revalidatePath(`/alerts/${alertId}`);
  revalidatePath("/alerts");
  return { ok: true };
}
