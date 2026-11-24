"use server";

import { revalidatePath } from "next/cache";
import { resolveAppUser } from "@/lib/auth/app-user";
import { createClient } from "@/lib/supabase/server";
import { LIMITS, rateLimit, retryMessage } from "@/lib/security/rate-limit";
import { MESSAGE_COLUMNS, type SupportMessage } from "./types";

export type CaseResult = { ok: true; id: string } | { ok: false; error: string };
export type PlainResult = { ok: true } | { ok: false; error: string };
export type MessageResult =
  | { ok: true; message: SupportMessage }
  | { ok: false; error: string };

const SUBJECT_MAX = 120;
const DETAIL_MAX = 2000;
const MIN_DETAIL = 10;

async function resolveUserId(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<{ userId: string } | { error: string }> {
  const { user, id } = await resolveAppUser(supabase);
  if (!user) return { error: "Sign in to contact support." };
  if (!id) return { error: "Your profile isn't ready yet. Sign out and back in." };
  return { userId: id };
}

/** The signed-in caller's `users.id`, needed before uploading an attachment. */
export async function currentSupportUserId(): Promise<string | null> {
  const supabase = await createClient();
  const session = await resolveUserId(supabase);
  return "error" in session ? null : session.userId;
}

export async function openSupportCaseAction(input: {
  subject: string;
  detail: string;
  category?: string;
  bookingId?: string | null;
}): Promise<CaseResult> {
  const subject = input.subject.trim().slice(0, SUBJECT_MAX);
  const detail = input.detail.trim().slice(0, DETAIL_MAX);

  if (subject.length < 3) return { ok: false, error: "Tell us what happened." };
  if (detail.length < MIN_DETAIL) {
    return { ok: false, error: "Add a little more detail so we can help." };
  }

  const supabase = await createClient();
  const session = await resolveUserId(supabase);
  if ("error" in session) return { ok: false, error: session.error };

  const gate = rateLimit(
    `support:${session.userId}`,
    LIMITS.comment.limit,
    LIMITS.comment.windowMs,
  );
  if (!gate.ok) return { ok: false, error: retryMessage(gate.retryAfterMs) };

  const { data, error } = await supabase.rpc("open_support_case", {
    p_subject: subject,
    p_detail: detail,
    p_category: input.category ?? "general",
    p_booking_id: input.bookingId ?? null,
  });

  if (error || typeof data !== "string") {
    return { ok: false, error: "We couldn't open that case. Please try again." };
  }

  const caseId = data;
  revalidatePath("/trips");
  return { ok: true, id: caseId };
}

export async function closeSupportCaseAction(caseId: string): Promise<PlainResult> {
  const supabase = await createClient();
  const session = await resolveUserId(supabase);
  if ("error" in session) return { ok: false, error: session.error };

  const { data, error } = await supabase
    .from("support_cases")
    .update({ status: "resolved" })
    .eq("id", caseId)
    .select("id");

  if (error) {
    return { ok: false, error: "We couldn't close that case. Please try again." };
  }
  if (!data || data.length === 0) {
    return { ok: false, error: "That case is no longer open." };
  }

  revalidatePath("/trips");
  return { ok: true };
}

export async function sendSupportMessageAction(
  caseId: string,
  body: string,
  imagePath?: string | null,
): Promise<MessageResult> {
  const text = body.trim().slice(0, DETAIL_MAX);
  if (!text && !imagePath) {
    return { ok: false, error: "Type a message or attach a picture." };
  }

  const supabase = await createClient();
  const session = await resolveUserId(supabase);
  if ("error" in session) return { ok: false, error: session.error };

  const gate = rateLimit(
    `support-msg:${session.userId}`,
    LIMITS.comment.limit,
    LIMITS.comment.windowMs,
  );
  if (!gate.ok) return { ok: false, error: retryMessage(gate.retryAfterMs) };

  const { data, error } = await supabase
    .from("support_case_messages")
    .insert({
      case_id: caseId,
      author_id: session.userId,
      body: text,
      image_path: imagePath ?? null,
    })
    .select(MESSAGE_COLUMNS)
    .maybeSingle();

  if (error || !data) {
    return { ok: false, error: "That didn't send. Please try again." };
  }

  const row = data as Record<string, unknown>;
  return {
    ok: true,
    message: {
      id: row.id as string,
      case_id: row.case_id as string,
      author_id: (row.author_id as string | null) ?? null,
      from_support: Boolean(row.from_support),
      body: (row.body as string) ?? "",
      image_path: (row.image_path as string | null) ?? null,
      created_at: row.created_at as string,
    },
  };
}
