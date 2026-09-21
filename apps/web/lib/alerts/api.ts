import type { SupabaseClient } from "@supabase/supabase-js";
import {
  ALERT_SELECT,
  COMMENT_SELECT,
  type Alert,
  type AlertAuthor,
  type AlertCategory,
  type AlertComment,
} from "./types";

/**
 * Road-alert reads and the two optimistic toggles.
 *
 * Reads throw (the `lib/faqs.ts` / `lib/notifications/api.ts` convention) so the
 * caller can render a real error state. There is no mock fallback: mobile's
 * `fetchAlerts` substitutes seed data on *error* as well as on empty, which
 * turns an RLS failure into a healthy-looking feed — migration 012 exists
 * because exactly that went unnoticed.
 *
 * Every `user_id` here is `users.id`, never `auth_id`.
 */

const PAGE_SIZE = 20;

function one<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function toAlert(raw: unknown, reaction: string | null = null): Alert {
  const row = raw as Record<string, unknown>;
  return {
    id: row.id as string,
    user_id: row.user_id as string,
    location: (row.location as string) ?? "",
    category: (row.category as AlertCategory) ?? "general",
    content: (row.content as string) ?? "",
    image_url: (row.image_url as string | null) ?? null,
    reactions_count: Number(row.reactions_count ?? 0),
    comments_count: Number(row.comments_count ?? 0),
    created_at: row.created_at as string,
    user: one(row.user as AlertAuthor | AlertAuthor[] | null),
    user_reaction: reaction,
  };
}

function toComment(raw: unknown, liked = false): AlertComment {
  const row = raw as Record<string, unknown>;
  return {
    id: row.id as string,
    alert_id: row.alert_id as string,
    user_id: row.user_id as string,
    content: (row.content as string) ?? "",
    image_url: (row.image_url as string | null) ?? null,
    likes_count: Number(row.likes_count ?? 0),
    created_at: row.created_at as string,
    user: one(row.user as AlertAuthor | AlertAuthor[] | null),
    liked_by_me: liked,
  };
}

/**
 * The caller's own reactions for a page of alerts.
 *
 * Mobile never fetches this, which is why a reaction there vanishes on reload.
 * Two queries rather than a filtered embedded join: embedded-resource filtering
 * semantics vary between PostgREST versions and can silently drop parent rows,
 * and the id list is already bounded by the page size.
 *
 * `alert_reactions` RLS is `FOR ALL USING (own row)`, so this can only ever
 * return the caller's own reactions regardless of what is asked for.
 */
export async function fetchMyReactions(
  supabase: SupabaseClient,
  alertIds: string[],
  viewerId: string,
): Promise<Map<string, string>> {
  if (alertIds.length === 0) return new Map();

  const { data, error } = await supabase
    .from("alert_reactions")
    .select("alert_id, reaction")
    .eq("user_id", viewerId)
    .in("alert_id", alertIds);

  if (error) throw error;
  return new Map(
    (data ?? []).map((row) => [row.alert_id as string, row.reaction as string]),
  );
}

export async function fetchAlerts(
  supabase: SupabaseClient,
  opts: {
    limit?: number;
    offset?: number;
    category?: AlertCategory | null;
    viewerId?: string | null;
  } = {},
): Promise<Alert[]> {
  const { limit = PAGE_SIZE, offset = 0, category, viewerId } = opts;

  let query = supabase
    .from("announcements")
    .select(ALERT_SELECT)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (category) query = query.eq("category", category);

  const { data, error } = await query;
  if (error) throw error;

  const alerts = (data ?? []).map((row) => toAlert(row));
  if (!viewerId || alerts.length === 0) return alerts;

  const mine = await fetchMyReactions(
    supabase,
    alerts.map((a) => a.id),
    viewerId,
  );
  return alerts.map((a) => ({ ...a, user_reaction: mine.get(a.id) ?? null }));
}

export async function fetchAlert(
  supabase: SupabaseClient,
  id: string,
  viewerId?: string | null,
): Promise<Alert | null> {
  const { data, error } = await supabase
    .from("announcements")
    .select(ALERT_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  if (!viewerId) return toAlert(data);
  const mine = await fetchMyReactions(supabase, [id], viewerId);
  return toAlert(data, mine.get(id) ?? null);
}

export async function fetchAlertComments(
  supabase: SupabaseClient,
  alertId: string,
  viewerId?: string | null,
  limit = 200,
): Promise<AlertComment[]> {
  const { data, error } = await supabase
    .from("alert_comments")
    .select(COMMENT_SELECT)
    .eq("alert_id", alertId)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) throw error;

  const comments = (data ?? []).map((row) => toComment(row));
  if (!viewerId || comments.length === 0) return comments;

  const { data: likes, error: likeError } = await supabase
    .from("comment_likes")
    .select("comment_id")
    .eq("user_id", viewerId)
    .in(
      "comment_id",
      comments.map((c) => c.id),
    );
  if (likeError) throw likeError;

  const liked = new Set((likes ?? []).map((l) => l.comment_id as string));
  return comments.map((c) => ({ ...c, liked_by_me: liked.has(c.id) }));
}

/**
 * Set or clear the caller's reaction. `null` clears it.
 *
 * Deliberately a browser-client write rather than a server action: it is
 * idempotent, PK-constrained, carries no free text, and is fully bounded by
 * RLS. Routing each tap through `revalidatePath` would re-render the page and
 * make the control feel dead — the same reasoning as `markRead` in
 * `lib/notifications/store.ts`.
 */
export async function reactToAlert(
  supabase: SupabaseClient,
  alertId: string,
  userId: string,
  reaction: string | null,
): Promise<void> {
  if (!reaction) {
    const { error } = await supabase
      .from("alert_reactions")
      .delete()
      .match({ alert_id: alertId, user_id: userId });
    if (error) throw error;
    return;
  }

  const { error } = await supabase
    .from("alert_reactions")
    .upsert(
      { alert_id: alertId, user_id: userId, reaction },
      { onConflict: "alert_id,user_id" },
    );
  if (error) throw error;
}

export async function setCommentLike(
  supabase: SupabaseClient,
  commentId: string,
  userId: string,
  liked: boolean,
): Promise<void> {
  if (!liked) {
    const { error } = await supabase
      .from("comment_likes")
      .delete()
      .match({ comment_id: commentId, user_id: userId });
    if (error) throw error;
    return;
  }

  const { error } = await supabase
    .from("comment_likes")
    .upsert(
      { comment_id: commentId, user_id: userId },
      { onConflict: "comment_id,user_id" },
    );
  if (error) throw error;
}
