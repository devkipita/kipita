import "server-only";
import {
  DEFAULT_VEHICLE_CLASSES,
  carSeatsText,
  carryLimitText,
  classHolds,
  fareConfigFromSettings,
  isCarSeats,
  judgePrice,
  pickVehicleClass,
  resolveFuelPrice,
  resolveTown,
  roadDistanceKm,
  seatPriceRange,
  type FuelPriceRow,
  type FuelType,
  type VehicleClass,
} from "@kipita/shared";
import { createClient } from "@/lib/supabase/server";
import { fetchPlatform } from "@/lib/platform.server";
import type { PriceQuote, PriceUnavailableReason } from "./types";

type Supabase = Awaited<ReturnType<typeof createClient>>;

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
 *
 * The class is the one `pickVehicleClass` gives: never a type too small for the seats offered. People
 * riding along do not move it; `checkTripPrice` refuses a trip they would overfill.
 * `classes` can be passed in by a caller that has already loaded them.
 */
export async function loadPriceQuote(
  supabase: Supabase,
  args: {
    from: string;
    to: string;
    vehicleClass?: string;
    vehicleMake?: string;
    vehicleModel?: string;
    /** seats offered, used to keep the class big enough */
    seats?: number;
  },
  loaded?: VehicleClass[],
): Promise<PriceQuote> {
  const fail = (reason: PriceUnavailableReason): PriceQuote => ({ available: false, reason });

  try {
    const distanceKm = roadDistanceKm(args.from, args.to);
    if (distanceKm === null) return fail("no_route");

    const classes = loaded ?? (await loadClasses(supabase));
    const vehicle = pickVehicleClass(classes, {
      requested: args.vehicleClass,
      make: args.vehicleMake,
      model: args.vehicleModel,
      seats: args.seats,
    });
    if (!vehicle) return fail("error");

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
    /** seats in the car with the driver's seat in them, when the driver has said; it can only tighten the type's limit */
    carSeats?: number | null;
  },
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!Number.isInteger(args.priceKes) || args.priceKes <= 0) {
    return { ok: false, error: "Set the price in whole shillings." };
  }
  const people = args.seats + (args.othersAboard ?? 0);
  if (people > 8) {
    return { ok: false, error: "That is more people than the car can carry. Check the seats and who is travelling with you." };
  }

  // The car type is picked from the seats alone and must carry everyone, people riding along included.
  // This holds even when no price can be worked out, so a car that is too small is never let through
  // just because the fuel price is missing.
  const classes = await loadClasses(supabase);
  const vehicle = pickVehicleClass(classes, {
    requested: args.vehicleClass,
    make: args.vehicleMake,
    model: args.vehicleModel,
    seats: args.seats,
  });
  if (vehicle && !classHolds(vehicle.code, people)) {
    return { ok: false, error: carryLimitText(vehicle.label, vehicle.code, args.seats, args.othersAboard ?? 0) };
  }
  // The car itself may carry fewer than its type does.
  if (isCarSeats(args.carSeats) && people > args.carSeats - 1) {
    return { ok: false, error: carSeatsText(args.carSeats, args.seats, args.othersAboard ?? 0) };
  }

  const quote = await loadPriceQuote(supabase, args, classes);
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
