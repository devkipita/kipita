import "server-only";
import {
  DEFAULT_VEHICLE_CLASSES,
  fareConfigFromSettings,
  judgePrice,
  resolveFuelPrice,
  resolveTown,
  roadDistanceKm,
  seatPriceRange,
  classForCar,
  type FuelPriceRow,
  type FuelType,
  type VehicleClass,
} from "@kipita/shared";
import { createClient } from "@/lib/supabase/server";
import { fetchPlatform } from "@/lib/platform.server";
import type { PriceQuote, PriceUnavailableReason } from "./types";

type Supabase = Awaited<ReturnType<typeof createClient>>;

const DEFAULT_CLASS = "sedan";

async function loadClasses(supabase: Supabase): Promise<VehicleClass[]> {
  try {
    const { data, error } = await supabase
      .from("vehicle_classes")
      .select("code, label, km_per_litre, fuel_type")
      .eq("active", true)
      .order("sort_order", { ascending: true });
    if (!error && data && data.length > 0) {
      return data.map((r) => ({
        code: String(r.code),
        label: String(r.label),
        kmPerLitre: Number(r.km_per_litre),
        fuelType: r.fuel_type as FuelType,
      }));
    }
  } catch {
    // fall through to the built-in classes
  }
  return Object.values(DEFAULT_VEHICLE_CLASSES);
}

/**
 * Everything needed to price a trip between two towns for one class of car.
 * Never throws: when the prices cannot be worked out it says why, and the screen falls back to
 * letting the driver type a price.
 */
export async function loadPriceQuote(
  supabase: Supabase,
  args: { from: string; to: string; vehicleClass?: string; vehicleMake?: string; vehicleModel?: string },
): Promise<PriceQuote> {
  const fail = (reason: PriceUnavailableReason): PriceQuote => ({ available: false, reason });

  try {
    const distanceKm = roadDistanceKm(args.from, args.to);
    if (distanceKm === null) return fail("no_route");

    const classes = await loadClasses(supabase);
    if (classes.length === 0) return fail("error");
    // A car we recognise is priced as its own type, whatever type was asked for.
    const vehicle =
      classForCar(args.vehicleMake, args.vehicleModel, classes) ??
      classes.find((c) => c.code === args.vehicleClass) ??
      classes.find((c) => c.code === DEFAULT_CLASS) ??
      classes[0];

    // Fuel is priced by the town the trip leaves from; Nairobi is the fallback.
    const region = (resolveTown(args.from)?.name ?? args.from).trim().toLowerCase();
    const { data, error } = await supabase
      .from("fuel_prices")
      .select("fuel_type, region, price_kes, effective_from, effective_to")
      .eq("fuel_type", vehicle.fuelType)
      .in("region", Array.from(new Set([region, "nairobi"])));
    if (error) return fail("not_ready");

    const rows: FuelPriceRow[] = (data ?? []).map((r) => ({
      fuelType: r.fuel_type as FuelType,
      region: String(r.region),
      priceKes: Number(r.price_kes),
      effectiveFrom: String(r.effective_from),
      effectiveTo: String(r.effective_to),
    }));

    let fuel;
    try {
      fuel = resolveFuelPrice(rows, vehicle.fuelType, region);
    } catch {
      return fail("no_fuel_price");
    }

    const platform = await fetchPlatform();
    return {
      available: true,
      distanceKm,
      vehicleClass: vehicle.code,
      classes: classes.map((c) => ({ code: c.code, label: c.label })),
      vehicle,
      fuel,
      config: fareConfigFromSettings(platform.settings),
    };
  } catch {
    return fail("error");
  }
}

/**
 * The server side of the price range. The screen already keeps a driver inside it, but a request
 * can be made without the screen, so the range is checked again before a ride is saved.
 *
 * When a price cannot be worked out (unknown town, no fuel price yet) the trip is let through
 * rather than blocking a driver over something they cannot fix.
 */
export async function checkTripPrice(
  supabase: Supabase,
  args: {
    from: string;
    to: string;
    seats: number;
    priceKes: number;
    vehicleClass?: string;
    vehicleMake?: string;
    vehicleModel?: string;
    /** people riding with the driver who are not booking a seat */
    othersAboard?: number;
  },
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!Number.isInteger(args.priceKes) || args.priceKes <= 0) {
    return { ok: false, error: "Set the price in whole shillings." };
  }
  if (args.seats + (args.othersAboard ?? 0) > 8) {
    return { ok: false, error: "That is more people than the car can carry. Check the seats and who is travelling with you." };
  }

  const quote = await loadPriceQuote(supabase, args);
  if (!quote.available) return { ok: true };

  let range;
  try {
    range = seatPriceRange({
      distanceKm: quote.distanceKm,
      vehicle: quote.vehicle,
      fuel: quote.fuel,
      config: quote.config,
      seatsOffered: args.seats,
      othersAboard: args.othersAboard ?? 0,
    });
  } catch {
    return { ok: true };
  }

  const verdict = judgePrice(args.priceKes, range);
  if (verdict === "below_floor") {
    return {
      ok: false,
      error: `That price is too low for this trip. The lowest is KES ${range.floorKes.toLocaleString("en-KE")} a seat.`,
    };
  }
  if (verdict === "above_cap") {
    return {
      ok: false,
      error: `That price is too high for a shared ride. The most is KES ${range.capKes.toLocaleString("en-KE")} a seat.`,
    };
  }
  return { ok: true };
}
