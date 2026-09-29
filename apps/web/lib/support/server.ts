import { createClient } from "@/lib/supabase/server";
import { CASE_COLUMNS, type SupportCase } from "./types";

/**
 * Server read that seeds the dock on every signed-in page. RLS scopes
 * `support_cases` to the caller, so this needs no user filter.
 */
export async function fetchOpenSupportCases(): Promise<SupportCase[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("support_cases")
      .select(CASE_COLUMNS)
      .neq("status", "resolved")
      .order("created_at", { ascending: false })
      .limit(10);

    if (error || !data) return [];
    return data.map((row) => {
      const r = row as Record<string, unknown>;
      return {
        id: r.id as string,
        booking_id: (r.booking_id as string | null) ?? null,
        category: (r.category as string) ?? "general",
        subject: (r.subject as string) ?? "",
        detail: (r.detail as string) ?? "",
        status: r.status as SupportCase["status"],
        created_at: r.created_at as string,
        updated_at: r.updated_at as string,
      };
    });
  } catch {
    return [];
  }
}
