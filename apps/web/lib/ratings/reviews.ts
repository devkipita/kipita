import type { SupabaseClient } from "@supabase/supabase-js";

export type Review = {
  id: string;
  score: number;
  comment: string | null;
  created_at: string;
  author: { full_name: string | null; avatar_url: string | null } | null;
};

export type ReviewSummary = {
  reviews: Review[];
  count: number;
  average: number | null;
  byScore: Record<1 | 2 | 3 | 4 | 5, number>;
};

const LIMIT = 100;

export async function fetchReviews(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ ok: true; data: ReviewSummary } | { ok: false; error: string }> {
  const { data, error } = await supabase
    .from("ratings")
    .select("id, score, comment, created_at, author:users!ratings_from_user_id_fkey ( full_name, avatar_url )")
    .eq("to_user_id", userId)
    .order("created_at", { ascending: false })
    .limit(LIMIT);

  if (error) return { ok: false, error: "Couldn't load reviews." };

  const reviews = (data ?? []).map((row) => ({
    id: row.id as string,
    score: Number(row.score),
    comment: (row.comment as string | null)?.trim() || null,
    created_at: row.created_at as string,
    author: (Array.isArray(row.author) ? row.author[0] : row.author) ?? null,
  })) as Review[];

  const byScore: ReviewSummary["byScore"] = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let total = 0;
  for (const r of reviews) {
    const s = Math.min(5, Math.max(1, Math.round(r.score))) as 1 | 2 | 3 | 4 | 5;
    byScore[s] += 1;
    total += r.score;
  }

  return {
    ok: true,
    data: {
      reviews,
      count: reviews.length,
      average: reviews.length ? Math.round((total / reviews.length) * 10) / 10 : null,
      byScore,
    },
  };
}

export function shortName(full: string | null | undefined): string {
  const parts = (full ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "Kipita rider";
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`;
}
