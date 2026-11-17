import { supabase } from "@/lib/supabase";
import type { Booking } from "@/types";
import type { TranslationKey } from "@/lib/i18n/en";
import { MOCK_BOOKINGS } from "@/lib/mock/data";
import { releaseEscrow } from "./payments";

/**
 * Booking lifecycle, backed by the same database functions the web app calls:
 *
 *   request_seat      passenger asks for seats          -> requested
 *   accept_booking    driver accepts, seat held 30 min  -> pending_payment
 *   decline_booking   driver declines                   -> rejected
 *   (pay)             initiate-payment / confirm-payment -> confirmed
 *   start_trip        driver leaves                     -> in_progress
 *   complete_trip     driver arrives                    -> completed, fare released
 *   cancel_booking    either side, refunds a paid fare  -> cancelled
 *
 * The functions own the rules (seat counts, clashes, holds, refunds) and set the
 * price from the trip, so the app never writes bookings or prices itself.
 */

const CURRENT_STATES = ["requested", "pending_payment", "confirmed", "in_progress"] as const;
const PREVIOUS_STATES = ["completed", "cancelled", "rejected"] as const;

const BOOKING_SELECT = `
  *,
  trip:trips(*,
    driver:users!driver_id(id, full_name, avatar_url, is_verified, rating)
  ),
  passenger:users!passenger_id(id, full_name, avatar_url, is_verified, rating),
  driver:users!driver_id(id, full_name, avatar_url, is_verified, rating)
`;

/** Seeded demo bookings have ids like "b1"; real ones are database UUIDs. */
export function isRealBookingId(id: string | undefined | null): id is string {
  return !!id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

// ── Errors ───────────────────────────────────────────────────────────────────

type BookingOp = "request" | "answer" | "cancel" | "run";

/** A failed booking call, carrying the i18n key of a message that is safe to show. */
export class BookingError extends Error {
  readonly code: string | undefined;
  readonly messageKey: TranslationKey;

  constructor(code: string | undefined, messageKey: TranslationKey) {
    super(messageKey);
    this.name = "BookingError";
    this.code = code;
    this.messageKey = messageKey;
  }
}

/**
 * The database functions raise a handful of SQLSTATEs. 22023 means a different
 * thing in each ("no longer taking bookings", "request not open", "not at that
 * stage"), so the message depends on which call failed.
 */
export function bookingErrorKey(op: BookingOp, code: string | undefined): TranslationKey {
  switch (code) {
    case "28000":
      return "booking_err_signin";
    case "P0002":
      return "booking_err_gone";
    case "42501":
      return op === "request" ? "booking_err_own" : "booking_err_not_yours";
    case "53400":
      return "booking_err_seats";
    case "55006":
      return "booking_err_clash";
    case "22023":
      return op === "request"
        ? "booking_err_closed"
        : op === "run"
          ? "booking_err_stage"
          : "booking_err_not_open";
    default:
      return "booking_err_generic";
  }
}

function toBookingError(op: BookingOp, error: { code?: string } | null): BookingError {
  const code = error?.code;
  return new BookingError(code, bookingErrorKey(op, code));
}

/** Message key for anything thrown by this module (or any other error). */
export function errorMessageKey(error: unknown): TranslationKey {
  return error instanceof BookingError ? error.messageKey : "booking_err_generic";
}

// ── Reads ────────────────────────────────────────────────────────────────────

/**
 * The seeded demo bookings only stand in when the backend can't be reached in a
 * development build. An empty list is a real answer and is never replaced.
 */
function demoFallback(states: readonly string[]): Booking[] {
  return __DEV__ ? MOCK_BOOKINGS.filter((b) => states.includes(b.status)) : [];
}

export async function fetchBooking(bookingId: string): Promise<Booking | null> {
  const { data, error } = await supabase
    .from("bookings")
    .select(BOOKING_SELECT)
    .eq("id", bookingId)
    .maybeSingle();
  if (error || !data) return null;
  return data as Booking;
}

export async function fetchCurrentBookings(userId: string): Promise<Booking[]> {
  const { data, error } = await supabase
    .from("bookings")
    .select(BOOKING_SELECT)
    .or(`passenger_id.eq.${userId},driver_id.eq.${userId}`)
    .in("status", [...CURRENT_STATES])
    .order("created_at", { ascending: false });
  if (error) return demoFallback(CURRENT_STATES);
  return (data ?? []) as Booking[];
}

export async function fetchPreviousBookings(userId: string): Promise<Booking[]> {
  const { data, error } = await supabase
    .from("bookings")
    .select(BOOKING_SELECT)
    .or(`passenger_id.eq.${userId},driver_id.eq.${userId}`)
    .in("status", [...PREVIOUS_STATES])
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) return demoFallback(PREVIOUS_STATES);
  return (data ?? []) as Booking[];
}

