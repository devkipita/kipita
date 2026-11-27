import { cache } from "react";
import { alertStatus } from "@kipita/shared";
import { createClient } from "@/lib/supabase/server";
import { fetchAlert, fetchAlertComments, fetchAlerts } from "./api";
import type { Alert, AlertCategory, AlertComment } from "./types";


const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function fetchAlertsServer(
  opts: { limit?: number; category?: AlertCategory | null } = {},
): Promise<Alert[] | null> {
  try {
    const supabase = await createClient();
    return await fetchAlerts(supabase, opts);
  } catch {
    return null;
  }
}

export const fetchAlertServer = cache(async (id: string): Promise<Alert | null> => {
  if (!UUID.test(id)) return null;
  const supabase = await createClient();
  return fetchAlert(supabase, id);
});

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
  alertId: string;
};

export async function fetchTrendingRoads(limit = 5): Promise<TrendingRoad[]> {
  try {
    const supabase = await createClient();

    const WINDOWS_H = [24, 72, 24 * 14];
    const widest = WINDOWS_H[WINDOWS_H.length - 1]!;
    const since = new Date(Date.now() - widest * 3_600_000).toISOString();

    const result = await supabase
      .from("announcements")
      .select("id, location, category, created_at, confirms_count, cleared_count")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(200);

    if (result.error) return [];
    const all = (result.data ?? []) as Record<string, unknown>[];
    if (all.length === 0) return [];

    let data = all;
    for (const hours of WINDOWS_H) {
      const cutoff = Date.now() - hours * 3_600_000;
      const within = all.filter(
        (row) => new Date(row.created_at as string).getTime() >= cutoff,
      );
      if (within.length > 0) {
        data = within;
        break;
      }
    }

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
      const road = raw.split(/[,–-]/)[0]?.trim();
      if (!road) continue;

      const category = (row.category as string) ?? "general";
      const votes = {
        confirms_count: Number(row.confirms_count ?? 0),
        cleared_count: Number(row.cleared_count ?? 0),
      };
      if (alertStatus(votes) === "cleared") continue;

      const ageHours = Math.max(
        0,
        (now - new Date(row.created_at as string).getTime()) / 3_600_000,
      );
      const recency = 1 / (1 + ageHours / 6);
      const corroboration = 1 + votes.confirms_count * 0.5;
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
