"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ReportStatus, TripDetail } from "./console";

type Result = { ok: true } | { ok: false; error: string };

const EDITABLE_SETTINGS = new Set(["platform_fee_percent", "hold_minutes", "fuel_cost_per_km", "fare_margin_percent"]);

export async function fetchTripAction(tripId: string): Promise<TripDetail | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_trip", { p_trip_id: tripId });
  if (error) return null;
  return (data as TripDetail | null) ?? null;
}

export async function saveSettingsAction(values: Record<string, number>): Promise<Result> {
  const supabase = await createClient();
  for (const [key, value] of Object.entries(values)) {
    if (!EDITABLE_SETTINGS.has(key) || !Number.isFinite(value) || value < 0) {
      return { ok: false, error: `Invalid value for ${key}` };
    }
    const { error } = await supabase.rpc("set_setting", { p_key: key, p_value: value });
    if (error) return { ok: false, error: error.message };
  }
  revalidatePath("/admin/pricing");
  return { ok: true };
}

export async function setUserStatusAction(userId: string, status: "active" | "suspended"): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_user_status", { p_user_id: userId, p_status: status });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/users");
  return { ok: true };
}

export async function setReportStatusAction(reportId: string, status: ReportStatus): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_report_status", { p_report_id: reportId, p_status: status });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/disputes");
  revalidatePath("/admin", "layout");
  return { ok: true };
}