/** Seat requests waiting for this driver to accept or decline. */
export async function fetchIncomingRequests(driverId: string): Promise<Booking[]> {
  const { data, error } = await supabase
    .from("bookings")
    .select(BOOKING_SELECT)
    .eq("driver_id", driverId)
    .eq("status", "requested")
    .order("created_at", { ascending: false });
  if (error) return demoFallback(["requested"]);
  return (data ?? []) as Booking[];
}

// ── Passenger ────────────────────────────────────────────────────────────────

async function bookingFrom(
  op: BookingOp,
  call: PromiseLike<{ data: unknown; error: { code?: string } | null }>,
): Promise<Booking> {
  const { data, error } = await call;
  if (error) throw toBookingError(op, error);
  const row = (Array.isArray(data) ? data[0] : data) as Booking | null | undefined;
  if (!row) throw new BookingError(undefined, "booking_err_generic");
  // The functions return the bare row; the screens want the trip and people too.
  return (await fetchBooking(row.id)) ?? row;
}

/**
 * Ask for seats on a ride. The driver is notified and nothing is charged until
 * they accept. Asking again for a ride you already have a live booking on
 * returns that booking instead of making a second one.
 */
export function requestSeat(tripId: string, seats = 1): Promise<Booking> {
  const count = Math.max(1, Math.min(8, Math.floor(seats) || 1));
  return bookingFrom(
    "request",
    supabase.rpc("request_seat", { p_trip_id: tripId, p_seats: count } as never).maybeSingle(),
  );
}

/**
 * Cancel a booking, as passenger or driver. A paid fare, fee included, goes back
 * to the passenger's wallet in the same step, and held seats are released.
 */
export function cancelBooking(bookingId: string, reason?: string): Promise<Booking> {
  return bookingFrom(
    "cancel",
    supabase
      .rpc("cancel_booking", { p_booking_id: bookingId, p_reason: reason?.trim() || null } as never)
      .maybeSingle(),
  );
}

// ── Driver ───────────────────────────────────────────────────────────────────

/** Accept a seat request. The seat is held for the passenger to pay. */
export function acceptBooking(bookingId: string): Promise<Booking> {
  return bookingFrom(
    "answer",
    supabase.rpc("accept_booking", { p_booking_id: bookingId } as never).maybeSingle(),
  );
}

export function declineBooking(bookingId: string, reason?: string): Promise<Booking> {
  return bookingFrom(
    "answer",
    supabase
      .rpc("decline_booking", { p_booking_id: bookingId, p_reason: reason?.trim() || null } as never)
      .maybeSingle(),
  );
}

/**
 * Leave. Paid bookings go in progress; requests and unpaid holds on this ride
 * are released. Returns how many bookings moved.
 */
export async function startTrip(tripId: string): Promise<number> {
  const { data, error } = await supabase.rpc("start_trip", { p_trip_id: tripId } as never);
  if (error) throw toBookingError("run", error);
  return Number(data ?? 0);
}

/**
 * Arrive. Completes the ride and every paid booking on it, then asks the
 * backend to release each fare to the driver. Releasing is idempotent and
 * best-effort here: a failure leaves the fare in escrow for the server to
 * settle rather than blocking the driver.
 */
export async function completeTrip(
  tripId: string,
  driverId?: string,
): Promise<{ moved: number; released: number }> {
  // Read the paid bookings first: complete_trip moves them out of these states.
  const { data: paid } = await supabase
    .from("bookings")
    .select("id")
    .eq("trip_id", tripId)
    .in("status", ["confirmed", "in_progress"]);
  const ids = ((paid ?? []) as { id: string }[]).map((row) => row.id);

  const { data, error } = await supabase.rpc("complete_trip", { p_trip_id: tripId } as never);
  if (error) throw toBookingError("run", error);

  const results = await Promise.all(
    ids.map((id) => releaseEscrow(id, driverId).catch(() => ({ released: false }))),
  );
  return {
    moved: Number(data ?? 0),
    released: results.filter((r) => r.released).length,
  };
}
