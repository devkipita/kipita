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
