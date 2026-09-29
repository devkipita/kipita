import { createClient } from "@/lib/supabase/server";
import { fetchAlert, fetchAlertComments, fetchAlerts } from "./api";
import type { Alert, AlertCategory, AlertComment } from "./types";

/**
 * Server-side alert reads for first paint.
 *
 * Rows come back with `user_reaction: null` and `liked_by_me: false`; the
 * client corrects those two personal flags on mount. That trade buys a
 * flicker-free render of the content itself, which is what people are here for.
 *
 * `announcements` is world-readable (`"Alerts readable" USING (true)`), so none
 * of this requires a session.
 */

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function fetchAlertsServer(
  opts: { limit?: number; category?: AlertCategory | null } = {},
): Promise<Alert[]> {
  try {
    const supabase = await createClient();
    return await fetchAlerts(supabase, opts);
  } catch {
    // The feed is one band of a larger page — never fail the whole render.
    return [];
  }
}

export async function fetchAlertServer(id: string): Promise<Alert | null> {
  // Postgres throws on a malformed uuid rather than returning nothing.
  if (!UUID.test(id)) return null;
  const supabase = await createClient();
  return fetchAlert(supabase, id);
}

export async function fetchAlertCommentsServer(
  alertId: string,
): Promise<AlertComment[]> {
  if (!UUID.test(alertId)) return [];
  const supabase = await createClient();
  return fetchAlertComments(supabase, alertId);
}

export type TrendingRoad = {
  road: string;
  count: number;
  blurb: string | null;
  /** The alert that best represents this road right now. */
  alertId: string;
};

/**
 * Roads with the most recent activity. Grouped in JS over a bounded window
 * rather than in SQL: `route_interests` is RLS'd to the caller's own rows, so
 * a cross-user aggregate is not reachable from a client key.
 */
export async function fetchTrendingRoads(limit = 5): Promise<TrendingRoad[]> {
  try {
    const supabase = await createClient();

    // Widen the window rather than show nothing. A quiet night should still
    // name the roads worth knowing about; recency decay below keeps an older
    // report from outranking a fresh one once traffic returns.
    const WINDOWS_H = [24, 72, 24 * 14];
    let data: Record<string, unknown>[] | null = null;

    for (const hours of WINDOWS_H) {
      const since = new Date(Date.now() - hours * 3_600_000).toISOString();
      const result = await supabase
        .from("announcements")
        .select("id, location, category, created_at, confirms_count, cleared_count")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(200);

      if (result.error) return [];
      if (result.data && result.data.length > 0) {
        data = result.data as Record<string, unknown>[];
        break;
      }
    }

    if (!data) return [];

    // Severity, recency and corroboration all make a road more worth knowing
    // about. A raw count alone ranks a quiet road with three stale notes above
    // a motorway closure that one person reported ten minutes ago.
    const WEIGHT: Record<string, number> = {
      accident: 3,
      road_closure: 3,
      traffic: 2,
      weather: 2,
      police: 1.5,
      general: 1,
    };

    type Bucket = {
      road: string;
      count: number;
      score: number;
      alertId: string;
      best: number;
      category: string;
    };

    const now = Date.now();
    const buckets = new Map<string, Bucket>();

    for (const row of data) {
      const raw = (row.location as string) ?? "";
      // "Salgaa, Nakuru-Eldoret" and "Salgaa" are the same road to a driver.
      const road = raw.split(/[,–-]/)[0]?.trim();
      if (!road) continue;

      const category = (row.category as string) ?? "general";
      const cleared = Number(row.cleared_count ?? 0);
      if (cleared >= 3) continue;

      const ageHours = Math.max(
        0,
        (now - new Date(row.created_at as string).getTime()) / 3_600_000,
      );
      // Halve the weight roughly every 6 hours.
      const recency = 1 / (1 + ageHours / 6);
      const corroboration = 1 + Number(row.confirms_count ?? 0) * 0.5;
      const score = (WEIGHT[category] ?? 1) * recency * corroboration;

      const key = road.toLowerCase();
      const entry = buckets.get(key);
      if (!entry) {
        buckets.set(key, {
          road,
          count: 1,
          score,
          alertId: row.id as string,
          best: score,
          category,
        });
        continue;
      }

      entry.count += 1;
      entry.score += score;
      if (score > entry.best) {
        entry.best = score;
        entry.alertId = row.id as string;
        entry.category = category;
      }
    }

    return [...buckets.values()]
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((e) => ({
        road: e.road,
        count: e.count,
        blurb: null,
        alertId: e.alertId,
      }));
  } catch {
    return [];
  }
}

export type AsideFaq = { id: string; question: string; answer: string };

export async function fetchAlertFaqs(limit = 4): Promise<AsideFaq[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("faqs")
      .select("id, question, answer")
      .eq("is_published", true)
      .order("sort_order", { ascending: true })
      .limit(limit);

    if (error || !data) return [];
    return data.map((row) => ({
      id: row.id as string,
      question: row.question as string,
      answer: row.answer as string,
    }));
  } catch {
    return [];
  }
}

export async function fetchFollowingServer(viewerId: string): Promise<string[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("user_follows")
      .select("following_id")
      .eq("follower_id", viewerId);
    if (error || !data) return [];
    return data.map((row) => row.following_id as string);
  } catch {
    return [];
  }
}

export async function fetchRouteTownsServer(viewerId: string): Promise<string[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("route_interests")
      .select("from_location, to_location")
      .eq("user_id", viewerId)
      .order("last_searched_at", { ascending: false })
      .limit(5);

    if (error || !data) return [];
    const towns = new Set<string>();
    for (const row of data) {
      if (row.from_location) towns.add(row.from_location as string);
      if (row.to_location) towns.add(row.to_location as string);
    }
    return [...towns];
  } catch {
    return [];
  }
}
