"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { MESSAGE_COLUMNS, type SupportCaseStatus, type SupportMessage } from "./types";

export type AdminMessageResult =
  | { ok: true; message: SupportMessage }
  | { ok: false; error: string };

export type AdminPlainResult = { ok: true } | { ok: false; error: string };

const BODY_MAX = 2000;

async function requireAdminId(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<{ id: string } | { error: string }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in as an admin." };

  const { data } = await supabase
    .from("users")
    .select("id, is_admin")
    .eq("auth_id", user.id)
    .maybeSingle();

  if (!data?.is_admin) return { error: "Admins only." };
  return { id: data.id as string };
}

export async function adminReplyAction(
  caseId: string,
  body: string,
): Promise<AdminMessageResult> {
  const text = body.trim().slice(0, BODY_MAX);
  if (!text) return { ok: false, error: "Type a reply first." };

  const supabase = await createClient();
  const admin = await requireAdminId(supabase);
  if ("error" in admin) return { ok: false, error: admin.error };

  const { data, error } = await supabase
    .from("support_case_messages")
    .insert({
      case_id: caseId,
      author_id: admin.id,
      from_support: true,
      body: text,
    })
    .select(MESSAGE_COLUMNS)
    .maybeSingle();

  if (error || !data) {
    return { ok: false, error: "That didn't send. Please try again." };
  }

  revalidatePath("/admin/support");

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
      image_url: null,
    },
  };
}

export async function adminSetCaseStatusAction(
  caseId: string,
  status: SupportCaseStatus,
): Promise<AdminPlainResult> {
  const supabase = await createClient();
  const admin = await requireAdminId(supabase);
  if ("error" in admin) return { ok: false, error: admin.error };

  const { data, error } = await supabase
    .from("support_cases")
    .update({ status })
    .eq("id", caseId)
    .select("id");

  if (error || !data || data.length === 0) {
    return { ok: false, error: "We couldn't update that case." };
  }

  revalidatePath("/admin/support");
  return { ok: true };
}

export async function adminFetchMessagesAction(
  caseId: string,
): Promise<SupportMessage[]> {
  const supabase = await createClient();
  const admin = await requireAdminId(supabase);
  if ("error" in admin) return [];

  const { data, error } = await supabase
    .from("support_case_messages")
    .select(MESSAGE_COLUMNS)
    .eq("case_id", caseId)
    .order("created_at", { ascending: true })
    .limit(200);

  if (error || !data) return [];

  return data.map((raw) => {
    const row = raw as Record<string, unknown>;
    return {
      id: row.id as string,
      case_id: row.case_id as string,
      author_id: (row.author_id as string | null) ?? null,
      from_support: Boolean(row.from_support),
      body: (row.body as string) ?? "",
      image_path: (row.image_path as string | null) ?? null,
      created_at: row.created_at as string,
      image_url: null,
    };
  });
}
