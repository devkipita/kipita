"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ReportStatus, TripDetail } from "./console";

type Result = { ok: true } | { ok: false; error: string };

// Allowed range for each pricing setting. fee_on_top is 1 (fee added to the seat price) or 0 (deducted from the driver).
const SETTING_RANGES: Record<string, { min: number; max: number; integer?: boolean }> = {
  platform_fee_percent: { min: 0, max: 50 },
  fee_on_top: { min: 0, max: 1, integer: true },
  fee_min_kes: { min: 0, max: 1000 },
  hold_minutes: { min: 1, max: 240 },
  fare_margin_percent: { min: 0, max: 100 },
  fare_wear_per_km: { min: 0, max: 50 },
  fare_min_seat_price: { min: 0, max: 5000 },
  fare_round_step: { min: 1, max: 100, integer: true },
};

export async function fetchTripAction(tripId: string): Promise<TripDetail | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_trip", { p_trip_id: tripId });
  if (error) return null;
  return (data as TripDetail | null) ?? null;
}

export async function saveSettingsAction(values: Record<string, number>): Promise<Result> {
  const supabase = await createClient();
  for (const [key, value] of Object.entries(values)) {
    const range = SETTING_RANGES[key];
    if (!range || !Number.isFinite(value) || value < range.min || value > range.max || (range.integer && !Number.isInteger(value))) {
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

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Enter one EPRA period for a town. Overlapping a period already entered for that town is refused by the database. */
export async function addFuelPricesAction(input: {
  region: string;
  from: string;
  to: string;
  petrol: number | null;
  diesel: number | null;
  note?: string;
}): Promise<Result> {
  const region = input.region.trim().toLowerCase();
  if (!region) return { ok: false, error: "Pick a town" };
  if (!ISO_DATE.test(input.from) || !ISO_DATE.test(input.to)) return { ok: false, error: "Enter both dates" };
  if (input.to < input.from) return { ok: false, error: "The period must end on or after the day it starts" };
  for (const price of [input.petrol, input.diesel]) {
    if (price !== null && (!Number.isFinite(price) || price < 50 || price >= 1000)) {
      return { ok: false, error: "A fuel price must be between KES 50 and KES 1,000 per litre" };
    }
  }
  if (input.petrol === null && input.diesel === null) return { ok: false, error: "Enter at least one price" };

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_add_fuel_prices", {
    p_region: region,
    p_from: input.from,
    p_to: input.to,
    p_petrol: input.petrol,
    p_diesel: input.diesel,
    p_note: input.note?.trim() || null,
  });
  if (error) {
    // 23P01 is the database refusing two prices for the same town and fuel on the same day.
    if (error.code === "23P01") return { ok: false, error: "Those dates overlap a period you already entered for this town." };
    return { ok: false, error: error.message };
  }
  revalidatePath("/admin/pricing");
  return { ok: true };
}

export async function setVehicleClassAction(code: string, kmPerLitre: number, active = true): Promise<Result> {
  if (!Number.isFinite(kmPerLitre) || kmPerLitre <= 0 || kmPerLitre >= 60) {
    return { ok: false, error: "Km per litre must be between 0 and 60" };
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_vehicle_class", { p_code: code, p_km_per_litre: kmPerLitre, p_active: active });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/pricing");
  return { ok: true };
}
