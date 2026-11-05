import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Capacity } from "./types";

const CAPACITY_SELECT = `
  id, from_location, to_location, depart_date, depart_time,
  vehicle_type, max_load, capacity_note, price_from, quote_only,
  driver:users!driver_id ( id, full_name, avatar_url, is_verified, rating )
`;

function one<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export async function fetchOpenCapacity(limit = 12): Promise<Capacity[]> {
  try {
    const supabase = await createClient();
    const today = new Date().toISOString().slice(0, 10);
    const { data, error } = await supabase
      .from("send_capacity")
      .select(CAPACITY_SELECT)
      .eq("status", "open")
      .gte("depart_date", today)
      .order("depart_date", { ascending: true })
      .limit(limit);

    if (error || !data) return [];

    return data.map((row) => {
      const r = row as Record<string, unknown>;
      return {
        id: r.id as string,
        from_location: (r.from_location as string) ?? "",
        to_location: (r.to_location as string) ?? "",
        depart_date: (r.depart_date as string) ?? "",
        depart_time: (r.depart_time as string | null) ?? null,
        vehicle_type: r.vehicle_type as Capacity["vehicle_type"],
        max_load: r.max_load as Capacity["max_load"],
        capacity_note: (r.capacity_note as string | null) ?? null,
        price_from: r.price_from === null ? null : Number(r.price_from),
        quote_only: r.quote_only === true,
        driver: one(r.driver as Capacity["driver"] | Capacity["driver"][]),
      } satisfies Capacity;
    });
  } catch {
    return [];
  }
}

export async function fetchProhibitedItems(): Promise<string[]> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("send_prohibited_items")
      .select("label")
      .order("sort_order", { ascending: true });
    return (data ?? []).map((r) => r.label as string);
  } catch {
    return [];
  }
}
