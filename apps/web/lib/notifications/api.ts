import type { SupabaseClient } from "@supabase/supabase-js";
import { NOTIFICATION_COLUMNS, type AppNotification } from "./types";

/**
 * Notification reads/writes against `public.notifications`.
 *
 * Every query is scoped to one user id — the `users.id` (not `auth_id`), which
 * is what the table's foreign key and its RLS policy both use. The policy
 * already restricts rows to the caller; the explicit filter keeps the index hot
 * and makes the intent obvious.
 *
 * Unlike mobile there is no mock fallback: an empty result on web is a real
 * empty state.
 */

export const PAGE_SIZE = 30;

export async function fetchNotifications(
  supabase: SupabaseClient,
  userId: string,
  limit = PAGE_SIZE,
  before?: string,
): Promise<AppNotification[]> {
  let query = supabase
    .from("notifications")
    .select(NOTIFICATION_COLUMNS)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (before) query = query.lt("created_at", before);
  const { data, error } = await query;

  if (error) throw error;
  return (data ?? []) as AppNotification[];
}

export async function fetchUnreadCount(
  supabase: SupabaseClient,
  userId: string,
): Promise<number> {
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("read", false);

  if (error) throw error;
  return count ?? 0;
}

export async function markNotificationRead(
  supabase: SupabaseClient,
  id: string,
): Promise<void> {
  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("id", id);
  if (error) throw error;
}

export async function markAllNotificationsRead(
  supabase: SupabaseClient,
  userId: string,
): Promise<void> {
  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("user_id", userId)
    .eq("read", false);
  if (error) throw error;
}
