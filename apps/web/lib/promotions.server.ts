import { createClient } from "@/lib/supabase/server";
import { PROMOTION_COLUMNS, type Promotion } from "./promotions";

/**
 * Live offers, fetched server-side for the home band.
 *
 * Server rather than browser because the band is one section of a page that is
 * already dynamic, the table is world-readable so no session is needed, and —
 * the real reason — when there are no offers the band must not exist at all.
 * Returning `[]` here lets the server component render `null` and ship zero
 * client JS, instead of flashing an empty band that then collapses.
 */
export async function fetchLivePromotionsServer(
  limit = 6,
): Promise<Promotion[]> {
  try {
    const supabase = await createClient();
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from("promotions")
      .select(PROMOTION_COLUMNS)
      .eq("is_active", true)
      .or(`starts_at.is.null,starts_at.lte.${now}`)
      .or(`ends_at.is.null,ends_at.gt.${now}`)
      .order("sort_order", { ascending: true })
      .limit(limit);

    if (error) return [];
    return (data ?? []) as Promotion[];
  } catch {
    // Migration 018 may not be applied yet — render the page without the band
    // rather than a 500.
    return [];
  }
}
