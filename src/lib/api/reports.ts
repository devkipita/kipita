import { supabase } from "@/lib/supabase";

export type ReportType = "lost_item" | "safety" | "user";

export interface CreateReportInput {
  /** The reporting user's profile id (public.users.id). */
  reporterId: string;
  type: ReportType;
  /** Person being reported, when the flow is about someone specific. */
  reportedUserId?: string | null;
  /** Trip/booking the report relates to, when opened from a trip. */
  bookingId?: string | null;
  /** Short category, e.g. "unsafe_driving" or "phone". */
  reason?: string | null;
  description: string;
  /** Optional callback contact the user wants support to use. */
  contact?: string | null;
}

/**
 * File a report (lost item, safety issue, or reporting a person). Inserts into
 * the RLS-protected `reports` table as the current user.
 */
export async function createReport(input: CreateReportInput): Promise<void> {
  const { error } = await supabase.from("reports").insert({
    reporter_id: input.reporterId,
    reported_user_id: input.reportedUserId ?? null,
    booking_id: input.bookingId ?? null,
    type: input.type,
    reason: input.reason ?? null,
    description: input.description.trim(),
    contact: input.contact?.trim() || null,
  });
  if (error) throw error;
}
