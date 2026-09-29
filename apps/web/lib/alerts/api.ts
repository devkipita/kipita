import type { SupabaseClient } from "@supabase/supabase-js";
import {
  ALERT_SELECT,
  ALERT_SELECT_LEGACY,
  COMMENT_SELECT,
  type Alert,
  type AlertAuthor,
  type AlertCategory,
  type AlertComment,
  type ConfirmKind,
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

/**
 * Whether `announcements.views_count` exists. Assumed present, demoted on the
 * first `42703`, so a database still on migration 022 serves a working feed and
 * picks the column up on its own once 023 lands — no redeploy.
 */
let viewsColumn = true;

export function alertSelect(): string {
  return viewsColumn ? ALERT_SELECT : ALERT_SELECT_LEGACY;
}

type QueryError = { code?: string; message?: string } | null;

function missingViewsColumn(error: QueryError): boolean {
  if (!error) return false;
  return error.code === "42703" && /views_count/i.test(error.message ?? "");
}

/** Runs a select, retrying once without `views_count` if that column is absent. */
async function withViewsFallback<T>(
  run: (select: string) => PromiseLike<{ data: T | null; error: QueryError }>,
): Promise<T | null> {
  let result = await run(alertSelect());

  if (missingViewsColumn(result.error)) {
    viewsColumn = false;
    result = await run(alertSelect());
  }

  if (result.error) throw result.error;
  return result.data;
}

function one<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function num(value: unknown): number | null {
  const n = typeof value === "string" ? Number(value) : value;
  return typeof n === "number" && Number.isFinite(n) ? n : null;
}

function toAlert(
  raw: unknown,
  reaction: string | null = null,
  confirmation: ConfirmKind | null = null,
  saved = false,
): Alert {
  const row = raw as Record<string, unknown>;
  return {
    id: row.id as string,
    user_id: row.user_id as string,
    location: (row.location as string) ?? "",
    category: (row.category as AlertCategory) ?? "general",
    content: (row.content as string) ?? "",
    image_url: (row.image_url as string | null) ?? null,
    lat: num(row.lat),
    lng: num(row.lng),
    reactions_count: Number(row.reactions_count ?? 0),
    comments_count: Number(row.comments_count ?? 0),
    confirms_count: Number(row.confirms_count ?? 0),
    cleared_count: Number(row.cleared_count ?? 0),
    views_count: Number(row.views_count ?? 0),
    created_at: row.created_at as string,
    updated_at: (row.updated_at as string) ?? (row.created_at as string),
    user: one(row.user as AlertAuthor | AlertAuthor[] | null),
    user_reaction: reaction,
    my_confirmation: confirmation,
    saved_by_me: saved,
    distance_km: null,
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

  const data = await withViewsFallback<unknown[]>((select) => {
    let query = supabase
      .from("announcements")
      .select(select)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (category) query = query.eq("category", category);
    return query as unknown as PromiseLike<{ data: unknown[] | null; error: QueryError }>;
  });

  const alerts = (data ?? []).map((row) => toAlert(row));
  if (!viewerId || alerts.length === 0) return alerts;

  const ids = alerts.map((a) => a.id);
  const [reactions, confirmations, saves] = await Promise.all([
    fetchMyReactions(supabase, ids, viewerId),
    fetchMyConfirmations(supabase, ids, viewerId),
    fetchMySaves(supabase, ids, viewerId),
  ]);

  return alerts.map((a) => ({
    ...a,
    user_reaction: reactions.get(a.id) ?? null,
    my_confirmation: confirmations.get(a.id) ?? null,
    saved_by_me: saves.has(a.id),
  }));
}

/** The caller's own Still-there / Cleared votes for a page of alerts. */
export async function fetchMyConfirmations(
  supabase: SupabaseClient,
  alertIds: string[],
  viewerId: string,
): Promise<Map<string, ConfirmKind>> {
  if (alertIds.length === 0) return new Map();

  const { data, error } = await supabase
    .from("alert_confirmations")
    .select("alert_id, kind")
    .eq("user_id", viewerId)
    .in("alert_id", alertIds);

  if (error) throw error;
  return new Map(
    (data ?? []).map((row) => [row.alert_id as string, row.kind as ConfirmKind]),
  );
}

export async function fetchMySaves(
  supabase: SupabaseClient,
  alertIds: string[],
  viewerId: string,
): Promise<Set<string>> {
  if (alertIds.length === 0) return new Set();

  const { data, error } = await supabase
    .from("alert_saves")
    .select("alert_id")
    .eq("user_id", viewerId)
    .in("alert_id", alertIds);

  if (error) throw error;
  return new Set((data ?? []).map((row) => row.alert_id as string));
}

/**
 * Record, flip or clear the caller's road vote. `null` withdraws it.
 *
 * The counter trigger recomputes both totals from scratch on insert, update and
 * delete, so a flip cannot desynchronise them.
 */
export async function confirmAlert(
  supabase: SupabaseClient,
  alertId: string,
  userId: string,
  kind: ConfirmKind | null,
): Promise<void> {
  if (!kind) {
    const { error } = await supabase
      .from("alert_confirmations")
      .delete()
      .match({ alert_id: alertId, user_id: userId });
    if (error) throw error;
    return;
  }

  const { error } = await supabase
    .from("alert_confirmations")
    .upsert(
      { alert_id: alertId, user_id: userId, kind },
      { onConflict: "alert_id,user_id" },
    );
  if (error) throw error;
}

export async function setAlertSaved(
  supabase: SupabaseClient,
  alertId: string,
  userId: string,
  saved: boolean,
): Promise<void> {
  if (!saved) {
    const { error } = await supabase
      .from("alert_saves")
      .delete()
      .match({ alert_id: alertId, user_id: userId });
    if (error) throw error;
    return;
  }

  const { error } = await supabase
    .from("alert_saves")
    .upsert({ alert_id: alertId, user_id: userId }, { onConflict: "alert_id,user_id" });
  if (error) throw error;
}

/**
 * Count one view. The RPC is SECURITY DEFINER because a viewer has no UPDATE
 * grant on someone else's alert, and it is idempotent per person — a second
 * visit returns the running total without adding to it.
 */
export async function recordAlertView(
  supabase: SupabaseClient,
  alertId: string,
): Promise<number | null> {
  const { data, error } = await supabase.rpc("record_alert_view", {
    p_alert_id: alertId,
  });
  if (error) return null;
  return typeof data === "number" ? data : null;
}

export async function fetchFollowing(
  supabase: SupabaseClient,
  viewerId: string,
): Promise<string[]> {
  const { data, error } = await supabase
    .from("user_follows")
    .select("following_id")
    .eq("follower_id", viewerId);

  if (error) throw error;
  return (data ?? []).map((row) => row.following_id as string);
}

export async function setFollowing(
  supabase: SupabaseClient,
  viewerId: string,
  targetId: string,
  following: boolean,
): Promise<void> {
  if (!following) {
    const { error } = await supabase
      .from("user_follows")
      .delete()
      .match({ follower_id: viewerId, following_id: targetId });
    if (error) throw error;
    return;
  }

  const { error } = await supabase
    .from("user_follows")
    .upsert(
      { follower_id: viewerId, following_id: targetId },
      { onConflict: "follower_id,following_id" },
    );
  if (error) throw error;
}

export async function fetchAlert(
  supabase: SupabaseClient,
  id: string,
  viewerId?: string | null,
): Promise<Alert | null> {
  const data = await withViewsFallback<unknown>(
    (select) =>
      supabase
        .from("announcements")
        .select(select)
        .eq("id", id)
        .maybeSingle() as unknown as PromiseLike<{
        data: unknown | null;
        error: QueryError;
      }>,
  );

  if (!data) return null;

  if (!viewerId) return toAlert(data);

  const [reactions, confirmations, saves] = await Promise.all([
    fetchMyReactions(supabase, [id], viewerId),
    fetchMyConfirmations(supabase, [id], viewerId),
    fetchMySaves(supabase, [id], viewerId),
  ]);

  return toAlert(
    data,
    reactions.get(id) ?? null,
    confirmations.get(id) ?? null,
    saves.has(id),
  );
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
