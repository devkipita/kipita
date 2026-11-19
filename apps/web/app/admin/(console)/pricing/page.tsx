import { createClient } from "@/lib/supabase/server";
import { loadAudit } from "@/lib/admin/console.server";
import { SETTING_FALLBACKS } from "@/lib/platform";
import { nairobiDate } from "@kipita/shared";
import {
  PricingView,
  type FuelPriceRecord,
  type PricingSettings,
  type VehicleClassRecord,
} from "@/components/admin/console/PricingView";

export const metadata = {
  title: "Pricing",
  robots: { index: false, follow: false },
};

const PRICING_ACTIONS = new Set(["setting.update", "fuel.add", "vehicle_class.update"]);
const PRICING_KEYS = new Set(Object.keys(SETTING_FALLBACKS));

export default async function AdminPricingPage() {
  const supabase = await createClient();
  const [{ data: rows }, fuel, classes, log] = await Promise.all([
    supabase.from("platform_settings").select("key, value"),
    supabase
      .from("fuel_prices")
      .select("id, fuel_type, region, price_kes, effective_from, effective_to, note")
      .order("effective_from", { ascending: false })
      .limit(120),
    supabase
      .from("vehicle_classes")
      .select("code, label, km_per_litre, fuel_type, active, sort_order")
      .order("sort_order", { ascending: true }),
    loadAudit(undefined, 40),
  ]);

  const settings: PricingSettings = {
    platform_fee_percent: SETTING_FALLBACKS.platform_fee_percent,
    fee_on_top: SETTING_FALLBACKS.fee_on_top,
    fee_min_kes: SETTING_FALLBACKS.fee_min_kes,
    fee_vat_percent: SETTING_FALLBACKS.fee_vat_percent,
    hold_minutes: SETTING_FALLBACKS.hold_minutes,
    fare_margin_percent: SETTING_FALLBACKS.fare_margin_percent,
    fare_wear_per_km: SETTING_FALLBACKS.fare_wear_per_km,
    fare_min_seat_price: SETTING_FALLBACKS.fare_min_seat_price,
    fare_floor_percent: SETTING_FALLBACKS.fare_floor_percent,
    fare_round_step: SETTING_FALLBACKS.fare_round_step,
  };
  for (const row of rows ?? []) {
    const value = Number(row.value);
    if (row.key in settings && Number.isFinite(value)) settings[row.key as keyof PricingSettings] = value;
  }

  const pricingLog = (log.data ?? [])
    .filter((r) => PRICING_ACTIONS.has(r.action) && (r.action !== "setting.update" || PRICING_KEYS.has(r.subject_id ?? "")))
    .slice(0, 10);

  const fuelRows: FuelPriceRecord[] = (fuel.data ?? []).map((r) => ({
    id: r.id as string,
    fuel_type: r.fuel_type as "petrol" | "diesel",
    region: r.region as string,
    price_kes: Number(r.price_kes),
    effective_from: r.effective_from as string,
    effective_to: r.effective_to as string,
    note: (r.note as string | null) ?? null,
  }));

  const classRows: VehicleClassRecord[] = (classes.data ?? []).map((r) => ({
    code: r.code as string,
    label: r.label as string,
    km_per_litre: Number(r.km_per_litre),
    fuel_type: r.fuel_type as "petrol" | "diesel",
    active: r.active === true,
    sort_order: Number(r.sort_order),
  }));

  return (
    <PricingView
      settings={settings}
      fuel={fuelRows}
      classes={classRows}
      today={nairobiDate(new Date())}
      loadError={fuel.error?.message ?? classes.error?.message ?? null}
      log={pricingLog}
      logError={log.error}
    />
  );
}
