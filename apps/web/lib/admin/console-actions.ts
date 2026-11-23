"use server";

import { revalidatePath } from "next/cache";
import type { KipitaRecord } from "@kipita/shared";
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
  fare_floor_percent: { min: 0, max: 100, integer: true },
  fare_round_step: { min: 1, max: 100, integer: true },
  cancel_free_hours: { min: 0, max: 168, integer: true },
  cancel_grace_minutes: { min: 0, max: 1440, integer: true },
  cancel_late_refund_percent: { min: 0, max: 100, integer: true },
  no_show_wait_minutes: { min: 0, max: 240, integer: true },
  no_show_dispute_hours: { min: 1, max: 168, integer: true },
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

/** Clear: the fare is paid to the driver as planned. Refund: the passenger gets it back in their wallet. Either way every open problem on the booking is closed together. */
export async function resolveProblemAction(problemId: string, outcome: "clear" | "refund", note: string): Promise<Result> {
  if (outcome !== "clear" && outcome !== "refund") return { ok: false, error: "Choose clear or refund" };
  const supabase = await createClient();
  const { error } = await supabase.rpc("resolve_booking_problem", {
    p_problem_id: problemId,
    p_outcome: outcome,
    p_note: note.trim() || null,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/problems");
  revalidatePath("/admin", "layout");
  return { ok: true };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The database words its own refusals for a person (22023). Anything else stays short and generic. */
function payoutError(error: { code?: string; message: string }): string {
  // The page refreshes itself after a refusal, so "Reload the page." becomes "The list is updated."
  if (error.code === "22023") return error.message.replace(/ Reload the page\.$/, " The list is updated.");
  if (error.code === "42501") return "Not allowed.";
  return "Could not save. Try again.";
}

/**
 * Record that a driver was paid from the M-Pesa portal. A request line passes its withdrawal id; an earnings line
 * passes only the person, and the amount leaves their wallet in the same step. The amount is what was on screen:
 * if the balance changed since, the database refuses and the page is reloaded.
 */
export async function markPayoutPaidAction(input: {
  userId: string;
  withdrawalId: string | null;
  amount: number;
  receipt: string;
}): Promise<Result> {
  const receipt = input.receipt.replace(/\s/g, "").toUpperCase();
  if (!/^[A-Z0-9]{8,14}$/.test(receipt)) return { ok: false, error: "Enter the M-Pesa receipt number." };
  if (!Number.isFinite(input.amount) || input.amount <= 0) return { ok: false, error: "Reload the page." };
  if (!UUID.test(input.userId) || (input.withdrawalId !== null && !UUID.test(input.withdrawalId))) {
    return { ok: false, error: "Reload the page." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_mark_payout_paid", {
    p_user_id: input.userId,
    p_withdrawal_id: input.withdrawalId,
    p_amount: input.amount,
    p_receipt: receipt,
  });
  if (error) return { ok: false, error: payoutError(error) };
  revalidatePath("/admin/payouts");
  revalidatePath("/admin", "layout");
  return { ok: true };
}

/** Put a withdrawal request back in the person's wallet. A reason is required and is kept in the audit log. */
export async function returnPayoutAction(withdrawalId: string, reason: string): Promise<Result> {
  if (!UUID.test(withdrawalId)) return { ok: false, error: "Reload the page." };
  if (!reason.trim()) return { ok: false, error: "Give a reason." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_return_payout", { p_withdrawal_id: withdrawalId, p_reason: reason.trim() });
  if (error) return { ok: false, error: payoutError(error) };
  revalidatePath("/admin/payouts");
  revalidatePath("/admin", "layout");
  return { ok: true };
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** What Kipita has on record for a period, to set beside an M-Pesa statement. Read only. */
export async function fetchReconcileDataAction(
  fromMs: number,
  toMs: number,
): Promise<{ ok: true; records: KipitaRecord[] } | { ok: false; error: string }> {
  if (!Number.isFinite(fromMs) || !Number.isFinite(toMs) || toMs < fromMs) return { ok: false, error: "Reload the page." };
  if (toMs - fromMs > 95 * DAY_MS) return { ok: false, error: "Use a statement of three months or less." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_reconcile_data", {
    p_from: new Date(fromMs).toISOString(),
    p_to: new Date(toMs).toISOString(),
  });
  if (error) return { ok: false, error: payoutError(error) };
  const records = (data as { records?: KipitaRecord[] } | null)?.records;
  return { ok: true, records: Array.isArray(records) ? records : [] };
}
