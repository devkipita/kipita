import type { SupabaseClient } from "@supabase/supabase-js";
import {
  CASE_COLUMNS,
  MESSAGE_COLUMNS,
  type SupportCase,
  type SupportMessage,
} from "./types";

/**
 * Browser-side reads for the support dock.
 *
 * `support_cases` and `support_case_messages` are both RLS'd to their owner, so
 * none of these need a user filter — asking for everything returns only what
 * the caller may see.
 */

export const SUPPORT_BUCKET = "support-media";
const SIGNED_TTL = 60 * 60;

function toCase(raw: unknown): SupportCase {
  const row = raw as Record<string, unknown>;
  return {
    id: row.id as string,
    booking_id: (row.booking_id as string | null) ?? null,
    category: (row.category as string) ?? "general",
    subject: (row.subject as string) ?? "",
    detail: (row.detail as string) ?? "",
    status: row.status as SupportCase["status"],
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

function toMessage(raw: unknown): SupportMessage {
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
}

export async function fetchCases(
  supabase: SupabaseClient,
): Promise<SupportCase[]> {
  const { data, error } = await supabase
    .from("support_cases")
    .select(CASE_COLUMNS)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error || !data) return [];
  return data.map(toCase);
}

/**
 * Attachments live in a private bucket, so each one is signed on read rather
 * than stored as a URL. Signing is batched — one round trip for the thread.
 */
async function signImages(
  supabase: SupabaseClient,
  messages: SupportMessage[],
): Promise<SupportMessage[]> {
  const paths = messages
    .map((m) => m.image_path)
    .filter((p): p is string => Boolean(p));
  if (paths.length === 0) return messages;

  try {
    const { data } = await supabase.storage
      .from(SUPPORT_BUCKET)
      .createSignedUrls(paths, SIGNED_TTL);

    const byPath = new Map(
      (data ?? []).map((d) => [d.path ?? "", d.signedUrl ?? null]),
    );
    return messages.map((m) =>
      m.image_path ? { ...m, image_url: byPath.get(m.image_path) ?? null } : m,
    );
  } catch {
    // A missing picture is not worth failing the thread for.
    return messages;
  }
}

export async function fetchMessages(
  supabase: SupabaseClient,
  caseId: string,
): Promise<SupportMessage[]> {
  const { data, error } = await supabase
    .from("support_case_messages")
    .select(MESSAGE_COLUMNS)
    .eq("case_id", caseId)
    .order("created_at", { ascending: true })
    .limit(200);

  if (error || !data) return [];
  return signImages(supabase, data.map(toMessage));
}

export async function signOne(
  supabase: SupabaseClient,
  message: SupportMessage,
): Promise<SupportMessage> {
  const [signed] = await signImages(supabase, [message]);
  return signed ?? message;
}

/** Live staff replies. Returns an unsubscribe. */
export function subscribeToCase(
  supabase: SupabaseClient,
  caseId: string,
  onMessage: (message: SupportMessage) => void,
): () => void {
  const channel = supabase
    .channel(`support:${caseId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "support_case_messages",
        filter: `case_id=eq.${caseId}`,
      },
      (payload) => onMessage(toMessage(payload.new)),
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}
