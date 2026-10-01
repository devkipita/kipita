import { createClient } from "@/lib/supabase/server";
import {
  CASE_COLUMNS,
  MESSAGE_COLUMNS,
  type SupportCase,
  type SupportMessage,
} from "./types";

export interface AdminSupportCase extends SupportCase {
  user_id: string;
  user_name: string;
  user_avatar: string | null;
  last_from_support: boolean | null;
  message_count: number;
}

function toCase(raw: unknown): AdminSupportCase {
  const row = raw as Record<string, unknown>;
  const user = Array.isArray(row.user) ? row.user[0] : row.user;
  const person = (user ?? {}) as Record<string, unknown>;

  return {
    id: row.id as string,
    booking_id: (row.booking_id as string | null) ?? null,
    category: (row.category as string) ?? "general",
    subject: (row.subject as string) ?? "",
    detail: (row.detail as string) ?? "",
    status: row.status as SupportCase["status"],
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    user_id: (row.user_id as string) ?? "",
    user_name: (person.full_name as string) || "Kipita user",
    user_avatar: (person.avatar_url as string | null) ?? null,
    last_from_support: null,
    message_count: 0,
  };
}

export async function fetchAdminCases(): Promise<AdminSupportCase[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("support_cases")
      .select(`${CASE_COLUMNS}, user_id, user:users!user_id ( full_name, avatar_url )`)
      .order("updated_at", { ascending: false })
      .limit(100);

    if (error || !data) return [];
    return data.map(toCase);
  } catch {
    return [];
  }
}

export async function fetchAdminMessages(
  caseId: string,
): Promise<SupportMessage[]> {
  try {
    const supabase = await createClient();
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
  } catch {
    return [];
  }
}
