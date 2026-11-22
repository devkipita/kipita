import { useEffect, useState } from "react";
import {
  DEFAULT_VEHICLE_CLASSES,
  carryLimitText,
  classForCar,
  classHolds,
  className,
  judgePrice,
  maxOthersFor,
  pickVehicleClass,
  seatPriceRange,
  type SeatPriceRange,
} from "@kipita/shared";
import { getPriceQuoteAction } from "@/lib/fare/actions";
import type { PriceQuote, PriceUnavailableReason } from "@/lib/fare/types";
import { formatKes } from "@/lib/rides";

export type AvailableQuote = Extract<PriceQuote, { available: true }>;

export type QuoteState =
  /** the route is not known yet */
  | { status: "idle" }
  /** `classes` is kept from the last answer so the car type chips stay put while a new one loads */
  | { status: "loading"; classes?: AvailableQuote["classes"]; vehicleClass?: string }
  | { status: "ready"; quote: AvailableQuote }
  /** the screen falls back to letting the driver type a price */
  | { status: "unavailable"; reason: PriceUnavailableReason };

/** The car types used until the live ones arrive, and when they cannot be loaded. */
const BUILT_IN_CLASSES = Object.values(DEFAULT_VEHICLE_CLASSES);

const TTL_MS = 5 * 60 * 1000;
const cache = new Map<string, { at: number; quote: AvailableQuote }>();

/**
 * The car type a trip is priced as: the one the driver picked, unless it cannot carry the seats offered.
 * Then the default, or the smallest type that can. People riding along never change it. `classes` is the
 * list from the last quote, or the built-in list before there is one.
 */
export function classFor(
  classes: ReadonlyArray<{ code: string; label: string }> | undefined,
  picked: string,
  seats: number,
): string {
  const list = classes && classes.length > 0 ? classes : BUILT_IN_CLASSES;
  return pickVehicleClass(list, { requested: picked, seats })?.code ?? "";
}

/**
 * How many people can ride with the driver without booking a seat: what the car type the trip is priced as
 * carries, less the seats offered. Works before a quote has loaded, from the built-in car types.
 */
export function othersRoom(state: QuoteState, picked: string, seats: number): number {
  const classes = state.status === "ready" ? state.quote.classes : state.status === "loading" ? state.classes : undefined;
  return maxOthersFor(classFor(classes, picked, seats), seats);
}

/**
 * The price quote for a route and car type. Seats are not part of the key: the range for any number
 * of seats is worked out in the browser from the quote, so changing seats is instant. The car type is
 * part of it, and it changes when the seats grow past what the picked type can carry.
 */
export function usePriceQuote(args: {
  from: string;
  to: string;
  vehicleClass: string;
  seats: number;
  enabled: boolean;
}): QuoteState {
  const from = args.from.trim();
  const to = args.to.trim();
  const [fetched, setFetched] = useState<{ key: string; quote: PriceQuote } | null>(null);
  const lastClasses = fetched?.quote.available ? fetched.quote.classes : undefined;
  const vehicleClass = classFor(lastClasses, args.vehicleClass, args.seats);
  const key = `${from.toLowerCase()}>${to.toLowerCase()}>${vehicleClass}`;
  const known = args.enabled && from.length >= 2 && to.length >= 2 && from.toLowerCase() !== to.toLowerCase();

  useEffect(() => {
    if (!known) return;
    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < TTL_MS) {
      setFetched({ key, quote: hit.quote });
      return;
    }
    let live = true;
    getPriceQuoteAction({ from, to, vehicleClass: vehicleClass || undefined, seats: args.seats })
      .then((quote) => {
        // Only a real quote is kept; a failure is tried again next time.
        if (quote.available) cache.set(key, { at: Date.now(), quote });
        if (live) setFetched({ key, quote });
      })
      .catch(() => {
        if (live) setFetched({ key, quote: { available: false, reason: "error" } });
      });
    return () => {
      live = false;
    };
    // `from`, `to` and the car type are in the key; the seats only decide that type.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, known]);

  if (!known) return { status: "idle" };
  if (!fetched || fetched.key !== key) {
    const last = fetched?.quote.available ? fetched.quote : null;
    return { status: "loading", classes: last?.classes, vehicleClass: last?.vehicleClass };
  }
  return fetched.quote.available
    ? { status: "ready", quote: fetched.quote }
    : { status: "unavailable", reason: fetched.quote.reason };
}

/**
 * The lowest, recommended and highest price for this many seats, or null if it cannot be worked out.
 * `others` is the number of people riding along who are not booking a seat; they share the cost.
 */
export function rangeFor(quote: AvailableQuote, seats: number, others = 0): SeatPriceRange | null {
  try {
    return seatPriceRange({
      distanceKm: quote.distanceKm,
      vehicle: quote.vehicle,
      fuel: quote.fuel,
      config: quote.config,
      seatsOffered: seats,
      othersAboard: others,
    });
  } catch {
    return null;
  }
}

/**
 * Why a price is outside the range, in words for the driver, or null if it is fine or the range
 * is not known. Only a price too low or too high is a problem; anything between is the driver's choice.
 */
export function priceBlockText(state: QuoteState, seats: number, fare: number, others = 0): string | null {
  if (state.status !== "ready" || !(fare > 0)) return null;
  const range = rangeFor(state.quote, seats, others);
  if (!range) return null;
  const verdict = judgePrice(fare, range);
  if (verdict === "below_floor") {
    return `That price is too low for this trip. The lowest is ${formatKes(range.floorKes)} a seat.`;
  }
  if (verdict === "above_cap") {
    return `That price is too high for a shared ride. The most is ${formatKes(range.capKes)} a seat.`;
  }
  return null;
}

/**
 * Why the car the driver named does not match the car type the trip was priced with, in words for the
 * driver, or null if they match, the model is not one we recognise, or the types are not known yet.
 */
export function carTypeBlockText(state: QuoteState, make: string, model: string): string | null {
  if (state.status !== "ready") return null;
  const { classes, vehicleClass } = state.quote;
  const listed = classForCar(make, model, classes);
  if (!listed || listed.code === vehicleClass) return null;
  const priced = classes.find((c) => c.code === vehicleClass);
  const carName = `${make} ${model}`.replace(/\s+/g, " ").trim();
  return `${carName} is listed as “${className(listed.label)}”, but the price was worked out for “${priced ? className(priced.label) : "another car type"}”. Go back to the price and pick “${className(listed.label)}”.`;
}

/**
 * Why the car the driver named cannot carry the seats offered and the people riding along, in words for the
 * driver, or null if it can or the model is not one we recognise. `kind` says what to change: the seats when
 * they alone are too many, otherwise the people riding along. This needs no quote: it uses the built-in car
 * types when there is none.
 */
export function carCapacityBlock(
  state: QuoteState,
  make: string,
  model: string,
  seats: number,
  others = 0,
): { kind: "seats" | "others"; text: string } | null {
  const classes = state.status === "ready" ? state.quote.classes : BUILT_IN_CLASSES;
  const listed = classForCar(make, model, classes);
  if (!listed || classHolds(listed.code, seats + others)) return null;
  return {
    kind: classHolds(listed.code, seats) ? "others" : "seats",
    text: carryLimitText(listed.label, listed.code, seats, others),
  };
}

/** Whether the Price step can be continued from. */
export function priceReady(state: QuoteState, seats: number, fare: number, others = 0): boolean {
  if (!(fare > 0)) return false;
  if (state.status === "unavailable") return true;
  return state.status === "ready" && priceBlockText(state, seats, fare, others) === null;
}
